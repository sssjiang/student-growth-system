import unittest

from services.grade_report import calculate_metrics, linear_regression


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


if __name__ == "__main__":
    unittest.main()
