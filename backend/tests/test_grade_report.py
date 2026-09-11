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

    def test_langgraph_uses_local_report_when_ai_is_disabled(self):
        grades = [
            {"chinese": 80, "math": 70, "english": 90, "politics": 75},
            {"chinese": 85, "math": 75, "english": 92, "politics": 80},
        ]
        with patch.dict("os.environ", {"AI_REPORT_ENABLED": "false"}):
            report, metrics, source = generate_report({"name": "测试学生"}, grades)
        self.assertEqual(source, "local")
        self.assertIn("测试学生", report["summary"])
        self.assertEqual(metrics["overall"]["prediction"], 87.2)

    @patch("services.grade_report._request_ai_report")
    def test_langgraph_uses_openai_compatible_provider(self, request_report):
        request_report.return_value = {
            "summary": "综合表现稳步提升。",
            "highlights": ["数学保持进步。"],
            "suggestions": ["继续进行错题复盘。"],
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
        self.assertEqual(report["summary"], "综合表现稳步提升。")
        request_report.assert_called_once()


if __name__ == "__main__":
    unittest.main()
