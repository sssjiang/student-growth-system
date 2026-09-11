import json
import os
from statistics import mean
from typing import Any, TypedDict

from langgraph.graph import END, START, StateGraph
from openai import OpenAI


SUBJECTS = {
    "chinese": "语文",
    "math": "数学",
    "english": "英语",
    "politics": "政治",
}


class ReportState(TypedDict, total=False):
    student: dict[str, Any]
    grades: list[dict[str, Any]]
    metrics: dict[str, Any]
    report: dict[str, Any]
    generated_by: str
    ai_error: str


def linear_regression(values):
    if len(values) < 2:
        return 0.0, values[-1] if values else 0.0
    xs = list(range(len(values)))
    x_bar, y_bar = mean(xs), mean(values)
    denominator = sum((x - x_bar) ** 2 for x in xs)
    slope = sum((x - x_bar) * (y - y_bar) for x, y in zip(xs, values)) / denominator
    prediction = max(0.0, min(100.0, values[-1] + slope))
    return round(slope, 2), round(prediction, 1)


def calculate_metrics(grades):
    metrics = {"subjects": {}, "overall": {}}
    averages = []
    for subject, label in SUBJECTS.items():
        values = [float(row[subject]) for row in grades]
        slope, prediction = linear_regression(values)
        metrics["subjects"][subject] = {
            "label": label,
            "values": values,
            "average": round(mean(values), 1),
            "change": round(values[-1] - values[0], 1),
            "slope": slope,
            "prediction": prediction,
            "trend": "up" if slope > 0.8 else "down" if slope < -0.8 else "stable",
        }
        averages.append(metrics["subjects"][subject]["average"])
    period_averages = [
        round(mean(float(row[key]) for key in SUBJECTS), 1) for row in grades
    ]
    overall_slope, overall_prediction = linear_regression(period_averages)
    metrics["overall"] = {
        "average": round(mean(averages), 1),
        "period_averages": period_averages,
        "slope": overall_slope,
        "prediction": overall_prediction,
        "trend": "up" if overall_slope > 0.8 else "down" if overall_slope < -0.8 else "stable",
    }
    return metrics


def _local_report(student, metrics):
    subjects = metrics["subjects"]
    strongest = max(subjects.values(), key=lambda item: item["average"])
    fastest = max(subjects.values(), key=lambda item: item["slope"])
    attention = min(subjects.values(), key=lambda item: item["slope"])
    overall = metrics["overall"]
    trend_text = {"up": "稳步上升", "down": "近期承压", "stable": "整体平稳"}[overall["trend"]]
    suggestion = (
        f"保持{strongest['label']}的优势学习节奏；为{attention['label']}建立每周错题复盘，"
        "每两周用一次同难度小测检查调整效果。"
    )
    return {
        "summary": (
            f"{student['name']}的综合成绩{trend_text}，历次平均分为"
            f"{overall['average']}分，按当前线性趋势下一学期预计约{overall['prediction']}分。"
        ),
        "highlights": [
            f"{strongest['label']}是当前优势学科，阶段均分{strongest['average']}分。",
            f"{fastest['label']}提升速度最明显，平均每学期变化{fastest['slope']}分。",
            f"{attention['label']}需要重点关注，趋势斜率为{attention['slope']}。",
        ],
        "suggestions": [
            suggestion,
            "把目标拆成可观测的小任务：课后订正、周复盘、月度同类题回测。",
            "结合兴趣安排项目式学习，并在下次成绩录入后重新生成报告。",
        ],
        "disclaimer": "预测基于现有历史成绩的简单线性回归，仅用于教学参考。",
    }


def _first_env(*names):
    for name in names:
        value = os.getenv(name, "").strip()
        if value:
            return value
    return ""


def _normalize_base_url(value):
    value = value.rstrip("/")
    for suffix in ("/chat/completions", "/responses"):
        if value.endswith(suffix):
            return value[: -len(suffix)]
    return value


