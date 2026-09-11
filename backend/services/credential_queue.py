import uuid

from database import get_db


def enqueue_credential_analysis(file_id, revision):
    """Replace any older attempt and enqueue analysis for the current revision."""
    job_id = uuid.uuid4().hex
    with get_db() as db:
        updated = db.execute(
            """UPDATE credential_ai_reviews SET analysis_revision=?,job_id=?,
               analysis_status='pending',overall_status='',overall_confidence=0,
               extraction_method='',extraction_confidence=0,extracted_text='',
               extracted_fields='{}',comparisons='[]',generated_by='',error_message='',
               analyzed_at=NULL,updated_at=CURRENT_TIMESTAMP
               WHERE file_id=?""",
            (revision, job_id, file_id),
        ).rowcount
    if not updated:
        return None

    try:
        from tasks import analyze_credential_task

        analyze_credential_task.apply_async(
            args=(file_id, revision, job_id),
            task_id=job_id,
            queue="credential-analysis",
        )
    except Exception:
        with get_db() as db:
            db.execute(
                """UPDATE credential_ai_reviews SET analysis_status='failed',
                   error_message='queue-unavailable',updated_at=CURRENT_TIMESTAMP
                   WHERE file_id=? AND analysis_revision=? AND job_id=?""",
                (file_id, revision, job_id),
            )
        return None
    return job_id
