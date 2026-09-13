"""student API endpoints."""

import json

from flask import Blueprint, g, jsonify, request

from database import get_db
from routes.common import error, grade_rows, profile_for_user
from routes.security import token_required
from services.semantic_search import embedding_model_name, encode_interest


bp = Blueprint("student", __name__)



@bp.route("/api/student/profile", methods=["GET", "PUT"])
@token_required("student")
def student_profile():
    with get_db() as db:
        student = db.execute(
            "SELECT * FROM students WHERE user_id = ?", (g.user["id"],)
        ).fetchone()
        if not student:
            return error("未找到学生资料", 404)
        if request.method == "PUT":
            data = request.get_json(silent=True) or {}
            allowed = [
                "name", "gender", "grade", "class_name", "birthday", "phone", "email", "bio"
            ]
            values = [str(data.get(key, student[key])).strip() for key in allowed]
            db.execute(
                f"UPDATE students SET {', '.join(key + ' = ?' for key in allowed)}, updated_at=CURRENT_TIMESTAMP WHERE id = ?",
                (*values, student["id"]),
            )
            tags = data.get("tags", [])
            description = str(data.get("interest_description", "")).strip()
            embedding = encode_interest(" ".join(tags) + " " + description)
            db.execute(
                """INSERT INTO interests(student_id,tags,description,embedding,embedding_model)
                   VALUES(?,?,?,?,?) ON CONFLICT(student_id) DO UPDATE SET
                   tags=excluded.tags, description=excluded.description,
                   embedding=excluded.embedding, embedding_model=excluded.embedding_model,
                   updated_at=CURRENT_TIMESTAMP""",
                (student["id"], json.dumps(tags, ensure_ascii=False), description,
                 json.dumps(embedding) if embedding else None,
                 embedding_model_name() if embedding else ""),
            )
        profile = profile_for_user(db, g.user["id"])
    return jsonify({"student": profile})


@bp.get("/api/student/grades")
@token_required("student")
def own_grades():
    with get_db() as db:
        student = db.execute("SELECT id FROM students WHERE user_id=?", (g.user["id"],)).fetchone()
        grades = grade_rows(db, student["id"]) if student else []
    return jsonify({"grades": grades})
