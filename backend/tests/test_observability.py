import os
import unittest
from unittest.mock import Mock, patch

from services.observability import langfuse_settings, trace_tutor_request


class Observation:
    def __init__(self):
        self.updates = []

    def update(self, **values):
        self.updates.append(values)


class Manager:
    def __init__(self, observation):
        self.observation = observation

    def __enter__(self):
        return self.observation

    def __exit__(self, *_):
        return False


class ObservabilityTest(unittest.TestCase):
    def test_langfuse_requires_flag_and_credentials(self):
        with patch.dict(os.environ, {}, clear=True):
            self.assertFalse(langfuse_settings()["enabled"])
        with patch.dict(
            os.environ,
            {
                "LANGFUSE_ENABLED": "true",
                "LANGFUSE_PUBLIC_KEY": "public",
                "LANGFUSE_SECRET_KEY": "secret",
            },
            clear=True,
        ):
            self.assertTrue(langfuse_settings()["enabled"])

    def test_tutor_trace_exposes_graph_callback_and_retriever_span(self):
        root = Observation()
        retrieval = Observation()
        client = Mock()
        client.start_as_current_observation.side_effect = [
            Manager(root),
            Manager(retrieval),
        ]
        attributes = Manager(Observation())
        callback = object()
        environment = {
            "LANGFUSE_ENABLED": "true",
            "LANGFUSE_PUBLIC_KEY": "public",
            "LANGFUSE_SECRET_KEY": "secret",
        }
        with (
            patch.dict(os.environ, environment, clear=True),
            patch("langfuse.get_client", return_value=client),
            patch("langfuse.propagate_attributes", return_value=attributes),
            patch("langfuse.langchain.CallbackHandler", return_value=callback),
        ):
            with trace_tutor_request(
                "a" * 32, 1, 2, "chinese", "冰心讲了什么？"
            ) as trace:
                self.assertEqual(trace.callbacks, [callback])
                with trace.retrieval("冰心讲了什么？", 60) as span:
                    span.update(output=[{"rank": 1}])
                trace.update(output={"selected_count": 5})

        self.assertEqual(retrieval.updates, [{"output": [{"rank": 1}]}])
        self.assertEqual(root.updates, [{"output": {"selected_count": 5}}])


if __name__ == "__main__":
    unittest.main()
