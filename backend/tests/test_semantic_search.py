import unittest
from unittest.mock import patch

from services.semantic_search import search_students


class SemanticSearchTest(unittest.TestCase):
    @patch("services.semantic_search._load_model", return_value=None)
    def test_related_sports_terms_rank_first(self, _):
        students = [
            {"name": "甲", "tags": '["篮球"]', "tags_text": "篮球", "description": "校队后卫"},
            {"name": "乙", "tags": '["绘画"]', "tags_text": "绘画", "description": "喜欢油画"},
        ]
        result, engine = search_students("找擅长体育运动的学生", students)
        self.assertEqual(result[0]["name"], "甲")
        self.assertEqual(engine, "local-keyword-fallback")


if __name__ == "__main__":
    unittest.main()
