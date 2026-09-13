"""credentials API endpoints."""

from flask import Blueprint, g, jsonify, request

from database import get_db
from routes.common import credential_analysis_dict, credential_rows, error
from routes.security import token_required
from services.credential_queue import enqueue_credential_analysis


bp = Blueprint("credentials", __name__)



@bp.get("/api/teacher/credentials")
@token_required("teacher")
def teacher_credentials():
    status = request.args.get("status", "")
    if status and status not in {"pending", "approved", "rejected"}:
        return error("审核状态不正确")
    where = "WHERE sf.status=?" if status else ""
    params = (status,) if status else ()
    with get_db() as db:
        credentials = credential_rows(db, where, params)
        counts = {
            row["status"]: row["count"]
            for row in db.execute(
                "SELECT status,COUNT(*) count FROM student_files GROUP BY status"
            )
        }
    return jsonify({
        "credentials": credentials,
        "counts": {key: counts.get(key, 0) for key in ("pending", "approved", "rejected")},
    })


@bp.put("/api/teacher/credentials/<int:file_id>/review")
@token_required("teacher")
def review_credential(file_id):
    data = request.get_json(silent=True) or {}
    status = data.get("status")
    comment = str(data.get("comment", "")).strip()[:500]
    if status not in {"pending", "approved", "rejected"}:
        return error("请选择通过、驳回或撤销审核")
    if status == "rejected" and not comment:
        return error("驳回时请填写审核意见")
    with get_db() as db:
        credential = db.execute(
            "SELECT status FROM student_files WHERE id=?", (file_id,)
        ).fetchone()
        if not credential:
            return error("凭证不存在", 404)
        if status == "pending":
            if credential["status"] == "pending":
                return error("只有已审核的凭证可以撤销审核")
            db.execute(
                """UPDATE student_files SET status='pending',review_comment='',
                   reviewed_by=NULL,reviewed_at=NULL,updated_at=CURRENT_TIMESTAMP
                   WHERE id=?""",
                (file_id,),
            )
            return jsonify({"message": "审核结果已撤销"})
        db.execute(
            """UPDATE student_files SET status=?,review_comment=?,reviewed_by=?,
               reviewed_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP WHERE id=?""",
            (status, comment, g.user["id"], file_id),
        )
    return jsonify({"message": "审核结果已保存"})


@bp.route(
    "/api/teacher/credentials/<int:file_id>/analysis", methods=["GET", "POST"]
)
@token_required("teacher")
def credential_analysis(file_id):
    with get_db() as db:
        credential = db.execute(
            """SELECT sf.*,s.name student_name,s.student_no
               FROM student_files sf JOIN students s ON s.id=sf.student_id
               WHERE sf.id=?""",
            (file_id,),
        ).fetchone()
        if not credential:
            return error("凭证不存在", 404)
        if request.method == "GET":
            analysis = db.execute(
                "SELECT * FROM credential_ai_reviews WHERE file_id=?", (file_id,)
            ).fetchone()
            return jsonify(
                {"analysis": credential_analysis_dict(analysis) if analysis else None}
            )
        db.execute(
            """INSERT INTO credential_ai_reviews(file_id,analysis_revision)
               VALUES(?,?) ON CONFLICT(file_id) DO NOTHING""",
            (file_id, credential["revision"]),
        )

    enqueue_credential_analysis(file_id, credential["revision"])
    with get_db() as db:
        analysis = db.execute(
            "SELECT * FROM credential_ai_reviews WHERE file_id=?", (file_id,)
        ).fetchone()
    return jsonify({"analysis": credential_analysis_dict(analysis)}), 202
