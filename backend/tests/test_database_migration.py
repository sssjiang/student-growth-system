import os
import sqlite3
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from database import get_db, init_db


class DatabaseMigrationTest(unittest.TestCase):
    def test_existing_student_files_table_receives_review_columns(self):
        with tempfile.TemporaryDirectory(prefix="student-growth-migration-") as directory:
            path = Path(directory) / "legacy.db"
            connection = sqlite3.connect(path)
            try:
                connection.execute(
                    """CREATE TABLE student_files (
                       id INTEGER PRIMARY KEY, student_id INTEGER, original_name TEXT,
                       stored_name TEXT, mime_type TEXT, size INTEGER, uploaded_at TEXT
                    )"""
                )
                connection.commit()
            finally:
                connection.close()

            with patch.dict(os.environ, {"DATABASE_PATH": str(path)}):
                init_db()
                with get_db() as db:
                    columns = {
                        row["name"] for row in db.execute("PRAGMA table_info(student_files)")
                    }

            self.assertTrue(
                {"title", "credential_type", "status", "review_comment"}.issubset(columns)
            )


if __name__ == "__main__":
    unittest.main()
