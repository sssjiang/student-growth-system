import os
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch


class AppFactoryTest(unittest.TestCase):
    def test_blueprints_use_each_apps_auth_and_storage_config(self):
        with tempfile.TemporaryDirectory(prefix="app-factory-test-") as directory:
            root = Path(directory)
            with patch.dict(os.environ, {
                "DATABASE_PATH": str(root / "test.db"),
                "UPLOAD_FOLDER": str(root / "default-uploads"),
                "ADMIN_USERNAME": "factory-admin",
                "ADMIN_PASSWORD": "factory-password",
            }):
                from app import create_app

                apps = [create_app({
                    "TESTING": True,
                    "SECRET_KEY": f"factory-secret-{index}",
                    "UPLOAD_FOLDER": str(root / str(index)),
                }) for index in range(2)]
                clients = [app.test_client() for app in apps]
                for index, client in enumerate(clients):
                    self.assertEqual(client.get("/api/health").status_code, 200)
                    login = client.post("/api/auth/login", json={
                        "username": "factory-admin",
                        "password": "factory-password",
                    })
                    self.assertEqual(login.status_code, 200)
                    headers = {"Authorization": "Bearer " + login.json["token"]}
                    self.assertEqual(client.get("/api/me", headers=headers).status_code, 200)
                    self.assertEqual(
                        clients[1 - index].get("/api/me", headers=headers).status_code, 401
                    )
                    self.assertEqual(
                        apps[index].extensions["file_storage"].root, root / str(index)
                    )
                self.assertIsNot(
                    apps[0].extensions["file_storage"], apps[1].extensions["file_storage"]
                )
