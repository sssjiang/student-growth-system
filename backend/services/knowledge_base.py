import json
import math
import re
from collections import Counter

from langchain_text_splitters import RecursiveCharacterTextSplitter

from services.semantic_search import embedding_model_name, encode_interest, encode_texts


SUBJECTS = {"chinese", "math", "english", "politics"}

# Prefer document and sentence boundaries before falling back to individual
# characters. Chinese punctuation is included explicitly because textbook text
# often has no spaces between sentences.
TEXTBOOK_SEPARATORS = [
    "\n\n",
    "\n",
    "。",
    "！",
    "？",
    "；",
    ". ",
    "! ",
    "? ",
    "; ",
    "，",
    ", ",
    " ",
    "",
]


def split_document(text, max_chars=1200, overlap_chars=120):
    """Split textbook text recursively while preserving natural boundaries."""
    content = str(text or "").strip()
    if not content:
        return []
    if max_chars <= 0:
        raise ValueError("max_chars must be greater than zero")
    if overlap_chars < 0 or overlap_chars >= max_chars:
        raise ValueError("overlap_chars must be between zero and max_chars")

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=max_chars,
        chunk_overlap=overlap_chars,
        separators=TEXTBOOK_SEPARATORS,
        keep_separator="end",
        length_function=len,
        strip_whitespace=True,
    )
    # Keep short headings and concise facts. Dropping them here loses useful
    # section context and can make a short document impossible to index.
    return [chunk for chunk in splitter.split_text(content) if chunk.strip()]


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
