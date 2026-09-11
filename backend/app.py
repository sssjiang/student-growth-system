import csv
import io
import json
import os
from datetime import datetime, timedelta, timezone
from functools import wraps
from pathlib import Path

from dotenv import load_dotenv


BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR.parent / ".env")

import jwt
from flask import Flask, g, jsonify, request, send_from_directory
from flask_cors import CORS
from werkzeug.security import check_password_hash, generate_password_hash

from database import get_db, init_db
from services.grade_report import generate_report
from services.file_storage import InvalidFileError, LocalFileStorage
from services.credential_queue import (
    enqueue_credential_analysis,
    enqueue_knowledge_index,
)
from services.knowledge_base import SUBJECTS, retrieve_chunks
from services.semantic_search import embedding_model_name, encode_interest, search_students
from services.tutor import generate_tutor_reply


MAX_FILE_SIZE = 10 * 1024 * 1024


def upload_folder_path() -> Path:
    configured = os.getenv("UPLOAD_FOLDER")
    if not configured:
        return BASE_DIR / "uploads"
    path = Path(configured)
    return path if path.is_absolute() else BASE_DIR.parent / path


def create_app(test_config=None):
    app = Flask(__name__)
    app.config.update(
        SECRET_KEY=os.getenv("SECRET_KEY", "dev-only-change-me"),
        MAX_CONTENT_LENGTH=MAX_FILE_SIZE,
        UPLOAD_FOLDER=str(upload_folder_path()),
    )
    if test_config:
        app.config.update(test_config)
    CORS(app, resources={r"/api/*": {"origins": "*"}})
    Path(app.config["UPLOAD_FOLDER"]).mkdir(parents=True, exist_ok=True)
    storage = LocalFileStorage(app.config["UPLOAD_FOLDER"])
    init_db()

    def token_required(*roles):
        def decorator(view):
            @wraps(view)
            def wrapped(*args, **kwargs):
                value = request.headers.get("Authorization", "")
                if not value.startswith("Bearer "):
                    return error("请先登录", 401)
                try:
                    payload = jwt.decode(
                        value[7:], app.config["SECRET_KEY"], algorithms=["HS256"]
                    )
                except jwt.ExpiredSignatureError:
                    return error("登录已过期，请重新登录", 401)
                except jwt.InvalidTokenError:
                    return error("无效的登录凭证", 401)
                with get_db() as db:
                    user = db.execute(
                        "SELECT id, username, role, display_name FROM users WHERE id = ?",
                        (payload.get("sub"),),
                    ).fetchone()
                if not user:
                    return error("用户不存在", 401)
                g.user = dict(user)
                if roles and g.user["role"] not in roles:
                    return error("没有访问此资源的权限", 403)
                return view(*args, **kwargs)

            return wrapped

        return decorator

    @app.errorhandler(413)
    def too_large(_):
        return error("文件不能超过 10MB", 413)

    @app.get("/api/health")
    def health():
        return jsonify({"status": "ok", "time": datetime.now(timezone.utc).isoformat()})

    @app.post("/api/auth/register")
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

    @app.post("/api/auth/login")
    def login():
        data = request.get_json(silent=True) or {}
        with get_db() as db:
            user = db.execute(
                "SELECT * FROM users WHERE username = ?", (data.get("username", ""),)
            ).fetchone()
        if not user or not check_password_hash(user["password_hash"], data.get("password", "")):
            return error("用户名或密码错误", 401)
        token = jwt.encode(
            {
                "sub": str(user["id"]),
                "role": user["role"],
                "exp": datetime.now(timezone.utc) + timedelta(hours=12),
            },
            app.config["SECRET_KEY"],
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

    @app.get("/api/me")
    @token_required("student", "teacher")
    def me():
        return jsonify({"user": g.user})

    @app.route("/api/student/profile", methods=["GET", "PUT"])
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

    @app.get("/api/student/grades")
    @token_required("student")
    def own_grades():
        with get_db() as db:
            student = db.execute("SELECT id FROM students WHERE user_id=?", (g.user["id"],)).fetchone()
            grades = grade_rows(db, student["id"]) if student else []
        return jsonify({"grades": grades})

    @app.route("/api/student/files", methods=["GET", "POST"])
    @token_required("student")
    def student_files():
        analysis_request = None
        with get_db() as db:
            student = db.execute("SELECT id FROM students WHERE user_id=?", (g.user["id"],)).fetchone()
            if request.method == "POST":
                uploaded = request.files.get("file")
                if not uploaded or not uploaded.filename:
                    return error("请选择文件")
                metadata, metadata_error = parse_credential_metadata(request.form)
                if metadata_error:
                    return error(metadata_error)
                try:
                    saved = storage.save(uploaded)
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

    @app.delete("/api/student/files/<int:file_id>")
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
        storage.delete(row["stored_name"])
        return jsonify({"message": "凭证已删除"})

    @app.post("/api/student/files/<int:file_id>/resubmit")
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
                try:
                    saved = storage.save(uploaded)
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
            storage.delete(row["stored_name"])
        enqueue_credential_analysis(*analysis_request)
        with get_db() as db:
            files = credential_rows(db, "WHERE sf.student_id=?", (row["student_id"],))
        return jsonify({"message": "凭证已重新提交", "files": files})

    @app.get("/api/teacher/dashboard")
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

    @app.get("/api/teacher/students")
    @token_required("teacher")
    def teacher_students():
        with get_db() as db:
            students = student_list(db)
        return jsonify({"students": students})

    @app.get("/api/teacher/credentials")
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

    @app.put("/api/teacher/credentials/<int:file_id>/review")
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

    @app.route(
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

    @app.post("/api/teacher/search")
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

    @app.route("/api/teacher/students/<int:student_id>/grades", methods=["GET", "POST"])
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

    @app.post("/api/teacher/grades/import")
    @token_required("teacher")
    def import_grades():
        uploaded = request.files.get("file")
        if not uploaded:
            return error("请选择 CSV 文件")
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

    @app.route("/api/teacher/knowledge", methods=["GET", "POST"])
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
            saved = storage.save(uploaded)
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
            storage.delete(saved["stored_name"])
            raise
        enqueue_knowledge_index(document_id)
        with get_db() as db:
            document = knowledge_document_rows(db, "WHERE kd.id=?", (document_id,))[0]
        return jsonify({"document": document}), 201

    @app.delete("/api/teacher/knowledge/<int:document_id>")
    @token_required("teacher")
    def delete_knowledge_document(document_id):
        with get_db() as db:
            document = db.execute(
                "SELECT stored_name FROM knowledge_documents WHERE id=?", (document_id,)
            ).fetchone()
            if not document:
                return error("教材不存在", 404)
            db.execute("DELETE FROM knowledge_documents WHERE id=?", (document_id,))
        storage.delete(document["stored_name"])
        return jsonify({"message": "教材已删除"})

    @app.post("/api/teacher/knowledge/<int:document_id>/reindex")
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

    @app.get("/api/teacher/knowledge/<int:document_id>/file")
    @token_required("teacher")
    def preview_knowledge_document(document_id):
        with get_db() as db:
            document = db.execute(
                "SELECT * FROM knowledge_documents WHERE id=?", (document_id,)
            ).fetchone()
        if not document:
            return error("教材不存在", 404)
        return send_from_directory(
            app.config["UPLOAD_FOLDER"],
            document["stored_name"],
            download_name=document["original_name"],
            mimetype=document["mime_type"],
            as_attachment=request.args.get("preview") != "1",
        )

    @app.get("/api/student/tutor/conversations")
    @token_required("student")
    def tutor_conversations():
        with get_db() as db:
            student = db.execute(
                "SELECT id FROM students WHERE user_id=?", (g.user["id"],)
            ).fetchone()
            rows = list(
                db.execute(
                    """SELECT tc.*,
                   (SELECT content FROM tutor_messages tm WHERE tm.conversation_id=tc.id
                    ORDER BY tm.id DESC LIMIT 1) last_message
                   FROM tutor_conversations tc WHERE tc.student_id=?
                   ORDER BY tc.updated_at DESC,tc.id DESC LIMIT 30""",
                    (student["id"],),
                )
            )
        return jsonify({"conversations": [dict(row) for row in rows]})

    @app.get("/api/student/tutor/conversations/<int:conversation_id>")
    @token_required("student")
    def tutor_conversation(conversation_id):
        with get_db() as db:
            conversation = db.execute(
                """SELECT tc.* FROM tutor_conversations tc JOIN students s
                   ON s.id=tc.student_id WHERE tc.id=? AND s.user_id=?""",
                (conversation_id, g.user["id"]),
            ).fetchone()
            if not conversation:
                return error("辅导会话不存在", 404)
            messages = [
                tutor_message_dict(row)
                for row in db.execute(
                    "SELECT * FROM tutor_messages WHERE conversation_id=? ORDER BY id",
                    (conversation_id,),
                )
            ]
        return jsonify({"conversation": dict(conversation), "messages": messages})

    @app.post("/api/student/tutor/chat")
    @token_required("student")
    def tutor_chat():
        data = request.get_json(silent=True) or {}
        question = str(data.get("message", "")).strip()[:2000]
        subject = str(data.get("subject", "")).strip()
        conversation_id = data.get("conversation_id")
        if len(question) < 2:
            return error("请填写你的问题")
        if subject not in SUBJECTS:
            return error("请选择正确的学科")
        with get_db() as db:
            student = db.execute(
                "SELECT * FROM students WHERE user_id=?", (g.user["id"],)
            ).fetchone()
            if conversation_id:
                conversation = db.execute(
                    """SELECT * FROM tutor_conversations
                       WHERE id=? AND student_id=?""",
                    (conversation_id, student["id"]),
                ).fetchone()
                if not conversation:
                    return error("辅导会话不存在", 404)
                if conversation["subject"] != subject:
                    return error("会话学科不能修改")
            else:
                cursor = db.execute(
                    """INSERT INTO tutor_conversations(student_id,subject,title)
                       VALUES(?,?,?)""",
                    (student["id"], subject, question[:40]),
                )
                conversation_id = cursor.lastrowid
            history = [
                dict(row)
                for row in db.execute(
                    """SELECT role,content FROM tutor_messages
                       WHERE conversation_id=? ORDER BY id DESC LIMIT 6""",
                    (conversation_id,),
                )
            ][::-1]
            candidates = list(
                db.execute(
                    """SELECT kc.*,kd.title,kd.source,kd.subject,kd.grade_level
                       FROM knowledge_chunks kc JOIN knowledge_documents kd
                       ON kd.id=kc.document_id WHERE kd.status='ready' AND kd.subject=?
                       AND (kd.grade_level='' OR kd.grade_level=?) LIMIT 1000""",
                    (subject, student["grade"]),
                )
            )
            grades = grade_rows(db, student["id"])

        chunks = retrieve_chunks(question, candidates)
        answer, citations, generated_by = generate_tutor_reply(
            dict(student), subject, question, chunks, history, grades
        )
        with get_db() as db:
            db.execute(
                "INSERT INTO tutor_messages(conversation_id,role,content) VALUES(?,'user',?)",
                (conversation_id, question),
            )
            message = db.execute(
                """INSERT INTO tutor_messages(conversation_id,role,content,citations)
                   VALUES(?,'assistant',?,?)""",
                (conversation_id, answer, json.dumps(citations, ensure_ascii=False)),
            )
            db.execute(
                """UPDATE tutor_conversations SET updated_at=CURRENT_TIMESTAMP
                   WHERE id=?""",
                (conversation_id,),
            )
        return jsonify(
            {
                "conversation_id": conversation_id,
                "message": {
                    "id": message.lastrowid,
                    "role": "assistant",
                    "content": answer,
                    "citations": citations,
                    "generated_by": generated_by,
                },
            }
        )

    @app.post("/api/teacher/students/<int:student_id>/report")
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

    @app.get("/api/teacher/students/<int:student_id>/report")
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

    @app.get("/api/files/<int:file_id>")
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
        if not (Path(app.config["UPLOAD_FOLDER"]) / row["stored_name"]).is_file():
            return error("文件不存在", 404)
        return send_from_directory(
            app.config["UPLOAD_FOLDER"],
            row["stored_name"],
            download_name=row["original_name"],
            mimetype=row["mime_type"],
            as_attachment=request.args.get("preview") != "1",
        )

    return app


def error(message, status=400):
    return jsonify({"error": message}), status


def parse_credential_metadata(form):
    title = str(form.get("title", "")).strip()[:100]
    credential_type = str(form.get("credential_type", "other")).strip()[:40]
    issuer = str(form.get("issuer", "")).strip()[:100]
    awarded_at = str(form.get("awarded_at", "")).strip()[:10]
    description = str(form.get("description", "")).strip()[:500]
    if not title:
        return None, "请填写荣誉名称"
    if not credential_type:
        return None, "请选择荣誉类型"
    return (title, credential_type, issuer, awarded_at, description), None


def credential_rows(db, where="", params=()):
    return [
        dict(row)
        for row in db.execute(
            f"""SELECT sf.id,sf.student_id,s.name student_name,s.student_no,s.grade,s.class_name,
                       sf.title,sf.credential_type,sf.issuer,sf.awarded_at,sf.description,
                       sf.original_name,sf.mime_type,sf.size,sf.status,sf.review_comment,
                       sf.reviewed_at,sf.revision,sf.uploaded_at,sf.updated_at,
                       u.display_name reviewer_name,
                       ar.analysis_status ai_analysis_status
                FROM student_files sf JOIN students s ON s.id=sf.student_id
                LEFT JOIN users u ON u.id=sf.reviewed_by
                LEFT JOIN credential_ai_reviews ar ON ar.file_id=sf.id {where}
                ORDER BY sf.updated_at DESC,sf.id DESC""",
            params,
        )
    ]


def credential_analysis_dict(row):
    result = dict(row)
    result["extracted_fields"] = json.loads(result.get("extracted_fields") or "{}")
    result["comparisons"] = json.loads(result.get("comparisons") or "[]")
    result.pop("extracted_text", None)
    result.pop("job_id", None)
    return result


def knowledge_document_rows(db, where="", params=()):
    return [
        dict(row)
        for row in db.execute(
            f"""SELECT kd.id,kd.title,kd.subject,kd.grade_level,kd.source,
                       kd.original_name,kd.mime_type,kd.size,kd.status,kd.chunk_count,
                       kd.error_message,kd.created_at,kd.updated_at,u.display_name uploader_name
                FROM knowledge_documents kd LEFT JOIN users u ON u.id=kd.uploaded_by
                {where} ORDER BY kd.updated_at DESC,kd.id DESC""",
            params,
        )
    ]


def tutor_message_dict(row):
    result = dict(row)
    result["citations"] = json.loads(result.get("citations") or "[]")
    return result


def profile_for_user(db, user_id):
    row = db.execute(
        """SELECT s.*, i.tags, i.description AS interest_description
           FROM students s LEFT JOIN interests i ON i.student_id=s.id WHERE s.user_id=?""",
        (user_id,),
    ).fetchone()
    result = dict(row)
    result["tags"] = json.loads(result.get("tags") or "[]")
    return result


def grade_rows(db, student_id):
    return [dict(row) for row in db.execute(
        "SELECT year,semester,chinese,math,english,politics FROM grades WHERE student_id=? ORDER BY year,semester",
        (student_id,),
    )]


def student_list(db, include_embedding=False):
    embedding_columns = (
        ", COALESCE(i.embedding,'') embedding, COALESCE(i.embedding_model,'') embedding_model"
        if include_embedding
        else ""
    )
    rows = db.execute(
        f"""SELECT s.id,s.student_no,s.name,s.gender,s.grade,s.class_name,s.bio,
                  COALESCE(i.tags,'[]') tags, COALESCE(i.description,'') description,
                  ROUND(AVG((g.chinese+g.math+g.english+g.politics)/4),1) average,
                  COUNT(g.id) grade_count {embedding_columns}
           FROM students s LEFT JOIN interests i ON i.student_id=s.id
           LEFT JOIN grades g ON g.student_id=s.id GROUP BY s.id ORDER BY s.student_no"""
    )
    result = []
    for row in rows:
        item = dict(row)
        item["tags_text"] = " ".join(json.loads(item["tags"] or "[]"))
        item["tags_list"] = json.loads(item["tags"] or "[]")
        result.append(item)
    return result


app = create_app()


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001, debug=True)
