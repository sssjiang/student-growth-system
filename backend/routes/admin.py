"""admin API endpoints."""

import os

from flask import Blueprint, jsonify, request
from werkzeug.security import generate_password_hash

from database import get_db
from routes.common import admin_trace_rows, env_enabled, error, knowledge_document_rows
from routes.security import token_required
from services.credential_queue import enqueue_knowledge_index
from services.knowledge_base import SUBJECTS
from services.observability import langfuse_settings
from services.semantic_search import embedding_model_name


bp = Blueprint("admin", __name__)



@bp.get("/api/admin/dashboard")
@token_required("admin")
def admin_dashboard():
    with get_db() as db:
        stats = {
            "students": db.execute("SELECT COUNT(*) FROM students").fetchone()[0],
            "teachers": db.execute(
                "SELECT COUNT(*) FROM users WHERE role='teacher'"
            ).fetchone()[0],
            "documents": db.execute(
                "SELECT COUNT(*) FROM knowledge_documents"
            ).fetchone()[0],
            "failed_documents": db.execute(
                "SELECT COUNT(*) FROM knowledge_documents WHERE status='failed'"
            ).fetchone()[0],
            "questions": db.execute(
                "SELECT COUNT(*) FROM rag_traces"
            ).fetchone()[0],
            "empty_retrievals": db.execute(
                "SELECT COUNT(*) FROM rag_traces WHERE selected_count=0"
            ).fetchone()[0],
        }
        recent = admin_trace_rows(db, limit=6)
    return jsonify({"stats": stats, "recent_traces": recent})


@bp.route("/api/admin/users", methods=["GET", "POST"])
@token_required("admin")
def admin_users():
    if request.method == "GET":
        with get_db() as db:
            users = [
                dict(row)
                for row in db.execute(
                    """SELECT id,username,role,display_name,created_at
                       FROM users ORDER BY created_at DESC,id DESC"""
                )
            ]
            admins = [
                {
                    **dict(row),
                    "role": "admin",
                }
                for row in db.execute(
                    """SELECT id,username,display_name,created_at
                       FROM admin_users ORDER BY created_at DESC,id DESC"""
                )
            ]
        return jsonify({"users": admins + users})

    data = request.get_json(silent=True) or {}
    username = str(data.get("username", "")).strip()[:80]
    password = str(data.get("password", ""))
    display_name = str(data.get("display_name", "")).strip()[:80]
    role = str(data.get("role", "")).strip()
    if not username or not display_name or role not in {"admin", "teacher"}:
        return error("请填写账号、姓名并选择账号角色")
    if len(password) < 6:
        return error("密码至少需要 6 位")
    try:
        with get_db() as db:
            if db.execute(
                "SELECT 1 FROM users WHERE username=?", (username,)
            ).fetchone() or db.execute(
                "SELECT 1 FROM admin_users WHERE username=?", (username,)
            ).fetchone():
                return error("用户名已存在", 409)
            if role == "admin":
                cursor = db.execute(
                    """INSERT INTO admin_users(username,password_hash,display_name)
                       VALUES(?,?,?)""",
                    (username, generate_password_hash(password), display_name),
                )
            else:
                cursor = db.execute(
                    """INSERT INTO users(username,password_hash,role,display_name)
                       VALUES(?,?,'teacher',?)""",
                    (username, generate_password_hash(password), display_name),
                )
    except Exception as exc:
        if "UNIQUE" in str(exc):
            return error("用户名已存在", 409)
        raise
    return jsonify(
        {
            "user": {
                "id": cursor.lastrowid,
                "username": username,
                "display_name": display_name,
                "role": role,
            }
        }
    ), 201


@bp.get("/api/admin/knowledge")
@token_required("admin")
def admin_knowledge():
    with get_db() as db:
        documents = knowledge_document_rows(db)
    return jsonify({"documents": documents})


@bp.get("/api/admin/knowledge/<int:document_id>/chunks")
@token_required("admin")
def admin_knowledge_chunks(document_id):
    requested_limit = request.args.get("limit", 50, type=int)
    limit = max(1, min(requested_limit if requested_limit is not None else 50, 200))
    with get_db() as db:
        document = db.execute(
            "SELECT id,title,subject,grade_level,status FROM knowledge_documents WHERE id=?",
            (document_id,),
        ).fetchone()
        if not document:
            return error("教材不存在", 404)
        chunks = [
            dict(row)
            for row in db.execute(
                """SELECT id,position,heading,content,embedding_model,created_at
                   FROM knowledge_chunks WHERE document_id=?
                   ORDER BY position LIMIT ?""",
                (document_id, limit),
            )
        ]
    return jsonify({"document": dict(document), "chunks": chunks})


@bp.post("/api/admin/knowledge/<int:document_id>/reindex")
@token_required("admin")
def admin_reindex_knowledge(document_id):
    with get_db() as db:
        if not db.execute(
            "SELECT 1 FROM knowledge_documents WHERE id=?", (document_id,)
        ).fetchone():
            return error("教材不存在", 404)
    enqueue_knowledge_index(document_id)
    return jsonify({"message": "索引任务已提交"}), 202


@bp.get("/api/admin/rag-traces")
@token_required("admin")
def admin_rag_traces():
    requested_limit = request.args.get("limit", 50, type=int)
    limit = max(1, min(requested_limit if requested_limit is not None else 50, 200))
    subject = request.args.get("subject", "")
    where, params = "", []
    if subject in SUBJECTS:
        where = "WHERE rt.subject=?"
        params.append(subject)
    with get_db() as db:
        traces = admin_trace_rows(db, where, (*params,), limit)
    return jsonify({"traces": traces})


@bp.get("/api/admin/rag-traces/<trace_id>")
@token_required("admin")
def admin_rag_trace(trace_id):
    with get_db() as db:
        rows = admin_trace_rows(db, "WHERE rt.id=?", (trace_id,), 1)
        if not rows:
            return error("调试记录不存在", 404)
        chunks = [
            dict(row)
            for row in db.execute(
                """SELECT chunk_id,rank,semantic_score,keyword_score,
                          final_score,selected,document_title,heading,content_snapshot
                   FROM rag_trace_chunks WHERE trace_id=? ORDER BY rank""",
                (trace_id,),
            )
        ]
    return jsonify({"trace": rows[0], "chunks": chunks})


@bp.get("/api/admin/settings")
@token_required("admin")
def admin_settings():
    tracing = langfuse_settings()
    return jsonify(
        {
            "ai": {
                "report_enabled": env_enabled("AI_REPORT_ENABLED", True),
                "credential_review_enabled": env_enabled(
                    "AI_CREDENTIAL_REVIEW_ENABLED", True
                ),
                "tutor_enabled": env_enabled("AI_TUTOR_ENABLED", True),
                "chat_model": os.getenv("OPENAI_MODEL")
                or os.getenv("LongCat_MODEL", ""),
                "embedding_model": embedding_model_name(),
                "embedding_device": os.getenv("EMBEDDING_DEVICE", "cpu"),
            },
            "langfuse": tracing,
            "queue": {
                "broker_configured": bool(os.getenv("CELERY_BROKER_URL")),
                "timezone": os.getenv("CELERY_TIMEZONE", "Asia/Shanghai"),
            },
        }
    )
