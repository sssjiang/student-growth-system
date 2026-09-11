import os
import sqlite3
from contextlib import contextmanager
from pathlib import Path
from typing import Iterator


BASE_DIR = Path(__file__).resolve().parent

STUDENT_FILE_COLUMNS = {
    "title": "TEXT NOT NULL DEFAULT ''",
    "credential_type": "TEXT NOT NULL DEFAULT 'other'",
    "issuer": "TEXT NOT NULL DEFAULT ''",
    "awarded_at": "TEXT NOT NULL DEFAULT ''",
    "description": "TEXT NOT NULL DEFAULT ''",
    "status": "TEXT NOT NULL DEFAULT 'pending'",
    "review_comment": "TEXT NOT NULL DEFAULT ''",
    "reviewed_by": "INTEGER",
    "reviewed_at": "TEXT",
    "revision": "INTEGER NOT NULL DEFAULT 1",
    "updated_at": "TEXT NOT NULL DEFAULT ''",
}

INTEREST_COLUMNS = {
    "embedding": "TEXT",
    "embedding_model": "TEXT NOT NULL DEFAULT ''",
}

CREDENTIAL_AI_REVIEW_COLUMNS = {
    "analysis_revision": "INTEGER NOT NULL DEFAULT 1",
    "job_id": "TEXT NOT NULL DEFAULT ''",
}


def database_path() -> Path:
    configured = os.getenv("DATABASE_PATH")
    if configured:
        path = Path(configured)
        return path if path.is_absolute() else BASE_DIR.parent / path
    return BASE_DIR / "data" / "students.db"


@contextmanager
def get_db() -> Iterator[sqlite3.Connection]:
    path = database_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(path, timeout=10)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    connection.execute("PRAGMA busy_timeout = 10000")
    try:
        yield connection
        connection.commit()
    except Exception:
        connection.rollback()
        raise
    finally:
        connection.close()


def init_db() -> None:
    with get_db() as db:
        db.execute("PRAGMA journal_mode = WAL")
        db.executescript((BASE_DIR / "schema.sql").read_text(encoding="utf-8"))
        existing = {
            row["name"] for row in db.execute("PRAGMA table_info(student_files)")
        }
        for name, definition in STUDENT_FILE_COLUMNS.items():
            if name not in existing:
                db.execute(f"ALTER TABLE student_files ADD COLUMN {name} {definition}")
        interest_columns = {
            row["name"] for row in db.execute("PRAGMA table_info(interests)")
        }
        for name, definition in INTEREST_COLUMNS.items():
            if name not in interest_columns:
                db.execute(f"ALTER TABLE interests ADD COLUMN {name} {definition}")
        ai_review_columns = {
            row["name"]
            for row in db.execute("PRAGMA table_info(credential_ai_reviews)")
        }
        for name, definition in CREDENTIAL_AI_REVIEW_COLUMNS.items():
            if name not in ai_review_columns:
                db.execute(
                    f"ALTER TABLE credential_ai_reviews ADD COLUMN {name} {definition}"
                )
        db.execute(
            """UPDATE credential_ai_reviews SET analysis_status='failed',
               error_message='not-queued',updated_at=CURRENT_TIMESTAMP
               WHERE job_id='' AND analysis_status IN ('pending','processing')"""
        )
        db.execute(
            """UPDATE knowledge_documents SET status='failed',
               error_message='not-queued',updated_at=CURRENT_TIMESTAMP
               WHERE job_id='' AND status IN ('pending','processing')"""
        )
        db.execute(
            "CREATE INDEX IF NOT EXISTS idx_student_files_status "
            "ON student_files(status, uploaded_at)"
        )



def rows_to_dicts(rows):
    return [dict(row) for row in rows]
