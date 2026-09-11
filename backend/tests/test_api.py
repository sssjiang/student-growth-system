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
        self.assertIn("prediction", report.get_json()["metrics"]["overall"])

    def test_student_cannot_use_teacher_search(self):
        headers = self.login("student1", "student123")
        response = self.client.post(
            "/api/teacher/search", json={"query": "篮球活动"}, headers=headers
        )
        self.assertEqual(response.status_code, 403)

    def test_credential_upload_review_undo_resubmit_and_delete(self):
        student_headers = self.login("student1", "student123")
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

        other_student_headers = self.login("student2", "student123")
        denied = self.client.delete(
            f"/api/student/files/{credential['id']}", headers=other_student_headers
        )
        self.assertEqual(denied.status_code, 404)

        teacher_headers = self.login("teacher", "teacher123")
        analysis_result = {
            "extracted_text": "校园摄影大赛一等奖 学校艺术中心",
            "extraction_method": "pdf-text",
            "extraction_confidence": 1.0,
            "extracted_fields": {
                "award_title": {"value": credential["title"], "evidence": credential["title"]}
            },
            "comparisons": [
                {
                    "field": "award_title",
                    "submitted": credential["title"],
                    "extracted": credential["title"],
                    "evidence": credential["title"],
                    "status": "match",
                    "confidence": 1.0,
                }
            ],
            "overall_status": "consistent",
            "overall_confidence": 1.0,
            "generated_by": "local-rules",
            "error_message": "",
        }
        with patch("app.analyze_credential", return_value=analysis_result):
            analyzed = self.client.post(
                f"/api/teacher/credentials/{credential['id']}/analysis",
                headers=teacher_headers,
            )
        self.assertEqual(analyzed.status_code, 200)
        self.assertEqual(
            analyzed.get_json()["analysis"]["overall_status"], "consistent"
        )
        cached_analysis = self.client.get(
            f"/api/teacher/credentials/{credential['id']}/analysis",
            headers=teacher_headers,
        )
        self.assertEqual(cached_analysis.status_code, 200)
        self.assertEqual(
            cached_analysis.get_json()["analysis"]["comparisons"][0]["status"],
            "match",
        )

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
