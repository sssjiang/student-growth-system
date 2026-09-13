import json
import os
from pathlib import Path

from celery.signals import worker_process_init

from celery_app import celery_app
from database import get_db, init_db
from services.credential_analysis import analyze_credential
from services.document_extraction import extract_document
from services.knowledge_base import create_chunk_records


BASE_DIR = Path(__file__).resolve().parent


@worker_process_init.connect
def initialize_worker_database(**_):
    init_db()


def _upload_path(stored_name):
    configured = os.getenv("UPLOAD_FOLDER")
    root = Path(configured) if configured else BASE_DIR / "uploads"
    if not root.is_absolute():
        root = BASE_DIR.parent / root
    return root / stored_name


def _claim_credential(file_id, revision, job_id):
    with get_db() as db:
        credential = db.execute(
            """SELECT sf.*,s.name student_name,s.student_no
               FROM student_files sf JOIN students s ON s.id=sf.student_id
               JOIN credential_ai_reviews ar ON ar.file_id=sf.id
               WHERE sf.id=? AND sf.revision=? AND ar.analysis_revision=?
                 AND ar.job_id=?""",
            (file_id, revision, revision, job_id),
        ).fetchone()
        if not credential:
            return None
        db.execute(
            """UPDATE credential_ai_reviews SET analysis_status='processing',
               error_message='',updated_at=CURRENT_TIMESTAMP
               WHERE file_id=? AND analysis_revision=? AND job_id=?""",
            (file_id, revision, job_id),
        )
    return dict(credential)


def _mark_failed(file_id, revision, job_id, message):
    with get_db() as db:
        db.execute(
            """UPDATE credential_ai_reviews SET analysis_status='failed',
               error_message=?,updated_at=CURRENT_TIMESTAMP
               WHERE file_id=? AND analysis_revision=? AND job_id=?""",
            (message, file_id, revision, job_id),
        )


@celery_app.task(bind=True, max_retries=2, name="credentials.analyze")
def analyze_credential_task(self, file_id, revision, job_id):
    credential = _claim_credential(file_id, revision, job_id)
    if not credential:
        return {"status": "stale"}

    file_path = _upload_path(credential["stored_name"])
    if not file_path.is_file():
        _mark_failed(file_id, revision, job_id, "file-not-found")
        return {"status": "failed"}

    try:
        result = analyze_credential(credential, file_path)
        with get_db() as db:
            updated = db.execute(
                """UPDATE credential_ai_reviews SET analysis_status='completed',
                   overall_status=?,overall_confidence=?,extraction_method=?,
                   extraction_confidence=?,extracted_text=?,extracted_fields=?,
                   comparisons=?,generated_by=?,error_message=?,
                   analyzed_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP
                   WHERE file_id=? AND analysis_revision=? AND job_id=?""",
                (
                    result.get("overall_status") or "needs_review",
                    result.get("overall_confidence") or 0,
                    result.get("extraction_method") or "",
                    result.get("extraction_confidence") or 0,
                    result.get("extracted_text") or "",
                    json.dumps(result.get("extracted_fields") or {}, ensure_ascii=False),
                    json.dumps(result.get("comparisons") or [], ensure_ascii=False),
                    result.get("generated_by") or "",
                    result.get("error_message") or "",
                    file_id,
                    revision,
                    job_id,
                ),
            ).rowcount
        return {"status": "completed" if updated else "stale"}
    except Exception as exc:
        if self.request.retries < self.max_retries:
            raise self.retry(exc=exc, countdown=30 * (self.request.retries + 1))
        _mark_failed(file_id, revision, job_id, type(exc).__name__)
        raise


@celery_app.task(bind=True, max_retries=2, name="knowledge.index")
def index_knowledge_document_task(self, document_id, job_id):
    with get_db() as db:
        document = db.execute(
            "SELECT * FROM knowledge_documents WHERE id=? AND job_id=?",
            (document_id, job_id),
        ).fetchone()
        if not document:
            return {"status": "stale"}
        db.execute(
            """UPDATE knowledge_documents SET status='processing',
               error_message='',updated_at=CURRENT_TIMESTAMP
               WHERE id=? AND job_id=?""",
            (document_id, job_id),
        )

    try:
        text, method, _ = extract_document(
            _upload_path(document["stored_name"]), document["mime_type"]
        )
        records = create_chunk_records(text)
        if not records:
            raise ValueError(f"no-readable-content:{method}")
        with get_db() as db:
            current = db.execute(
                "SELECT 1 FROM knowledge_documents WHERE id=? AND job_id=?",
                (document_id, job_id),
            ).fetchone()
            if not current:
                return {"status": "stale"}
            db.execute("DELETE FROM knowledge_chunks WHERE document_id=?", (document_id,))
            db.executemany(
                """INSERT INTO knowledge_chunks(
                   document_id,position,heading,content,embedding,embedding_model
                   ) VALUES(?,?,?,?,?,?)""",
                [(document_id, *record) for record in records],
            )
            db.execute(
                """UPDATE knowledge_documents SET status='ready',chunk_count=?,
                   error_message='',updated_at=CURRENT_TIMESTAMP
                   WHERE id=? AND job_id=?""",
                (len(records), document_id, job_id),
            )
        return {"status": "ready", "chunks": len(records)}
    except Exception as exc:
        if self.request.retries < self.max_retries:
            raise self.retry(exc=exc, countdown=30 * (self.request.retries + 1))
        with get_db() as db:
            db.execute(
                """UPDATE knowledge_documents SET status='failed',error_message=?,
                   updated_at=CURRENT_TIMESTAMP WHERE id=? AND job_id=?""",
                (type(exc).__name__, document_id, job_id),
            )
        raise
