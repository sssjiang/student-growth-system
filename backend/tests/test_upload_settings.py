import io
import os
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import jwt

from database import get_db, init_db
from services.upload_settings import MB


class UploadSettingsTest(unittest.TestCase):
    def setUp(self):
        temporary = tempfile.TemporaryDirectory(prefix="upload-settings-test-")
        self.addCleanup(temporary.cleanup)
        self.root = Path(temporary.name)
        env = patch.dict(os.environ, {
            "DATABASE_PATH": str(self.root / "test.db"),
            "UPLOAD_FOLDER": str(self.root / "uploads"),
            "ADMIN_USERNAME": "upload-admin",
        })
        env.start()
        self.addCleanup(env.stop)
        from app import create_app
        self.create_app = create_app
        self.app = create_app({"TESTING": True, "SECRET_KEY": "upload-test-key"})
        self.client = self.app.test_client()
        with get_db() as db:
            for role in ("student", "teacher"):
                cursor = db.execute(
                    "INSERT INTO users(username,password_hash,role,display_name) VALUES(?,?,?,?)",
                    (role, "unused", role, role),
                )
                if role == "student":
                    db.execute(
                        "INSERT INTO students(user_id,student_no,name) VALUES(?,?,?)",
                        (cursor.lastrowid, "S001", "Student"),
                    )
        self.headers = {
            role: {"Authorization": "Bearer " + jwt.encode(
                {"sub": str(user_id), "role": role}, "upload-test-key", algorithm="HS256"
            )}
            for role, user_id in (("admin", 1), ("student", 1), ("teacher", 2))
        }

    def save_limits(self, credential=1, knowledge=2, grades=1, role="admin"):
        return self.client.put(
            "/api/admin/settings/upload-limits",
            json={"credential": credential, "knowledge": knowledge, "grades": grades},
            headers=self.headers[role],
        )

    def upload(self, category, size, path=None):
        if category == "knowledge":
            data = {"title": "Textbook", "subject": "math"}
            path = path or "/api/teacher/knowledge"
        elif category == "credential":
            data = {"title": "Award", "credential_type": "other"}
            path = path or "/api/student/files"
        else:
            data = {}
            path = path or "/api/teacher/grades/import"
        data["file"] = (io.BytesIO(b"x" * size), "sample.txt")
        role = "student" if category == "credential" else "teacher"
        response = self.client.post(path, data=data, headers=self.headers[role])
        response.request.environ["wsgi.input"].close()
        response.close()
        return response

    def test_default_limits_and_permissions(self):
        self.assertEqual(self.client.get("/api/upload-limits").status_code, 401)
        defaults = {"credential": 10, "knowledge": 40, "grades": 10}
        for role in self.headers:
            response = self.client.get("/api/upload-limits", headers=self.headers[role])
            self.assertEqual(response.json["upload_limits"], defaults)
        for role in ("student", "teacher"):
            self.assertEqual(self.save_limits(role=role).status_code, 403)
        self.assertEqual(self.save_limits().status_code, 200)
        self.assertEqual(
            self.client.get("/api/admin/settings", headers=self.headers["admin"]).json["upload_limits"],
            {"credential": 1, "knowledge": 2, "grades": 1},
        )

    def test_validation_is_strict_and_atomic(self):
        self.save_limits()
        for bad in (0, -1, 101, 1.5, True, "20", None):
            with self.subTest(value=bad):
                response = self.client.put(
                    "/api/admin/settings/upload-limits",
                    json={"credential": bad, "knowledge": 3, "grades": 3},
                    headers=self.headers["admin"],
                )
                self.assertEqual(response.status_code, 400)
                self.assertEqual(response.json["code"], "INVALID_UPLOAD_LIMITS")
        for body in ([], {}, {"credential": 1}, {
            "credential": 1, "knowledge": 1, "grades": 1, "unknown": 1,
        }):
            response = self.client.put(
                "/api/admin/settings/upload-limits", json=body, headers=self.headers["admin"],
            )
            self.assertEqual(response.status_code, 400)
        self.assertEqual(
            self.client.get("/api/upload-limits", headers=self.headers["student"]).json["upload_limits"],
            {"credential": 1, "knowledge": 2, "grades": 1},
        )
        self.assertEqual(self.save_limits(100, 100, 100).status_code, 200)

    def test_limits_persist_and_existing_app_instances_observe_updates(self):
        other = self.create_app({"TESTING": True, "SECRET_KEY": "upload-test-key"})
        self.save_limits(3, 5, 7)
        init_db()
        for client in (other.test_client(), self.create_app({
            "TESTING": True, "SECRET_KEY": "upload-test-key",
        }).test_client()):
            self.assertEqual(
                client.get("/api/upload-limits", headers=self.headers["student"]).json["upload_limits"],
                {"credential": 3, "knowledge": 5, "grades": 7},
            )
        with get_db() as db:
            self.assertEqual(db.execute("SELECT updated_by FROM upload_settings").fetchone()[0], 1)

    @patch("routes.knowledge.enqueue_knowledge_index")
    @patch("routes.student_files.enqueue_credential_analysis")
    def test_file_boundaries_and_category_limits(self, credential_queue, knowledge_queue):
        self.save_limits()
        for category in ("credential", "grades"):
            response = self.upload(category, MB + 1)
            self.assertEqual(response.status_code, 413)
            self.assertEqual(response.json["details"]["limit_mb"], 1)
            self.assertEqual(response.json["code"], "FILE_TOO_LARGE")
        self.assertEqual(list((self.root / "uploads").iterdir()), [])
        credential_queue.assert_not_called()
        knowledge_queue.assert_not_called()
        response = self.upload("credential", MB)
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json["files"][0]["size"], MB)
        self.assertEqual(self.upload("knowledge", MB + 1).status_code, 201)
        self.assertEqual(self.upload("knowledge", 2 * MB + 1).status_code, 413)
        credential_queue.assert_called_once()
        knowledge_queue.assert_called_once()

    @patch("routes.student_files.enqueue_credential_analysis")
    def test_rejected_resubmission_preserves_original_when_replacement_is_too_large(self, queue):
        self.save_limits()
        response = self.upload("credential", 20)
        file_id = response.json["files"][0]["id"]
        with get_db() as db:
            db.execute("UPDATE student_files SET status='rejected' WHERE id=?", (file_id,))
        response = self.upload(
            "credential", MB + 1, f"/api/student/files/{file_id}/resubmit"
        )
        self.assertEqual(response.status_code, 413)
        with get_db() as db:
            row = db.execute("SELECT revision,size,status FROM student_files WHERE id=?", (file_id,)).fetchone()
        self.assertEqual(tuple(row), (1, 20, "rejected"))
        self.assertEqual(len(list((self.root / "uploads").iterdir())), 1)
        queue.assert_called_once()

    @patch("routes.knowledge.enqueue_knowledge_index")
    def test_larger_admin_limit_overrides_old_request_ceiling_and_lowering_takes_effect(self, queue):
        self.save_limits(knowledge=45)
        self.assertEqual(self.upload("knowledge", 41 * MB).status_code, 201)
        self.save_limits(knowledge=1)
        # Exceeds both file limit and multipart request ceiling.
        response = self.upload("knowledge", 3 * MB)
        self.assertEqual(response.status_code, 413)
        self.assertEqual(response.json["details"], {"limit_mb": 1, "category": "knowledge"})
        queue.assert_called_once()
