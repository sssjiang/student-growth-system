"""auth API endpoints."""

from datetime import datetime, timedelta, timezone

from flask import Blueprint, current_app, g, jsonify, request
from werkzeug.security import check_password_hash, generate_password_hash
import jwt

from database import get_db
from routes.common import error
from routes.security import token_required


bp = Blueprint("auth", __name__)



@bp.post("/api/auth/register")
def register():
    data = request.get_json(silent=True) or {}
    required = ["username", "password", "name", "student_no"]
    if any(not str(data.get(key, "")).strip() for key in required):
        return error("请填写用户名、密码、姓名和学号")
    if len(data["password"]) < 6:
        return error("密码至少需要 6 位")
    try:
        with get_db() as db:
            cursor = db.execute(
                "INSERT INTO users(username,password_hash,role,display_name) VALUES(?,?,?,?)",
                (
                    data["username"].strip(),
                    generate_password_hash(data["password"]),
                    "student",
                    data["name"].strip(),
                ),
            )
            db.execute(
                "INSERT INTO students(user_id,student_no,name,grade,class_name,email) VALUES(?,?,?,?,?,?)",
                (
                    cursor.lastrowid,
                    data["student_no"].strip(),
                    data["name"].strip(),
                    data.get("grade", ""),
                    data.get("class_name", ""),
                    data.get("email", ""),
                ),
            )
    except Exception as exc:
        if "UNIQUE" in str(exc):
            return error("用户名或学号已存在", 409)
        raise
    return jsonify({"message": "注册成功，请登录"}), 201


@bp.post("/api/auth/login")
def login():
    data = request.get_json(silent=True) or {}
    with get_db() as db:
        user = db.execute(
            "SELECT * FROM users WHERE username = ?", (data.get("username", ""),)
        ).fetchone()
        if not user:
            admin = db.execute(
                "SELECT * FROM admin_users WHERE username=?",
                (data.get("username", ""),),
            ).fetchone()
            if admin:
                user = dict(admin)
                user["role"] = "admin"
    if not user or not check_password_hash(user["password_hash"], data.get("password", "")):
        return error("用户名或密码错误", 401)
    token = jwt.encode(
        {
            "sub": str(user["id"]),
            "role": user["role"],
            "exp": datetime.now(timezone.utc) + timedelta(hours=12),
        },
        current_app.config["SECRET_KEY"],
        algorithm="HS256",
    )
    return jsonify(
        {
            "token": token,
            "user": {
                "id": user["id"],
                "name": user["display_name"],
                "username": user["username"],
                "role": user["role"],
            },
        }
    )


@bp.get("/api/me")
@token_required("student", "teacher", "admin")
def me():
    return jsonify({"user": g.user})
