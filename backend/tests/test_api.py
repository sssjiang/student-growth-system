import io
import os
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch


_temp_dir = tempfile.mkdtemp(prefix="student-growth-test-")
os.environ["DATABASE_PATH"] = os.path.join(_temp_dir, "test.db")
os.environ["UPLOAD_FOLDER"] = os.path.join(_temp_dir, "uploads")
os.environ["SECRET_KEY"] = "integration-test-key"
os.environ["AI_REPORT_ENABLED"] = "false"
os.environ["EMBEDDING_LOCAL_ONLY"] = "true"
os.environ["HF_HUB_OFFLINE"] = "1"

from app import app, upload_folder_path  # noqa: E402
from seed import seed  # noqa: E402


class ApiFlowTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        seed()
        app.config.update(TESTING=True)
        cls.client = app.test_client()

    def login(self, username, password):
        response = self.client.post(
            "/api/auth/login", json={"username": username, "password": password}
        )
        self.assertEqual(response.status_code, 200)
        return {"Authorization": "Bearer " + response.get_json()["token"]}

    def test_relative_upload_folder_is_resolved_from_project_root(self):
        with patch.dict(os.environ, {"UPLOAD_FOLDER": "backend/uploads"}):
            expected = Path(__file__).resolve().parents[2] / "backend" / "uploads"
            self.assertEqual(upload_folder_path(), expected)

    def test_admin_can_access_management_apis_and_create_teacher(self):
        headers = self.login("admin", "admin123")
        dashboard = self.client.get("/api/admin/dashboard", headers=headers)
        self.assertEqual(dashboard.status_code, 200)
        self.assertIn("students", dashboard.get_json()["stats"])

        users = self.client.get("/api/admin/users", headers=headers)
        self.assertEqual(users.status_code, 200)
        self.assertTrue(any(item["role"] == "admin" for item in users.get_json()["users"]))

        created = self.client.post(
            "/api/admin/users",
            json={
                "username": "teacher2",
                "password": "teacher234",
                "display_name": "李老师",
                "role": "teacher",
            },
            headers=headers,
        )
        self.assertEqual(created.status_code, 201)
        self.assertEqual(created.get_json()["user"]["role"], "teacher")
        self.login("teacher2", "teacher234")

        student_headers = self.login("student1", "student123")
        denied = self.client.get("/api/admin/dashboard", headers=student_headers)
        self.assertEqual(denied.status_code, 403)

    def test_teacher_can_search_and_generate_report(self):
        headers = self.login("teacher", "teacher123")
        result = self.client.post(
            "/api/teacher/search",
            json={"query": "寻找喜欢篮球和团队运动的学生"},
            headers=headers,
        )
        self.assertEqual(result.status_code, 200)
        self.assertEqual(result.get_json()["students"][0]["name"], "陈子昂")

        report = self.client.post(
            "/api/teacher/students/1/report", headers=headers
        )
        self.assertEqual(report.status_code, 201)
        payload = report.get_json()
        self.assertIn("prediction", payload["metrics"]["overall"])
        self.assertEqual(payload["report"]["version"], 2)
        self.assertEqual(
            {item["subject"] for item in payload["report"]["subject_insights"]},
            {"chinese", "math", "english", "politics"},
        )
        self.assertGreaterEqual(len(payload["report"]["action_plan"]), 2)

    def test_student_cannot_use_teacher_search(self):
        headers = self.login("student1", "student123")
        response = self.client.post(
            "/api/teacher/search", json={"query": "篮球活动"}, headers=headers
        )
        self.assertEqual(response.status_code, 403)

    def test_teacher_manages_knowledge_and_student_uses_tutor(self):
        teacher_headers = self.login("teacher", "teacher123")
        with patch("routes.knowledge.enqueue_knowledge_index", return_value="knowledge-job") as enqueue:
            uploaded = self.client.post(
                "/api/teacher/knowledge",
                data={
                    "title": "函数基础",
                    "subject": "math",
                    "grade_level": "高二",
                    "source": "校本教材第一章",
                    "file": (io.BytesIO("函数单调性是函数的重要性质。".encode()), "math.txt"),
                },
                headers=teacher_headers,
                content_type="multipart/form-data",
            )
        self.assertEqual(uploaded.status_code, 201)
        document = uploaded.get_json()["document"]
        enqueue.assert_called_once_with(document["id"])

        listed = self.client.get("/api/teacher/knowledge", headers=teacher_headers)
        self.assertEqual(listed.status_code, 200)
        self.assertTrue(any(item["id"] == document["id"] for item in listed.get_json()["documents"]))

        student_headers = self.login("student1", "student123")
        chunks = [
            {
                "document_id": document["id"],
                "title": document["title"],
                "source": document["source"],
                "heading": "函数单调性",
                "content": "函数在区间上递增或递减。",
            }
        ]
        with patch("routes.tutor.retrieve_chunks", return_value=chunks), patch(
            "routes.tutor.generate_tutor_reply",
            return_value=("先观察自变量和函数值的变化。[1]", [{"index": 1, "title": "函数基础"}], "test-rag"),
        ):
            chat = self.client.post(
                "/api/student/tutor/chat",
                json={"subject": "math", "message": "什么是函数单调性？"},
                headers=student_headers,
            )
        self.assertEqual(chat.status_code, 200)
        conversation_id = chat.get_json()["conversation_id"]
        history = self.client.get(
            f"/api/student/tutor/conversations/{conversation_id}",
            headers=student_headers,
        )
        self.assertEqual(history.status_code, 200)
        self.assertEqual(len(history.get_json()["messages"]), 2)

        admin_headers = self.login("admin", "admin123")
        traces = self.client.get("/api/admin/rag-traces", headers=admin_headers)
        self.assertEqual(traces.status_code, 200)
        trace = traces.get_json()["traces"][0]
        self.assertEqual(trace["question"], "什么是函数单调性？")
        self.assertEqual(trace["selected_count"], 1)
        trace_detail = self.client.get(
            f"/api/admin/rag-traces/{trace['id']}", headers=admin_headers
        )
        self.assertEqual(trace_detail.status_code, 200)
        self.assertEqual(len(trace_detail.get_json()["chunks"]), 1)

        deleted = self.client.delete(
            f"/api/teacher/knowledge/{document['id']}", headers=teacher_headers
        )
        self.assertEqual(deleted.status_code, 200)

    def test_credential_upload_review_undo_resubmit_and_delete(self):
        student_headers = self.login("student1", "student123")
        with patch("routes.student_files.enqueue_credential_analysis", return_value="upload-job") as enqueue:
            uploaded = self.client.post(
                "/api/student/files",
                data={
                    "title": "校园摄影大赛一等奖",
                    "credential_type": "艺术活动",
                    "issuer": "学校艺术中心",
                    "awarded_at": "2026-05-20",
                    "description": "校庆主题摄影作品",
                    "file": (io.BytesIO(b"fake image content"), "certificate.png"),
                },
                headers=student_headers,
                content_type="multipart/form-data",
            )
        self.assertEqual(uploaded.status_code, 201)
        credential = uploaded.get_json()["files"][0]
        self.assertEqual(credential["status"], "pending")
        enqueue.assert_called_once_with(credential["id"], 1)

        other_student_headers = self.login("student2", "student123")
        denied = self.client.delete(
            f"/api/student/files/{credential['id']}", headers=other_student_headers
        )
        self.assertEqual(denied.status_code, 404)

        teacher_headers = self.login("teacher", "teacher123")
        with patch(
            "routes.credentials.enqueue_credential_analysis", return_value="manual-job"
        ) as enqueue:
            analyzed = self.client.post(
                f"/api/teacher/credentials/{credential['id']}/analysis",
                headers=teacher_headers,
            )
        self.assertEqual(analyzed.status_code, 202)
        self.assertEqual(
            analyzed.get_json()["analysis"]["analysis_status"], "pending"
        )
        enqueue.assert_called_once_with(credential["id"], 1)
        cached_analysis = self.client.get(
            f"/api/teacher/credentials/{credential['id']}/analysis",
            headers=teacher_headers,
        )
        self.assertEqual(cached_analysis.status_code, 200)
        self.assertEqual(cached_analysis.get_json()["analysis"]["analysis_status"], "pending")

        rejected = self.client.put(
            f"/api/teacher/credentials/{credential['id']}/review",
            json={"status": "rejected", "comment": "请补充清晰的获奖日期"},
            headers=teacher_headers,
        )
        self.assertEqual(rejected.status_code, 200)

        undo_rejected = self.client.put(
            f"/api/teacher/credentials/{credential['id']}/review",
            json={"status": "pending"},
            headers=teacher_headers,
        )
        self.assertEqual(undo_rejected.status_code, 200)
        pending_file = next(
            item
            for item in self.client.get(
                "/api/student/files", headers=student_headers
            ).get_json()["files"]
            if item["id"] == credential["id"]
        )
        self.assertEqual(pending_file["status"], "pending")
        self.assertEqual(pending_file["review_comment"], "")
        self.assertIsNone(pending_file["reviewer_name"])

        rejected = self.client.put(
            f"/api/teacher/credentials/{credential['id']}/review",
            json={"status": "rejected", "comment": "请补充清晰的获奖日期"},
            headers=teacher_headers,
        )
        self.assertEqual(rejected.status_code, 200)

        with patch(
            "routes.student_files.enqueue_credential_analysis", return_value="resubmit-job"
        ) as enqueue:
            resubmitted = self.client.post(
                f"/api/student/files/{credential['id']}/resubmit",
                data={
                    "title": credential["title"],
                    "credential_type": credential["credential_type"],
                    "issuer": credential["issuer"],
                    "awarded_at": "2026-05-21",
                    "description": credential["description"],
                },
                headers=student_headers,
            )
        self.assertEqual(resubmitted.status_code, 200)
        self.assertEqual(resubmitted.get_json()["files"][0]["status"], "pending")
        self.assertEqual(
            resubmitted.get_json()["files"][0]["ai_analysis_status"], "pending"
        )
        self.assertEqual(resubmitted.get_json()["files"][0]["revision"], 2)
        enqueue.assert_called_once_with(credential["id"], 2)

        approved = self.client.put(
            f"/api/teacher/credentials/{credential['id']}/review",
            json={"status": "approved", "comment": "材料清晰"},
            headers=teacher_headers,
        )
        self.assertEqual(approved.status_code, 200)
        undo_approved = self.client.put(
            f"/api/teacher/credentials/{credential['id']}/review",
            json={"status": "pending"},
            headers=teacher_headers,
        )
        self.assertEqual(undo_approved.status_code, 200)
        pending_file = next(
            item
            for item in self.client.get(
                "/api/student/files", headers=student_headers
            ).get_json()["files"]
            if item["id"] == credential["id"]
        )
        self.assertEqual(pending_file["status"], "pending")
        self.assertEqual(pending_file["review_comment"], "")
        self.assertIsNone(pending_file["reviewer_name"])

        preview = self.client.get(
            f"/api/files/{credential['id']}?preview=1", headers=student_headers
        )
        self.assertEqual(preview.status_code, 200)
        self.assertIn("inline", preview.headers["Content-Disposition"])
        preview.close()

        deleted = self.client.delete(
            f"/api/student/files/{credential['id']}", headers=student_headers
        )
        self.assertEqual(deleted.status_code, 200)


if __name__ == "__main__":
    unittest.main()
