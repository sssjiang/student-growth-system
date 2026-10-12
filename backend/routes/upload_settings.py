"""Upload policy APIs and per-request enforcement shared by upload endpoints."""

import os

from flask import Blueprint, g, jsonify, request
from werkzeug.exceptions import RequestEntityTooLarge

from routes.security import token_required
from services.upload_settings import (
    MAX_UPLOAD_MB, MB, MIN_UPLOAD_MB, get_upload_limits, save_upload_limits,
)

bp = Blueprint("upload_settings", __name__)
UPLOAD_ENDPOINTS = {
    "student_files.student_files": "credential",
    "student_files.resubmit_student_file": "credential",
    "knowledge.teacher_knowledge": "knowledge",
    "grades.import_grades": "grades",
}


@bp.get("/api/upload-limits")
@token_required("student", "teacher", "admin")
def upload_limits():
    return jsonify({
        "upload_limits": get_upload_limits(),
        "min_mb": MIN_UPLOAD_MB,
        "max_mb": MAX_UPLOAD_MB,
    })


@bp.put("/api/admin/settings/upload-limits")
@token_required("admin")
def update_upload_limits():
    try:
        limits = save_upload_limits(request.get_json(silent=True), g.user["id"])
    except ValueError as exc:
        return jsonify({"error": str(exc), "code": "INVALID_UPLOAD_LIMITS"}), 400
    return jsonify({"upload_limits": limits})


def configure_upload_request():
    category = UPLOAD_ENDPOINTS.get(request.endpoint)
    if category and request.method == "POST":
        g.upload_category = category
        g.upload_limit_mb = get_upload_limits()[category]
        # Multipart boundaries and metadata do not count towards the file limit.
        # Set the limit on this request, never mutate shared app configuration.
        request.max_content_length = (g.upload_limit_mb + 1) * MB


def enforce_upload_limit(uploaded):
    stream = uploaded.stream
    position = stream.tell()
    stream.seek(0, os.SEEK_END)
    size = stream.tell()
    stream.seek(position)
    if size > g.upload_limit_mb * MB:
        raise RequestEntityTooLarge()


def upload_size_error():
    if hasattr(g, "upload_limit_mb"):
        return jsonify({
            "error": f"文件不能超过 {g.upload_limit_mb}MB",
            "code": "FILE_TOO_LARGE",
            "details": {"limit_mb": g.upload_limit_mb, "category": g.upload_category},
        }), 413
    return jsonify({"error": "请求体过大", "code": "REQUEST_TOO_LARGE"}), 413
