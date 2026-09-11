import os
import tempfile
import unittest


_temp_dir = tempfile.mkdtemp(prefix="student-growth-test-")
os.environ["DATABASE_PATH"] = os.path.join(_temp_dir, "test.db")
os.environ["UPLOAD_FOLDER"] = os.path.join(_temp_dir, "uploads")
os.environ["SECRET_KEY"] = "integration-test-key"

from app import app  # noqa: E402
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


if __name__ == "__main__":
    unittest.main()
