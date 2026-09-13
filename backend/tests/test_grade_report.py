import unittest
from unittest.mock import patch

from services.grade_report import calculate_metrics, generate_report, linear_regression


class GradeReportTest(unittest.TestCase):
    def test_regression_predicts_next_value(self):
        slope, prediction = linear_regression([70, 75, 80, 85])
        self.assertEqual(slope, 5.0)
        self.assertEqual(prediction, 90.0)

    def test_prediction_is_bounded(self):
        self.assertEqual(linear_regression([95, 100])[1], 100.0)
        self.assertEqual(linear_regression([5, 0])[1], 0.0)

    def test_metrics_keep_source_scores(self):
        grades = [
            {"chinese": 80, "math": 70, "english": 90, "politics": 75},
            {"chinese": 85, "math": 75, "english": 92, "politics": 80},
        ]
        result = calculate_metrics(grades)
        self.assertEqual(result["subjects"]["chinese"]["change"], 5.0)
        self.assertEqual(result["subjects"]["english"]["prediction"], 94.0)
        self.assertEqual(result["subjects"]["math"]["latest"], 75.0)
        self.assertEqual(result["data_quality"]["forecast_confidence"], "low")

    def test_langgraph_uses_local_report_when_ai_is_disabled(self):
        grades = [
            {"chinese": 80, "math": 70, "english": 90, "politics": 75},
            {"chinese": 85, "math": 75, "english": 92, "politics": 80},
        ]
        with patch.dict("os.environ", {"AI_REPORT_ENABLED": "false"}):
            report, metrics, source = generate_report({"name": "测试学生"}, grades)
        self.assertEqual(source, "local")
        self.assertEqual(report["version"], 2)
        self.assertIn("测试学生", report["executive_summary"])
        self.assertEqual(len(report["subject_insights"]), 4)
        self.assertGreaterEqual(len(report["action_plan"]), 2)
        self.assertEqual(metrics["overall"]["prediction"], 87.2)

    @patch("services.grade_report._request_ai_report")
    def test_langgraph_uses_openai_compatible_provider(self, request_report):
        request_report.return_value = {
            "version": 2,
            "title": "测试学生个性化学习成长报告",
            "executive_summary": "综合表现稳步提升。",
            "overall_assessment": "现有成绩走势稳定。",
            "subject_insights": [],
            "strengths": ["数学保持进步。"],
            "focus_areas": ["继续关注基础题正确率。"],
            "action_plan": [],
            "interest_connections": ["结合兴趣完成学习任务。"],
            "teacher_notes": ["两周后复核学习效果。"],
            "disclaimer": "预测仅供教学参考。",
        }
        grades = [
            {"chinese": 80, "math": 70, "english": 90, "politics": 75},
            {"chinese": 85, "math": 75, "english": 92, "politics": 80},
        ]
        env = {
            "AI_REPORT_ENABLED": "true",
            "LongCat_API_KEY": "test-key",
            "LongCat_MODEL": "test-model",
        }
        with patch.dict("os.environ", env, clear=True):
            report, _, source = generate_report({"name": "测试学生"}, grades)
        self.assertEqual(source, "langgraph-openai")
        self.assertEqual(report["executive_summary"], "综合表现稳步提升。")
        request_report.assert_called_once()


if __name__ == "__main__":
    unittest.main()
