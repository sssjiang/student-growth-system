import json
import os
from statistics import mean


SUBJECTS = {
    "chinese": "语文",
    "math": "数学",
    "english": "英语",
    "politics": "政治",
}


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


def generate_report(student, grades):
    metrics = calculate_metrics(grades)
    local = _local_report(student, metrics)
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        return local, metrics, "local"
    try:
        from anthropic import Anthropic

        prompt = (
            "请只依据给定统计数据，用中文输出JSON，字段为summary字符串、highlights字符串数组、"
            "suggestions字符串数组、disclaimer字符串。不得改写或虚构任何数字。\n"
            f"学生：{student['name']}\n统计：{json.dumps(metrics, ensure_ascii=False)}"
        )
        response = Anthropic(api_key=api_key).messages.create(
            model=os.getenv("CLAUDE_MODEL", "claude-sonnet-4-5-20250929"),
            max_tokens=1200,
            temperature=0.2,
            messages=[{"role": "user", "content": prompt}],
        )
        text = response.content[0].text.strip()
        if text.startswith("```"):
            text = text.split("\n", 1)[1].rsplit("```", 1)[0]
        return json.loads(text), metrics, "claude"
    except Exception:
        return local, metrics, "local-fallback"
