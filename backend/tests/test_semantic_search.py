import os
import unittest
from unittest.mock import patch

from services.semantic_search import embedding_device, search_students


class Vector(list):
    def tolist(self):
        return list(self)


class FakeModel:
    def __init__(self):
        self.calls = []

    def encode(self, value, normalize_embeddings=True):
        self.calls.append(value)
        if isinstance(value, str):
            return Vector([1.0, 0.0])
        return [Vector([0.8, 0.2]) for _ in value]


class SemanticSearchTest(unittest.TestCase):
    def test_embedding_device_defaults_to_cpu_and_can_be_configured(self):
        with patch.dict(os.environ, {}, clear=True):
            self.assertEqual(embedding_device(), "cpu")
        with patch.dict(os.environ, {"EMBEDDING_DEVICE": "cuda:0"}):
            self.assertEqual(embedding_device(), "cuda:0")

    @patch("services.semantic_search._load_model", return_value=None)
    def test_related_sports_terms_rank_first(self, _):
        students = [
            {"name": "甲", "tags": '["篮球"]', "tags_text": "篮球", "description": "校队后卫"},
            {"name": "乙", "tags": '["绘画"]', "tags_text": "绘画", "description": "喜欢油画"},
        ]
        result, engine, updates = search_students("找擅长体育运动的学生", students)
        self.assertEqual(result[0]["name"], "甲")
        self.assertEqual(result[0]["match_reason_code"], "tagMatch")
        self.assertEqual(result[0]["match_reason_tags"], ["篮球"])
        self.assertEqual(engine, "local-keyword-fallback")
        self.assertEqual(updates, [])

    @patch("services.semantic_search.embedding_model_name", return_value="test-model")
    def test_stored_student_vectors_are_reused(self, _):
        model = FakeModel()
        students = [
            {
                "id": 1,
                "name": "甲",
                "tags": '["篮球"]',
                "tags_text": "篮球",
                "description": "校队后卫",
                "embedding": "[0.9, 0.1]",
                "embedding_model": "test-model",
            }
        ]
        with patch("services.semantic_search._load_model", return_value=model):
            result, engine, updates = search_students("篮球活动", students)
        self.assertEqual(model.calls, ["篮球活动"])
        self.assertEqual(engine, "sentence-transformers")
        self.assertEqual(updates, [])
        self.assertNotIn("embedding", result[0])

    @patch("services.semantic_search.embedding_model_name", return_value="test-model")
    def test_missing_vectors_are_returned_for_database_backfill(self, _):
        model = FakeModel()
        students = [
            {
                "id": 1,
                "name": "甲",
                "tags": '["篮球"]',
                "tags_text": "篮球",
                "description": "校队后卫",
                "embedding": "",
                "embedding_model": "",
            }
        ]
        with patch("services.semantic_search._load_model", return_value=model):
            _, _, updates = search_students("篮球活动", students)
        self.assertEqual(model.calls, ["篮球活动", ["篮球 校队后卫"]])
        self.assertEqual(updates, [("[0.8, 0.2]", "test-model", 1)])


if __name__ == "__main__":
    unittest.main()
