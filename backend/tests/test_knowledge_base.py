import os
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from database import get_db, init_db
from services.knowledge_base import retrieve_chunks, split_document
from services.tutor import generate_tutor_reply
from tasks import index_knowledge_document_task


class KnowledgeBaseTest(unittest.TestCase):
    def test_split_document_keeps_content_and_limits_chunk_size(self):
        text = "\n\n".join(["第一节 函数", "函数是两个集合之间的对应关系。" * 80, "例题与解析"])
        chunks = split_document(text, max_chars=300, overlap_chars=30)
        self.assertGreater(len(chunks), 2)
        self.assertTrue(all(len(chunk) <= 300 for chunk in chunks))
        self.assertIn("第一节 函数", chunks[0])

    def test_split_document_prefers_chinese_sentence_boundaries(self):
        text = "第一章 函数\n" + "函数表示两个集合之间的对应关系。" * 20
        chunks = split_document(text, max_chars=90, overlap_chars=10)

        self.assertGreater(len(chunks), 1)
        self.assertTrue(all(len(chunk) <= 90 for chunk in chunks))
        self.assertEqual(chunks[0], "第一章 函数")
        self.assertTrue(all(chunk.endswith("。") for chunk in chunks[1:]))

    def test_split_document_rejects_invalid_overlap(self):
        with self.assertRaises(ValueError):
            split_document("有效的教材内容。" * 10, max_chars=100, overlap_chars=100)

    def test_split_document_keeps_short_heading_and_content(self):
        chunks = split_document("第一节\n\n勾股定理。", max_chars=100, overlap_chars=10)

        self.assertEqual("\n\n".join(chunks), "第一节\n\n勾股定理。")

    @patch("services.knowledge_base.encode_interest", return_value=None)
    def test_keyword_retrieval_ranks_related_material_first(self, _):
        rows = [
            {
                "id": 1,
                "document_id": 1,
                "title": "函数",
                "content": "函数单调性描述函数值随自变量增加的变化趋势",
                "embedding": None,
                "embedding_model": "",
            },
            {
                "id": 2,
                "document_id": 2,
                "title": "古诗",
                "content": "诗歌鉴赏需要结合意象和情感",
                "embedding": None,
                "embedding_model": "",
            },
        ]
        result = retrieve_chunks("函数单调性", rows)
        self.assertEqual(result[0]["document_id"], 1)

    @patch("services.tutor._model_config", return_value={"api_key": "", "base_url": "", "model": ""})
    def test_tutor_has_grounded_local_fallback(self, _):
        chunks = [
            {
                "document_id": 1,
                "title": "函数教材",
                "source": "第一章",
                "heading": "单调性",
                "content": "函数在指定区间内可以是递增的。",
            }
        ]
        answer, citations, source = generate_tutor_reply(
            {"name": "林晓雨"}, "math", "什么是单调性？", chunks, [], []
        )
        self.assertIn("[1]", answer)
        self.assertEqual(citations[0]["title"], "函数教材")
        self.assertEqual(source, "local-rag")

    def test_celery_task_indexes_a_text_document(self):
        with tempfile.TemporaryDirectory(prefix="knowledge-index-") as directory:
            root = Path(directory)
            uploads = root / "uploads"
            uploads.mkdir()
            (uploads / "lesson.txt").write_text(
                "第一节 函数\n\n函数单调性描述函数值随自变量变化的规律。",
                encoding="utf-8",
            )
            with patch.dict(
                os.environ,
                {
                    "DATABASE_PATH": str(root / "test.db"),
                    "UPLOAD_FOLDER": str(uploads),
                },
            ):
                init_db()
                with get_db() as db:
                    cursor = db.execute(
                        """INSERT INTO knowledge_documents(
                           title,subject,original_name,stored_name,mime_type,size,job_id
                           ) VALUES('函数','math','lesson.txt','lesson.txt','text/plain',100,'job-1')"""
                    )
                    document_id = cursor.lastrowid
                with patch("services.knowledge_base.encode_texts", return_value=None):
                    result = index_knowledge_document_task.run(document_id, "job-1")
                self.assertEqual(result["status"], "ready")
                with get_db() as db:
                    document = db.execute(
                        "SELECT * FROM knowledge_documents WHERE id=?", (document_id,)
                    ).fetchone()
                    chunks = db.execute(
                        "SELECT COUNT(*) FROM knowledge_chunks WHERE document_id=?",
                        (document_id,),
                    ).fetchone()[0]
                self.assertEqual(document["status"], "ready")
                self.assertEqual(document["chunk_count"], chunks)
                self.assertGreater(chunks, 0)


if __name__ == "__main__":
    unittest.main()
