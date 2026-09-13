import os
from datetime import datetime, timezone
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR.parent / ".env")

from flask import Flask, jsonify
from flask_cors import CORS
from werkzeug.security import generate_password_hash

from database import get_db, init_db
from routes import register_routes
from routes.common import error
from services.file_storage import LocalFileStorage

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
    app.extensions["file_storage"] = LocalFileStorage(app.config["UPLOAD_FOLDER"])
    init_db()
    with get_db() as db:
        db.execute(
            """INSERT INTO admin_users(username,password_hash,display_name)
               VALUES(?,?,?) ON CONFLICT(username) DO NOTHING""",
            (
                os.getenv("ADMIN_USERNAME", "admin"),
                generate_password_hash(os.getenv("ADMIN_PASSWORD", "admin123")),
                os.getenv("ADMIN_DISPLAY_NAME", "系统管理员"),
            ),
        )

    @app.errorhandler(413)
    def too_large(_):
        return error("文件不能超过 10MB", 413)

    @app.get("/api/health")
    def health():
        return jsonify({"status": "ok", "time": datetime.now(timezone.utc).isoformat()})


    register_routes(app)
    return app


app = create_app()


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001, debug=True)
