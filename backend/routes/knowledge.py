"""knowledge API endpoints."""

from pathlib import Path

from flask import Blueprint, current_app, g, jsonify, request, send_from_directory

from database import get_db
from routes.common import (
    KNOWLEDGE_UPLOAD_LIMIT,
    error,
    knowledge_document_rows,
    upload_exceeds_limit,
)
from routes.security import token_required
from services.credential_queue import enqueue_knowledge_index
from services.file_storage import InvalidFileError
from services.knowledge_base import SUBJECTS


bp = Blueprint("knowledge", __name__)



@bp.route("/api/teacher/knowledge", methods=["GET", "POST"])
@token_required("teacher")
def teacher_knowledge():
    if request.method == "GET":
        with get_db() as db:
            documents = knowledge_document_rows(db)
        return jsonify({"documents": documents})

    uploaded = request.files.get("file")
    title = str(request.form.get("title", "")).strip()[:120]
    subject = str(request.form.get("subject", "")).strip()
    grade_level = str(request.form.get("grade_level", "")).strip()[:40]
    source = str(request.form.get("source", "")).strip()[:160]
    if not uploaded or not uploaded.filename:
        return error("请选择教材文件")
    if not title:
        return error("请填写教材名称")
    if subject not in SUBJECTS:
        return error("请选择正确的学科")
    if upload_exceeds_limit(uploaded, KNOWLEDGE_UPLOAD_LIMIT):
        return error("教材文件不能超过 40MB", 413)
    if Path(uploaded.filename).suffix.lower() not in {
        ".pdf",
        ".docx",
        ".txt",
        ".png",
        ".jpg",
        ".jpeg",
    }:
        return error("教材仅支持 PDF、DOCX、图片和 TXT 文件")
    try:
        saved = current_app.extensions["file_storage"].save(uploaded)
    except InvalidFileError as exc:
        return error(str(exc))
    try:
        with get_db() as db:
            cursor = db.execute(
                """INSERT INTO knowledge_documents(
                   title,subject,grade_level,source,original_name,stored_name,
                   mime_type,size,uploaded_by
                   ) VALUES(?,?,?,?,?,?,?,?,?)""",
                (
                    title,
                    subject,
                    grade_level,
                    source,
                    saved["original_name"],
                    saved["stored_name"],
                    saved["mime_type"],
                    saved["size"],
                    g.user["id"],
                ),
            )
            document_id = cursor.lastrowid
    except Exception:
        current_app.extensions["file_storage"].delete(saved["stored_name"])
        raise
    enqueue_knowledge_index(document_id)
    with get_db() as db:
        document = knowledge_document_rows(db, "WHERE kd.id=?", (document_id,))[0]
    return jsonify({"document": document}), 201


@bp.delete("/api/teacher/knowledge/<int:document_id>")
@token_required("teacher")
def delete_knowledge_document(document_id):
    with get_db() as db:
        document = db.execute(
            "SELECT stored_name FROM knowledge_documents WHERE id=?", (document_id,)
        ).fetchone()
        if not document:
            return error("教材不存在", 404)
        db.execute("DELETE FROM knowledge_documents WHERE id=?", (document_id,))
    current_app.extensions["file_storage"].delete(document["stored_name"])
    return jsonify({"message": "教材已删除"})


@bp.post("/api/teacher/knowledge/<int:document_id>/reindex")
@token_required("teacher")
def reindex_knowledge_document(document_id):
    with get_db() as db:
        if not db.execute(
            "SELECT 1 FROM knowledge_documents WHERE id=?", (document_id,)
        ).fetchone():
            return error("教材不存在", 404)
    enqueue_knowledge_index(document_id)
    with get_db() as db:
        document = knowledge_document_rows(db, "WHERE kd.id=?", (document_id,))[0]
    return jsonify({"document": document}), 202


@bp.get("/api/teacher/knowledge/<int:document_id>/file")
@token_required("teacher")
def preview_knowledge_document(document_id):
    with get_db() as db:
        document = db.execute(
            "SELECT * FROM knowledge_documents WHERE id=?", (document_id,)
        ).fetchone()
    if not document:
        return error("教材不存在", 404)
    return send_from_directory(
        current_app.config["UPLOAD_FOLDER"],
        document["stored_name"],
        download_name=document["original_name"],
        mimetype=document["mime_type"],
        as_attachment=request.args.get("preview") != "1",
    )
