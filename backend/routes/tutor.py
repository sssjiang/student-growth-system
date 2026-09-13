"""tutor API endpoints."""

import json
import os
import time
import uuid

from flask import Blueprint, g, jsonify, request

from database import get_db
from routes.common import error, grade_rows, tutor_message_dict
from routes.security import token_required
from services.knowledge_base import SUBJECTS, retrieve_chunks
from services.observability import trace_tutor_request
from services.tutor import generate_tutor_reply


bp = Blueprint("tutor", __name__)



@bp.get("/api/student/tutor/conversations")
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


@bp.get("/api/student/tutor/conversations/<int:conversation_id>")
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


@bp.post("/api/student/tutor/chat")
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

    started_at = time.perf_counter()
    trace_id = uuid.uuid4().hex
    with trace_tutor_request(
        trace_id,
        student["id"],
        conversation_id,
        subject,
        question,
    ) as trace:
        with trace.retrieval(question, len(candidates)) as retrieval:
            ranked_chunks = retrieve_chunks(question, candidates, limit=20)
            chunks = ranked_chunks[:5]
            if retrieval:
                try:
                    retrieval.update(
                        output=[
                            {
                                "rank": index,
                                "chunk_id": chunk.get("id"),
                                "title": chunk.get("title", ""),
                                "heading": chunk.get("heading", ""),
                                "semantic_score": chunk.get("semantic_score", 0),
                                "keyword_score": chunk.get("keyword_score", 0),
                                "final_score": chunk.get("score", 0),
                                "selected": index <= 5,
                                "content": chunk.get("content", "")[:2000],
                            }
                            for index, chunk in enumerate(ranked_chunks, 1)
                        ]
                    )
                except Exception:
                    pass
        answer, citations, generated_by = generate_tutor_reply(
            dict(student),
            subject,
            question,
            chunks,
            history,
            grades,
            callbacks=trace.callbacks,
        )
        trace.update(
            output={
                "answer": answer,
                "generated_by": generated_by,
                "selected_count": len(chunks),
            }
        )
        langfuse_trace_id = trace.trace_id
    duration_ms = round((time.perf_counter() - started_at) * 1000)
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
        db.execute(
            """INSERT INTO rag_traces(
               id,conversation_id,message_id,student_id,subject,question,
               candidate_count,retrieved_count,selected_count,generated_by,
               model_name,duration_ms,status,langfuse_trace_id
               ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
            (
                trace_id,
                conversation_id,
                message.lastrowid,
                student["id"],
                subject,
                question,
                len(candidates),
                len(ranked_chunks),
                len(chunks),
                generated_by,
                os.getenv("OPENAI_MODEL") or os.getenv("LongCat_MODEL", ""),
                duration_ms,
                "completed",
                langfuse_trace_id,
            ),
        )
        db.executemany(
            """INSERT INTO rag_trace_chunks(
               trace_id,chunk_id,rank,semantic_score,keyword_score,final_score,
               selected,document_title,heading,content_snapshot
               ) VALUES(?,?,?,?,?,?,?,?,?,?)""",
            [
                (
                    trace_id,
                    chunk.get("id"),
                    index,
                    chunk.get("semantic_score", 0),
                    chunk.get("keyword_score", 0),
                    chunk.get("score", 0),
                    1 if index <= 5 else 0,
                    chunk.get("title", ""),
                    chunk.get("heading", ""),
                    chunk.get("content", "")[:4000],
                )
                for index, chunk in enumerate(ranked_chunks, 1)
            ],
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
