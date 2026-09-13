"""teacher API endpoints."""

from flask import Blueprint, jsonify, request

from database import get_db
from routes.common import error, student_list
from routes.security import token_required
from services.semantic_search import search_students


bp = Blueprint("teacher", __name__)



@bp.get("/api/teacher/dashboard")
@token_required("teacher")
def teacher_dashboard():
    with get_db() as db:
        stats = {
            "students": db.execute("SELECT COUNT(*) FROM students").fetchone()[0],
            "classes": db.execute("SELECT COUNT(DISTINCT class_name) FROM students WHERE class_name != ''").fetchone()[0],
            "grade_records": db.execute("SELECT COUNT(*) FROM grades").fetchone()[0],
            "reports": db.execute("SELECT COUNT(*) FROM reports").fetchone()[0],
        }
        students = student_list(db)[:6]
    return jsonify({"stats": stats, "students": students})


@bp.get("/api/teacher/students")
@token_required("teacher")
def teacher_students():
    with get_db() as db:
        students = student_list(db)
    return jsonify({"students": students})



@bp.post("/api/teacher/search")
@token_required("teacher")
def teacher_search():
    data = request.get_json(silent=True) or {}
    query = str(data.get("query", "")).strip()
    if len(query) < 2:
        return error("请描述活动需求，至少输入 2 个字")
    with get_db() as db:
        students = student_list(db, include_embedding=True)
        results, engine, embedding_updates = search_students(
            query, students, int(data.get("limit", 20))
        )
        if embedding_updates:
            db.executemany(
                """UPDATE interests SET embedding=?,embedding_model=?,
                   updated_at=CURRENT_TIMESTAMP WHERE student_id=?""",
                embedding_updates,
            )
    return jsonify({"query": query, "count": len(results), "engine": engine, "students": results})
