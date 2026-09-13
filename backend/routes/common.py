"""Shared API responses and database row serializers."""

import json
import os
from flask import jsonify


def error(message, status=400):
    return jsonify({"error": message}), status


def env_enabled(name, default=False):
    fallback = "true" if default else "false"
    return os.getenv(name, fallback).lower() not in {"0", "false", "no"}


def admin_trace_rows(db, where="", params=(), limit=50):
    return [
        dict(row)
        for row in db.execute(
            f"""SELECT rt.*,s.name student_name,s.student_no,tc.title conversation_title
                FROM rag_traces rt
                LEFT JOIN students s ON s.id=rt.student_id
                LEFT JOIN tutor_conversations tc ON tc.id=rt.conversation_id
                {where} ORDER BY rt.created_at DESC LIMIT ?""",
            (*params, limit),
        )
    ]


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
