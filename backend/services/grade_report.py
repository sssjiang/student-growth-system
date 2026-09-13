import json
import os
from statistics import mean, pstdev
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


def _r_squared(values):
    if len(values) < 3 or len(set(values)) == 1:
        return 0.0
    xs = list(range(len(values)))
    x_bar, y_bar = mean(xs), mean(values)
    denominator = sum((x - x_bar) ** 2 for x in xs)
    slope = sum((x - x_bar) * (y - y_bar) for x, y in zip(xs, values)) / denominator
    intercept = y_bar - slope * x_bar
    residual = sum((y - (intercept + slope * x)) ** 2 for x, y in zip(xs, values))
    total = sum((y - y_bar) ** 2 for y in values)
    return round(max(0.0, min(1.0, 1 - residual / total)), 2) if total else 0.0


def calculate_metrics(grades):
    periods = [f"{row.get('year', '')}-{row.get('semester', '')}" for row in grades]
    metrics = {
        "periods": periods,
        "sample_size": len(grades),
        "subjects": {},
        "overall": {},
    }
    averages = []
    for subject, label in SUBJECTS.items():
        values = [float(row[subject]) for row in grades]
        slope, prediction = linear_regression(values)
        metrics["subjects"][subject] = {
            "label": label,
            "values": values,
            "latest": round(values[-1], 1),
            "average": round(mean(values), 1),
            "highest": round(max(values), 1),
            "lowest": round(min(values), 1),
            "change": round(values[-1] - values[0], 1),
            "slope": slope,
            "prediction": prediction,
            "volatility": round(pstdev(values), 1),
            "r_squared": _r_squared(values),
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
        "latest": period_averages[-1],
        "change": round(period_averages[-1] - period_averages[0], 1),
        "slope": overall_slope,
        "prediction": overall_prediction,
        "volatility": round(pstdev(period_averages), 1),
        "r_squared": _r_squared(period_averages),
        "trend": "up" if overall_slope > 0.8 else "down" if overall_slope < -0.8 else "stable",
    }
    metrics["data_quality"] = {
        "level": "strong" if len(grades) >= 6 else "moderate" if len(grades) >= 4 else "limited",
        "forecast_confidence": (
            "high"
            if len(grades) >= 6 and metrics["overall"]["r_squared"] >= 0.75
            else "medium"
            if len(grades) >= 4 and metrics["overall"]["r_squared"] >= 0.5
            else "low"
        ),
    }
    return metrics


