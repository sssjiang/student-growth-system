import unittest
from unittest.mock import patch

from services.credential_analysis import analyze_credential, compare_fields


CREDENTIAL = {
    "student_name": "林晓雨",
    "title": "校园摄影大赛一等奖",
    "issuer": "学校艺术中心",
    "awarded_at": "2026-05-20",
    "credential_type": "艺术活动",
    "mime_type": "application/pdf",
}


class CredentialAnalysisTest(unittest.TestCase):
    def test_comparison_reports_matches_and_differences(self):
        fields = {
            "student_name": {"value": "林晓雨", "evidence": "获奖者：林晓雨"},
            "award_title": {"value": "校园摄影比赛一等奖", "evidence": ""},
            "issuer": {"value": "校团委", "evidence": ""},
            "award_date": {"value": "2026年5月20日", "evidence": ""},
            "credential_type": {"value": "艺术活动", "evidence": ""},
        }
        result = compare_fields(CREDENTIAL, fields)
        statuses = {item["field"]: item["status"] for item in result}
        self.assertEqual(statuses["student_name"], "match")
        self.assertEqual(statuses["award_date"], "match")
        self.assertEqual(statuses["issuer"], "mismatch")

    @patch("services.credential_analysis._model_config", return_value={"api_key": "", "base_url": "", "model": ""})
    @patch("services.credential_analysis.extract_document")
    def test_langgraph_uses_local_rules_when_model_is_disabled(self, extract, _):
        extract.return_value = (
            "林晓雨获得校园摄影大赛一等奖，学校艺术中心，2026-05-20，艺术活动",
            "pdf-text",
            1.0,
        )
        result = analyze_credential(CREDENTIAL, "/tmp/example.pdf")
        self.assertEqual(result["overall_status"], "consistent")
        self.assertEqual(result["generated_by"], "local-rules")
        self.assertTrue(all(item["status"] == "match" for item in result["comparisons"]))

    @patch("services.credential_analysis.extract_document")
    def test_unreadable_document_is_sent_to_manual_review(self, extract):
        extract.return_value = ("", "ocr-unavailable", 0.0)
        result = analyze_credential(CREDENTIAL, "/tmp/example.png")
        self.assertEqual(result["overall_status"], "unreadable")
        self.assertEqual(result["overall_confidence"], 0.0)


if __name__ == "__main__":
    unittest.main()
