"""student files API endpoints."""

from pathlib import Path

from flask import Blueprint, current_app, g, jsonify, request, send_from_directory

from database import get_db
from routes.common import (
    DEFAULT_UPLOAD_LIMIT,
    credential_rows,
    error,
    parse_credential_metadata,
    upload_exceeds_limit,
)
from routes.security import token_required
from services.credential_queue import enqueue_credential_analysis
from services.file_storage import InvalidFileError


bp = Blueprint("student_files", __name__)



@bp.route("/api/student/files", methods=["GET", "POST"])
@token_required("student")
def student_files():
    analysis_request = None
    with get_db() as db:
        student = db.execute("SELECT id FROM students WHERE user_id=?", (g.user["id"],)).fetchone()
        if request.method == "POST":
            uploaded = request.files.get("file")
            if not uploaded or not uploaded.filename:
                return error("请选择文件")
            if upload_exceeds_limit(uploaded, DEFAULT_UPLOAD_LIMIT):
                return error("文件不能超过 10MB", 413)
            metadata, metadata_error = parse_credential_metadata(request.form)
            if metadata_error:
                return error(metadata_error)
            try:
                saved = current_app.extensions["file_storage"].save(uploaded)
            except InvalidFileError as exc:
                return error(str(exc))
            cursor = db.execute(
                """INSERT INTO student_files(
                     student_id,title,credential_type,issuer,awarded_at,description,
                     original_name,stored_name,mime_type,size,status,updated_at
                   ) VALUES(?,?,?,?,?,?,?,?,?,?,'pending',CURRENT_TIMESTAMP)""",
                (student["id"], *metadata, saved["original_name"], saved["stored_name"],
                 saved["mime_type"], saved["size"]),
            )
            db.execute(
                """INSERT INTO credential_ai_reviews(file_id,analysis_revision)
                   VALUES(?,1)""",
                (cursor.lastrowid,),
            )
            analysis_request = (cursor.lastrowid, 1)
        files = credential_rows(db, "WHERE sf.student_id=?", (student["id"],))
    if analysis_request:
        enqueue_credential_analysis(*analysis_request)
        with get_db() as db:
            files = credential_rows(db, "WHERE sf.student_id=?", (student["id"],))
    return jsonify({"files": files}), 201 if request.method == "POST" else 200


@bp.delete("/api/student/files/<int:file_id>")
@token_required("student")
def delete_student_file(file_id):
    with get_db() as db:
        row = db.execute(
            """SELECT sf.stored_name FROM student_files sf
               JOIN students s ON s.id=sf.student_id
               WHERE sf.id=? AND s.user_id=?""",
            (file_id, g.user["id"]),
        ).fetchone()
        if not row:
            return error("凭证不存在", 404)
        db.execute("DELETE FROM student_files WHERE id=?", (file_id,))
    current_app.extensions["file_storage"].delete(row["stored_name"])
    return jsonify({"message": "凭证已删除"})


@bp.post("/api/student/files/<int:file_id>/resubmit")
@token_required("student")
def resubmit_student_file(file_id):
    analysis_request = None
    with get_db() as db:
        row = db.execute(
            """SELECT sf.* FROM student_files sf JOIN students s ON s.id=sf.student_id
               WHERE sf.id=? AND s.user_id=?""",
            (file_id, g.user["id"]),
        ).fetchone()
        if not row:
            return error("凭证不存在", 404)
        if row["status"] != "rejected":
            return error("只有被驳回的凭证可以重新提交", 409)
        metadata, metadata_error = parse_credential_metadata(request.form)
        if metadata_error:
            return error(metadata_error)

        uploaded = request.files.get("file")
        saved = None
        if uploaded and uploaded.filename:
            if upload_exceeds_limit(uploaded, DEFAULT_UPLOAD_LIMIT):
                return error("文件不能超过 10MB", 413)
            try:
                saved = current_app.extensions["file_storage"].save(uploaded)
            except InvalidFileError as exc:
                return error(str(exc))

        file_values = (
            (saved["original_name"], saved["stored_name"], saved["mime_type"], saved["size"])
            if saved else (row["original_name"], row["stored_name"], row["mime_type"], row["size"])
        )
        revision = row["revision"] + 1
        db.execute(
            """UPDATE student_files SET title=?,credential_type=?,issuer=?,awarded_at=?,
               description=?,original_name=?,stored_name=?,mime_type=?,size=?,status='pending',
               review_comment='',reviewed_by=NULL,reviewed_at=NULL,revision=?,
               updated_at=CURRENT_TIMESTAMP
               WHERE id=?""",
            (*metadata, *file_values, revision, file_id),
        )
        db.execute(
            """INSERT INTO credential_ai_reviews(file_id,analysis_revision)
               VALUES(?,?) ON CONFLICT(file_id) DO UPDATE SET
               analysis_revision=excluded.analysis_revision,job_id='',
               analysis_status='pending',overall_status='',overall_confidence=0,
               extraction_method='',extraction_confidence=0,extracted_text='',
               extracted_fields='{}',comparisons='[]',generated_by='',
               error_message='',analyzed_at=NULL,updated_at=CURRENT_TIMESTAMP""",
            (file_id, revision),
        )
        analysis_request = (file_id, revision)
        files = credential_rows(db, "WHERE sf.student_id=?", (row["student_id"],))
    if saved:
        current_app.extensions["file_storage"].delete(row["stored_name"])
    enqueue_credential_analysis(*analysis_request)
    with get_db() as db:
        files = credential_rows(db, "WHERE sf.student_id=?", (row["student_id"],))
    return jsonify({"message": "凭证已重新提交", "files": files})



@bp.get("/api/files/<int:file_id>")
@token_required("student", "teacher")
def download_file(file_id):
    with get_db() as db:
        row = db.execute("SELECT * FROM student_files WHERE id=?", (file_id,)).fetchone()
        if not row:
            return error("文件不存在", 404)
        if g.user["role"] == "student":
            owner = db.execute("SELECT id FROM students WHERE user_id=?", (g.user["id"],)).fetchone()
            if not owner or owner["id"] != row["student_id"]:
                return error("没有访问此文件的权限", 403)
    if not (Path(current_app.config["UPLOAD_FOLDER"]) / row["stored_name"]).is_file():
        return error("文件不存在", 404)
    return send_from_directory(
        current_app.config["UPLOAD_FOLDER"],
        row["stored_name"],
        download_name=row["original_name"],
        mimetype=row["mime_type"],
        as_attachment=request.args.get("preview") != "1",
    )
