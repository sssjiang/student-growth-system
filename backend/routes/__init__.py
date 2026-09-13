"""Register the application API by business domain."""


def register_routes(app):
    from routes import (
        admin, auth, credentials, grades, knowledge, student, student_files, teacher, tutor,
    )

    for module in (
        auth, student, student_files, admin, teacher, credentials, grades, knowledge, tutor,
    ):
        app.register_blueprint(module.bp)
