import os
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from database import get_db, init_db
from services.credential_queue import enqueue_credential_analysis
from tasks import analyze_credential_task


class CredentialTaskTest(unittest.TestCase):
    def test_current_revision_completes_and_old_revision_becomes_stale(self):
        with tempfile.TemporaryDirectory(prefix="credential-task-") as directory:
            root = Path(directory)
            database = root / "test.db"
            uploads = root / "uploads"
            uploads.mkdir()
            (uploads / "credential.txt").write_text(
                "林晓雨 校园摄影大赛一等奖 学校艺术中心",
                encoding="utf-8",
            )
            environment = {
                "DATABASE_PATH": str(database),
                "UPLOAD_FOLDER": str(uploads),
            }
            with patch.dict(os.environ, environment):
                init_db()
                with get_db() as db:
                    user = db.execute(
                        """INSERT INTO users(username,password_hash,role,display_name)
                           VALUES('student','hash','student','林晓雨')"""
                    )
                    student = db.execute(
                        """INSERT INTO students(user_id,student_no,name)
                           VALUES(?,?,?)""",
                        (user.lastrowid, "2026001", "林晓雨"),
                    )
                    credential = db.execute(
                        """INSERT INTO student_files(
                           student_id,title,credential_type,issuer,awarded_at,
                           original_name,stored_name,mime_type,size,revision
                           ) VALUES(?,?,?,?,?,?,?,?,?,1)""",
                        (
                            student.lastrowid,
                            "校园摄影大赛一等奖",
                            "艺术活动",
                            "学校艺术中心",
                            "2026-05-20",
                            "credential.txt",
                            "credential.txt",
                            "text/plain",
                            64,
                        ),
                    )
                    db.execute(
                        """INSERT INTO credential_ai_reviews(
                           file_id,analysis_revision,job_id
                           ) VALUES(?,1,'job-1')""",
                        (credential.lastrowid,),
                    )
                    file_id = credential.lastrowid

                analysis = {
                    "extracted_text": "林晓雨 校园摄影大赛一等奖 学校艺术中心",
                    "extraction_method": "plain-text",
                    "extraction_confidence": 1.0,
                    "extracted_fields": {},
                    "comparisons": [],
                    "overall_status": "consistent",
                    "overall_confidence": 1.0,
                    "generated_by": "local-rules",
                    "error_message": "",
                }
                with patch("tasks.analyze_credential", return_value=analysis):
                    result = analyze_credential_task.run(file_id, 1, "job-1")
                self.assertEqual(result["status"], "completed")
                with get_db() as db:
                    saved = db.execute(
                        "SELECT * FROM credential_ai_reviews WHERE file_id=?",
                        (file_id,),
                    ).fetchone()
                    self.assertEqual(saved["analysis_status"], "completed")
                    self.assertEqual(saved["analysis_revision"], 1)

                    db.execute(
                        "UPDATE student_files SET revision=2 WHERE id=?", (file_id,)
                    )
                    db.execute(
                        """UPDATE credential_ai_reviews SET analysis_revision=2,
                           job_id='job-2',analysis_status='pending' WHERE file_id=?""",
                        (file_id,),
                    )

                with patch("tasks.analyze_credential") as analyze:
                    stale = analyze_credential_task.run(file_id, 1, "job-1")
                self.assertEqual(stale["status"], "stale")
                analyze.assert_not_called()

                with patch("tasks.analyze_credential_task.apply_async") as apply_async:
                    queued_job = enqueue_credential_analysis(file_id, 2)
                self.assertTrue(queued_job)
                apply_async.assert_called_once_with(
                    args=(file_id, 2, queued_job),
                    task_id=queued_job,
                    queue="credential-analysis",
                )
                with get_db() as db:
                    queued = db.execute(
                        "SELECT * FROM credential_ai_reviews WHERE file_id=?",
                        (file_id,),
                    ).fetchone()
                self.assertEqual(queued["analysis_status"], "pending")
                self.assertEqual(queued["job_id"], queued_job)


if __name__ == "__main__":
    unittest.main()
