import json
import math
import os
import re
from collections import Counter


_model = None
_model_failed = False

SYNONYMS = {
    "运动": "篮球 足球 羽毛球 跑步 田径 健身 体育 团队 协作",
    "体育": "运动 篮球 足球 羽毛球 跑步 田径 健身",
    "科技": "编程 机器人 人工智能 科学 数学 电脑 创客",
    "艺术": "绘画 摄影 设计 音乐 舞蹈 书法 戏剧",
    "公益": "志愿者 社区 服务 环保 助人 公益",
    "主持": "演讲 辩论 朗诵 广播 表达 主持",
    "写作": "阅读 文学 小说 诗歌 记者 编辑 写作",
}


def _load_model():
    global _model, _model_failed
    if _model is not None or _model_failed:
        return _model
    try:
        from sentence_transformers import SentenceTransformer

        _model = SentenceTransformer(
            os.getenv("EMBEDDING_MODEL", "paraphrase-multilingual-MiniLM-L12-v2")
        )
    except Exception:
        _model_failed = True
    return _model


def _expand(text: str) -> str:
    expanded = text.lower()
    for key, related in SYNONYMS.items():
        if key in expanded:
            expanded += " " + related
    return expanded


def _tokens(text: str):
    text = _expand(text)
    latin = re.findall(r"[a-z0-9]+", text)
    chinese = re.findall(r"[\u4e00-\u9fff]", text)
    bigrams = ["".join(chinese[i : i + 2]) for i in range(len(chinese) - 1)]
    return latin + chinese + bigrams


def _cosine(left: Counter, right: Counter) -> float:
    common = set(left) & set(right)
    dot = sum(left[token] * right[token] for token in common)
    norm_left = math.sqrt(sum(value * value for value in left.values()))
    norm_right = math.sqrt(sum(value * value for value in right.values()))
    return dot / (norm_left * norm_right) if norm_left and norm_right else 0.0


def encode_interest(text: str):
    model = _load_model()
    if model:
        return model.encode(text, normalize_embeddings=True).tolist()
    return None


def search_students(query: str, students: list[dict], limit: int = 20):
    model = _load_model()
    corpus = [f"{item.get('tags_text', '')} {item.get('description', '')}" for item in students]
    if model and corpus:
        vectors = model.encode([query, *corpus], normalize_embeddings=True)
        query_vector = vectors[0]
        scores = [float(query_vector @ vector) for vector in vectors[1:]]
        engine = "sentence-transformers"
    else:
        query_tokens = Counter(_tokens(query))
        scores = [_cosine(query_tokens, Counter(_tokens(text))) for text in corpus]
        engine = "local-keyword-fallback"

    ranked = []
    for item, score in zip(students, scores):
        result = dict(item)
        result["score"] = round(max(0.0, score), 4)
        result["match_reason"] = _match_reason(query, item)
        ranked.append(result)
    ranked.sort(key=lambda item: item["score"], reverse=True)
    if engine == "local-keyword-fallback":
        matched = [item for item in ranked if item["score"] > 0]
        ranked = matched or ranked[:3]
    return ranked[: max(1, min(limit, 50))], engine


def _match_reason(query: str, student: dict) -> str:
    tags = json.loads(student.get("tags") or "[]")
    matched = [tag for tag in tags if any(t in _tokens(query) for t in _tokens(tag))]
    if matched:
        return f"兴趣标签匹配：{'、'.join(matched[:3])}"
    if tags:
        return f"兴趣语义相近：{'、'.join(tags[:3])}"
    return "个人描述与活动需求语义相近"
