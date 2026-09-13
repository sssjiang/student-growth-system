"""JWT authentication and role checks shared by all blueprints."""

from functools import wraps

import jwt
from flask import current_app, g, request

from database import get_db
from routes.common import error


def token_required(*roles):
    def decorator(view):
        @wraps(view)
        def wrapped(*args, **kwargs):
            value = request.headers.get("Authorization", "")
            if not value.startswith("Bearer "):
                return error("请先登录", 401)
            try:
                payload = jwt.decode(
                    value[7:], current_app.config["SECRET_KEY"], algorithms=["HS256"]
                )
            except jwt.ExpiredSignatureError:
                return error("登录已过期，请重新登录", 401)
            except jwt.InvalidTokenError:
                return error("无效的登录凭证", 401)
            with get_db() as db:
                if payload.get("role") == "admin":
                    user = db.execute(
                        """SELECT id,username,'admin' role,display_name
                           FROM admin_users WHERE id=?""",
                        (payload.get("sub"),),
                    ).fetchone()
                else:
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
