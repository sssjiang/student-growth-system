"""Persistent, administrator-controlled file limits (in binary megabytes)."""

from database import get_db

MB = 1024 * 1024
MIN_UPLOAD_MB = 1
MAX_UPLOAD_MB = 100
DEFAULT_LIMITS = {"credential": 10, "knowledge": 40, "grades": 10}


def get_upload_limits():
    with get_db() as db:
        row = db.execute(
            """SELECT credential_mb AS credential, knowledge_mb AS knowledge,
                      grades_mb AS grades FROM upload_settings WHERE id=1"""
        ).fetchone()
    return dict(row) if row else DEFAULT_LIMITS.copy()


def save_upload_limits(limits, admin_id):
    if (
        not isinstance(limits, dict)
        or limits.keys() != DEFAULT_LIMITS.keys()
        or any(
            type(value) is not int or not MIN_UPLOAD_MB <= value <= MAX_UPLOAD_MB
            for value in limits.values()
        )
    ):
        raise ValueError("上传大小上限必须是 1–100MB 的整数，并提供全部三项设置")
    with get_db() as db:
        db.execute(
            """INSERT INTO upload_settings(id,credential_mb,knowledge_mb,grades_mb,updated_by)
               VALUES(1,?,?,?,?) ON CONFLICT(id) DO UPDATE SET
               credential_mb=excluded.credential_mb, knowledge_mb=excluded.knowledge_mb,
               grades_mb=excluded.grades_mb, updated_by=excluded.updated_by,
               updated_at=CURRENT_TIMESTAMP""",
            (limits["credential"], limits["knowledge"], limits["grades"], admin_id),
        )
    return limits.copy()