def _local_report(student, metrics):
    subjects = metrics["subjects"]
    strongest_key = max(subjects, key=lambda key: subjects[key]["average"])
    fastest_key = max(subjects, key=lambda key: subjects[key]["slope"])
    attention_key = min(subjects, key=lambda key: (subjects[key]["slope"], subjects[key]["average"]))
    strongest = subjects[strongest_key]
    fastest = subjects[fastest_key]
    attention = subjects[attention_key]
    overall = metrics["overall"]
    trend_text = {"up": "稳步上升", "down": "近期承压", "stable": "整体平稳"}[overall["trend"]]
    trend_diagnosis = {
        "up": "当前方法有效，可在保持正确率的前提下逐步增加综合题训练。",
        "down": "近期走势下降，需要先区分知识缺口、练习不足和考试状态三个原因。",
        "stable": "当前表现较稳定，下一步应通过专项训练寻找新的增长点。",
    }
    subject_insights = []
    for key, item in subjects.items():
        subject_insights.append(
            {
                "subject": key,
                "label": item["label"],
                "diagnosis": (
                    f"最近成绩{item['latest']}分，阶段变化{item['change']:+.1f}分，"
                    f"整体走势为{ {'up': '上升', 'down': '下降', 'stable': '平稳'}[item['trend']] }。"
                ),
                "recommendation": trend_diagnosis[item["trend"]],
            }
        )

    tags = student.get("tags_list") or []
    interest_text = "、".join(tags[:3])
    interest_connections = [
        (
            f"可结合{interest_text}设计跨学科学习任务，用作品或讲解成果检验理解。"
            if interest_text
            else "补充学生兴趣信息后，可进一步设计与兴趣关联的学习任务。"
        )
    ]
    achievements = student.get("achievements") or []
    if achievements:
        interest_connections.append(
            f"将“{achievements[0].get('title', '已有成长成果')}”中的准备方法迁移到学科学习，形成可复用的计划与复盘习惯。"
        )

    return {
        "version": 2,
        "title": f"{student['name']}个性化学习成长报告",
        "executive_summary": (
            f"{student['name']}的综合成绩{trend_text}，历次平均分为"
            f"{overall['average']}分，按当前线性趋势下一学期预计约{overall['prediction']}分。"
        ),
        "overall_assessment": (
            f"最近一期综合均分为{overall['latest']}分，较首期变化{overall['change']:+.1f}分。"
            f"现有{metrics['sample_size']}个学期的数据，预测置信度为"
            f"{ {'high': '较高', 'medium': '中等', 'low': '有限'}[metrics['data_quality']['forecast_confidence']] }。"
        ),
        "subject_insights": subject_insights,
        "strengths": [
            f"{strongest['label']}是当前优势学科，阶段均分{strongest['average']}分。",
            f"{fastest['label']}提升速度最明显，平均每学期变化{fastest['slope']}分。",
        ],
        "focus_areas": [
            f"优先关注{attention['label']}，当前趋势斜率为{attention['slope']}，先定位影响成绩的具体题型。",
            "预测不能替代日常作业、课堂表现和考试难度信息，后续评估应结合这些证据。",
        ],
        "action_plan": [
            {
                "timeframe": "未来2周",
                "goal": f"确认{attention['label']}的主要失分来源",
                "actions": ["整理最近两次测评错题", "按知识点和错误原因分类", "完成一次同类题回测"],
                "success_measure": "同类题二次作答正确率达到80%以上。",
            },
            {
                "timeframe": "未来1个月",
                "goal": "建立稳定、可检查的学习节奏",
                "actions": ["每周完成一次错题复盘", "记录四科投入时间与完成质量", "月底进行一次阶段小测"],
                "success_measure": "计划完成率达到85%，重点学科成绩不低于最近一期。",
            },
            {
                "timeframe": "下学期",
                "goal": f"巩固{strongest['label']}优势并改善学科均衡",
                "actions": ["保留优势学科有效方法", "每月比较目标与实际成绩", "根据新成绩重新生成报告"],
                "success_measure": "综合成绩保持稳定上升，薄弱学科与个人平均分差距缩小。",
            },
        ],
        "interest_connections": interest_connections,
        "teacher_notes": [
            "与学生共同确认行动计划，优先选择一项最容易开始的任务。",
            "两周后用错题回测和课堂表现复核建议是否有效，再决定是否调整。",
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
    for key in ("title", "executive_summary", "overall_assessment", "disclaimer"):
        if not isinstance(report.get(key), str) or not report[key].strip():
            raise ValueError(f"AI report field {key} is invalid")
    for key in ("strengths", "focus_areas", "interest_connections", "teacher_notes"):
        values = report.get(key)
        if not isinstance(values, list) or not values or not all(
            isinstance(item, str) and item.strip() for item in values
        ):
            raise ValueError(f"AI report field {key} is invalid")
    subject_insights = report.get("subject_insights")
    expected_subjects = set(SUBJECTS)
    if (
        not isinstance(subject_insights, list)
        or {item.get("subject") for item in subject_insights if isinstance(item, dict)} != expected_subjects
        or any(
            not all(isinstance(item.get(key), str) and item[key].strip() for key in ("label", "diagnosis", "recommendation"))
            for item in subject_insights
        )
    ):
        raise ValueError("AI report field subject_insights is invalid")
    action_plan = report.get("action_plan")
    if not isinstance(action_plan, list) or len(action_plan) < 2:
        raise ValueError("AI report field action_plan is invalid")
    for item in action_plan:
        if not isinstance(item, dict) or not all(
            isinstance(item.get(key), str) and item[key].strip()
            for key in ("timeframe", "goal", "success_measure")
        ):
            raise ValueError("AI report action_plan item is invalid")
        if not isinstance(item.get("actions"), list) or not all(
            isinstance(action, str) and action.strip() for action in item["actions"]
        ):
            raise ValueError("AI report action_plan actions are invalid")
    return {
        "version": 2,
        **{
            key: report[key]
            for key in (
                "title",
                "executive_summary",
                "overall_assessment",
                "subject_insights",
                "strengths",
                "focus_areas",
                "action_plan",
                "interest_connections",
                "teacher_notes",
                "disclaimer",
            )
        },
    }


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
                    "你是一名有经验的中学学业分析与成长辅导老师。只依据输入的学生资料和程序统计结果"
                    "撰写中文报告，不得修改、重新计算或虚构任何分数、趋势或预测。不要使用空泛鼓励，"
                    "每个判断都要能对应输入证据，每项建议都要包含具体动作或检查标准。"
                    "输出一个JSON对象，必须包含：title、executive_summary、overall_assessment、"
                    "subject_insights、strengths、focus_areas、action_plan、interest_connections、"
                    "teacher_notes、disclaimer。subject_insights必须覆盖chinese、math、english、politics，"
                    "每项包含subject、label、diagnosis、recommendation。action_plan至少两项，每项包含"
                    "timeframe、goal、actions字符串数组、success_measure。strengths、focus_areas、"
                    "interest_connections、teacher_notes均为非空字符串数组。不要输出Markdown。"
                ),
            },
            {
                "role": "user",
                "content": (
                    f"学生姓名：{student['name']}\n"
                    f"学生资料：{json.dumps({key: student.get(key) for key in ('grade', 'class_name', 'tags_list', 'interest_description', 'achievements')}, ensure_ascii=False)}\n"
                    f"程序统计结果：{json.dumps(metrics, ensure_ascii=False)}"
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
