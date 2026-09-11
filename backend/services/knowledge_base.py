import json
import math
import re
from collections import Counter

from services.semantic_search import embedding_model_name, encode_interest, encode_texts


SUBJECTS = {"chinese", "math", "english", "politics"}


def split_document(text, max_chars=1200, overlap_chars=120):
    """Split on paragraphs first and retain a small tail when a section is long."""
    paragraphs = [item.strip() for item in re.split(r"\n\s*\n|\r\n\s*\r\n", text) if item.strip()]
    if not paragraphs:
        paragraphs = [item.strip() for item in text.splitlines() if item.strip()]
    chunks, current = [], ""
    for paragraph in paragraphs:
        if len(paragraph) > max_chars:
            long_section = f"{current}\n\n{paragraph}".strip()
            current = ""
            start = 0
            while start < len(long_section):
                chunks.append(long_section[start : start + max_chars])
                start += max_chars - overlap_chars
            continue
        candidate = f"{current}\n\n{paragraph}".strip()
        if current and len(candidate) > max_chars:
            chunks.append(current)
            tail = current[-overlap_chars:] if overlap_chars else ""
            current = f"{tail}\n\n{paragraph}".strip()
        else:
            current = candidate
    if current:
        chunks.append(current)
    return [item for item in chunks if len(item.strip()) >= 20]


def create_chunk_records(text):
    chunks = split_document(text)
    embeddings = encode_texts(chunks)
    records = []
    for position, content in enumerate(chunks):
        first_line = content.splitlines()[0].strip()
        heading = first_line[:100] if len(first_line) <= 100 else ""
        embedding = embeddings[position] if embeddings else None
        records.append(
            (
                position,
                heading,
                content,
                json.dumps(embedding) if embedding else None,
                embedding_model_name() if embedding else "",
            )
        )
    return records


def _tokens(text):
    normalized = str(text).lower()
    latin = re.findall(r"[a-z0-9]+", normalized)
    chinese = re.findall(r"[\u4e00-\u9fff]", normalized)
    return latin + chinese + ["".join(chinese[i : i + 2]) for i in range(len(chinese) - 1)]


def _keyword_score(query, content):
    left, right = Counter(_tokens(query)), Counter(_tokens(content))
    common = set(left) & set(right)
    dot = sum(left[token] * right[token] for token in common)
    denominator = math.sqrt(sum(v * v for v in left.values())) * math.sqrt(
        sum(v * v for v in right.values())
    )
    return dot / denominator if denominator else 0.0


def _stored_embedding(value, model_name, expected_model, dimensions):
    if model_name != expected_model:
        return None
    try:
        vector = json.loads(value or "")
        if len(vector) == dimensions and all(isinstance(item, (int, float)) for item in vector):
            return vector
    except (TypeError, ValueError, json.JSONDecodeError):
        pass
    return None


def retrieve_chunks(query, rows, limit=5):
    if not rows:
        return []
    query_vector = encode_interest(query)
    expected_model = embedding_model_name()
    ranked = []
    for row in rows:
        item = dict(row)
        keyword = _keyword_score(query, item["content"])
        vector = (
            _stored_embedding(
                item.get("embedding"),
                item.get("embedding_model"),
                expected_model,
                len(query_vector),
            )
            if query_vector
            else None
        )
        semantic = (
            sum(left * right for left, right in zip(query_vector, vector))
            if vector
            else 0.0
        )
        item["score"] = round(0.65 * max(semantic, 0) + 0.35 * keyword, 4)
        item.pop("embedding", None)
        item.pop("embedding_model", None)
        ranked.append(item)
    ranked.sort(key=lambda item: item["score"], reverse=True)
    useful = [item for item in ranked if item["score"] > 0]
    return (useful or ranked)[:limit]
