import os
from contextlib import contextmanager


def _enabled(value):
    return str(value or "").lower() in {"1", "true", "yes"}


def langfuse_settings():
    public_key = os.getenv("LANGFUSE_PUBLIC_KEY", "").strip()
    secret_key = os.getenv("LANGFUSE_SECRET_KEY", "").strip()
    return {
        "enabled": _enabled(os.getenv("LANGFUSE_ENABLED"))
        and bool(public_key and secret_key),
        "configured": bool(public_key and secret_key),
        "base_url": os.getenv("LANGFUSE_BASE_URL", "https://cloud.langfuse.com").rstrip("/"),
        "environment": os.getenv("LANGFUSE_TRACING_ENVIRONMENT", "development"),
        "project_id": os.getenv("LANGFUSE_PROJECT_ID", "").strip(),
    }


class TutorTrace:
    def __init__(self, client=None, callback=None, root=None, trace_id=""):
        self.client = client
        self.callback = callback
        self.root = root
        self.trace_id = trace_id

    @property
    def callbacks(self):
        return [self.callback] if self.callback else []

    def update(self, **values):
        if not self.root:
            return
        try:
            self.root.update(**values)
        except Exception:
            pass

    @contextmanager
    def retrieval(self, question, candidate_count):
        if not self.client:
            yield None
            return
        manager = None
        observation = None
        try:
            manager = self.client.start_as_current_observation(
                as_type="retriever",
                name="retrieve-textbook-chunks",
                input={"question": question, "candidate_count": candidate_count},
            )
            observation = manager.__enter__()
        except Exception:
            manager = None
        try:
            yield observation
        finally:
            if manager:
                try:
                    manager.__exit__(None, None, None)
                except Exception:
                    pass


@contextmanager
def trace_tutor_request(trace_id, student_id, conversation_id, subject, question):
    settings = langfuse_settings()
    if not settings["enabled"]:
        yield TutorTrace()
        return

    root_manager = attributes_manager = None
    try:
        from langfuse import get_client, propagate_attributes
        from langfuse.langchain import CallbackHandler

        client = get_client()
        root_manager = client.start_as_current_observation(
            as_type="agent",
            name="student-tutor",
            trace_context={"trace_id": trace_id},
            input={"question": question, "subject": subject},
        )
        root = root_manager.__enter__()
        attributes_manager = propagate_attributes(
            trace_name="student-tutor",
            user_id=f"student:{student_id}",
            session_id=f"conversation:{conversation_id}",
            tags=["rag", "student-tutor", subject],
            metadata={"subject": subject},
        )
        attributes_manager.__enter__()
        callback = CallbackHandler()
    except Exception:
        if attributes_manager:
            try:
                attributes_manager.__exit__(None, None, None)
            except Exception:
                pass
        if root_manager:
            try:
                root_manager.__exit__(None, None, None)
            except Exception:
                pass
        yield TutorTrace()
        return

    trace = TutorTrace(client, callback, root, trace_id)
    try:
        yield trace
    finally:
        if attributes_manager:
            try:
                attributes_manager.__exit__(None, None, None)
            except Exception:
                pass
        if root_manager:
            try:
                root_manager.__exit__(None, None, None)
            except Exception:
                pass


def traced_openai_class(default):
    if not langfuse_settings()["enabled"]:
        return default
    try:
        from langfuse.openai import OpenAI as LangfuseOpenAI

        return LangfuseOpenAI
    except Exception:
        return default