def _model_config():
    enabled = os.getenv("AI_REPORT_ENABLED", "true").lower() not in {"0", "false", "no"}
    api_key = _first_env("OPENAI_API_KEY", "LongCat_API_KEY")
    base_url = _normalize_base_url(
        _first_env("OPENAI_BASE_URL", "OPENAI_ENDPOINT", "OpenAI_endpoint")
    )
    model = _first_env("OPENAI_MODEL", "LongCat_MODEL")
    return {
        "api_key": api_key if enabled else "",
        "base_url": base_url,
        "model": model,
    }


def _calculate_node(state: ReportState):
    return {"metrics": calculate_metrics(state["grades"])}


def _fallback_node(state: ReportState):
    return {
        "report": _local_report(state["student"], state["metrics"]),
        "generated_by": "local",
    }


def _next_after_fallback(state: ReportState):
    config = _model_config()
    return "generate_ai" if config["api_key"] and config["model"] else "finish"


def _parse_report(content):
    text = content.strip()
    if text.startswith("```"):
        text = text.split("\n", 1)[1].rsplit("```", 1)[0]
    report = json.loads(text)
    if not isinstance(report, dict):
        raise ValueError("AI report must be a JSON object")
    for key in ("summary", "disclaimer"):
        if not isinstance(report.get(key), str) or not report[key].strip():
            raise ValueError(f"AI report field {key} is invalid")
    for key in ("highlights", "suggestions"):
        values = report.get(key)
        if not isinstance(values, list) or not values or not all(
            isinstance(item, str) and item.strip() for item in values
        ):
            raise ValueError(f"AI report field {key} is invalid")
    return {key: report[key] for key in ("summary", "highlights", "suggestions", "disclaimer")}


def _request_ai_report(student, metrics, config):
    client_options = {"api_key": config["api_key"]}
    if config["base_url"]:
        client_options["base_url"] = config["base_url"]
    client = OpenAI(**client_options)
    response = client.chat.completions.create(
        model=config["model"],
        temperature=0.2,
        response_format={"type": "json_object"},
        messages=[
            {
                "role": "system",
                "content": (
                    "你是学生成长分析助手。只依据程序已经计算好的统计数据生成中文报告，"
                    "不得修改、重新计算或虚构任何成绩数字。输出JSON对象，且只包含summary、"
                    "highlights、suggestions、disclaimer四个字段；highlights和suggestions是字符串数组。"
                    "建议应具体、友善、可执行，预测免责声明必须说明结果仅供教学参考。"
                ),
            },
            {
                "role": "user",
                "content": (
                    f"学生姓名：{student['name']}\n"
                    f"成绩统计：{json.dumps(metrics, ensure_ascii=False)}"
                ),
            },
        ],
    )
    content = response.choices[0].message.content
    if not content:
        raise ValueError("AI response is empty")
    return _parse_report(content)


def _generate_ai_node(state: ReportState):
    try:
        report = _request_ai_report(state["student"], state["metrics"], _model_config())
        return {"report": report, "generated_by": "langgraph-openai"}
    except Exception as exc:
        return {
            "generated_by": "local-fallback",
            "ai_error": type(exc).__name__,
        }


def _build_report_graph():
    builder = StateGraph(ReportState)
    builder.add_node("calculate_metrics", _calculate_node)
    builder.add_node("prepare_fallback", _fallback_node)
    builder.add_node("generate_ai", _generate_ai_node)
    builder.add_edge(START, "calculate_metrics")
    builder.add_edge("calculate_metrics", "prepare_fallback")
    builder.add_conditional_edges(
        "prepare_fallback",
        _next_after_fallback,
        {"generate_ai": "generate_ai", "finish": END},
    )
    builder.add_edge("generate_ai", END)
    return builder.compile()


REPORT_GRAPH = _build_report_graph()


def generate_report(student, grades):
    result = REPORT_GRAPH.invoke({"student": student, "grades": grades})
    return result["report"], result["metrics"], result["generated_by"]
