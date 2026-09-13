"""grades API endpoints."""

import csv
import io
import json

from flask import Blueprint, jsonify, request

from database import get_db
from routes.common import DEFAULT_UPLOAD_LIMIT, error, grade_rows, upload_exceeds_limit
from routes.security import token_required
from services.grade_report import generate_report


bp = Blueprint("grades", __name__)



@bp.route("/api/teacher/students/<int:student_id>/grades", methods=["GET", "POST"])
@token_required("teacher")
def student_grades(student_id):
    with get_db() as db:
        if not db.execute("SELECT 1 FROM students WHERE id=?", (student_id,)).fetchone():
            return error("学生不存在", 404)
        if request.method == "POST":
            data = request.get_json(silent=True) or {}
            try:
                values = [float(data[key]) for key in ("chinese", "math", "english", "politics")]
                year, semester = int(data["year"]), int(data.get("semester", 1))
                if not all(0 <= value <= 100 for value in values) or semester not in (1, 2):
                    raise ValueError
            except (KeyError, TypeError, ValueError):
                return error("年份、学期或成绩格式不正确")
            db.execute(
                """INSERT INTO grades(student_id,year,semester,chinese,math,english,politics)
                   VALUES(?,?,?,?,?,?,?) ON CONFLICT(student_id,year,semester) DO UPDATE SET
                   chinese=excluded.chinese, math=excluded.math, english=excluded.english, politics=excluded.politics""",
                (student_id, year, semester, *values),
            )
        grades = grade_rows(db, student_id)
    return jsonify({"grades": grades}), 201 if request.method == "POST" else 200


@bp.post("/api/teacher/grades/import")
@token_required("teacher")
def import_grades():
    uploaded = request.files.get("file")
    if not uploaded:
        return error("请选择 CSV 文件")
    if upload_exceeds_limit(uploaded, DEFAULT_UPLOAD_LIMIT):
        return error("文件不能超过 10MB", 413)
    try:
        reader = csv.DictReader(io.StringIO(uploaded.read().decode("utf-8-sig")))
        expected = {"student_no", "year", "semester", "chinese", "math", "english", "politics"}
        if not expected.issubset(set(reader.fieldnames or [])):
            return error("CSV 缺少必要列：" + ", ".join(sorted(expected)))
        imported, skipped = 0, []
        with get_db() as db:
            for index, row in enumerate(reader, start=2):
                student = db.execute("SELECT id FROM students WHERE student_no=?", (row["student_no"],)).fetchone()
                try:
                    scores = [float(row[key]) for key in ("chinese", "math", "english", "politics")]
                    if not student or not all(0 <= score <= 100 for score in scores):
                        raise ValueError
                    db.execute(
                        """INSERT INTO grades(student_id,year,semester,chinese,math,english,politics)
                           VALUES(?,?,?,?,?,?,?) ON CONFLICT(student_id,year,semester) DO UPDATE SET
                           chinese=excluded.chinese,math=excluded.math,english=excluded.english,politics=excluded.politics""",
                        (student["id"], int(row["year"]), int(row["semester"]), *scores),
                    )
                    imported += 1
                except (ValueError, TypeError):
                    skipped.append(index)
    except UnicodeDecodeError:
        return error("请上传 UTF-8 编码的 CSV 文件")
    return jsonify({"message": f"成功导入 {imported} 条成绩", "imported": imported, "skipped_rows": skipped})



@bp.post("/api/teacher/students/<int:student_id>/report")
@token_required("teacher")
def create_report(student_id):
    with get_db() as db:
        student_row = db.execute("SELECT * FROM students WHERE id=?", (student_id,)).fetchone()
        if not student_row:
            return error("学生不存在", 404)
        grades = grade_rows(db, student_id)
        if len(grades) < 2:
            return error("至少需要两个学期的成绩才能生成趋势报告")
        report, metrics, source = generate_report(dict(student_row), grades)
        cursor = db.execute(
            "INSERT INTO reports(student_id,content,metrics,generated_by) VALUES(?,?,?,?)",
            (student_id, json.dumps(report, ensure_ascii=False), json.dumps(metrics, ensure_ascii=False), source),
        )
    return jsonify({"id": cursor.lastrowid, "student": dict(student_row), "report": report,
                    "metrics": metrics, "grades": grades, "generated_by": source}), 201


@bp.get("/api/teacher/students/<int:student_id>/report")
@token_required("teacher")
def latest_report(student_id):
    with get_db() as db:
        student = db.execute("SELECT * FROM students WHERE id=?", (student_id,)).fetchone()
        report = db.execute("SELECT * FROM reports WHERE student_id=? ORDER BY id DESC LIMIT 1", (student_id,)).fetchone()
        grades = grade_rows(db, student_id)
    if not student:
        return error("学生不存在", 404)
    if not report:
        return jsonify({"student": dict(student), "grades": grades, "report": None})
    return jsonify({"id": report["id"], "student": dict(student), "grades": grades,
                    "report": json.loads(report["content"]), "metrics": json.loads(report["metrics"]),
                    "generated_by": report["generated_by"], "created_at": report["created_at"]})
