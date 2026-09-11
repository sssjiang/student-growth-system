import os
from pathlib import Path

from celery import Celery
from dotenv import load_dotenv


BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR.parent / ".env")

broker_url = os.getenv("CELERY_BROKER_URL", "redis://localhost:6379/0")

celery_app = Celery(
    "student_growth_system",
    broker=broker_url,
    backend=os.getenv("CELERY_RESULT_BACKEND", "redis://localhost:6379/1"),
    include=["tasks"],
)
celery_app.conf.update(
    accept_content=["json"],
    broker_connection_timeout=2,
    broker_connection_retry_on_startup=True,
    broker_transport_options={
        "interval_max": 1,
        "interval_start": 0,
        "interval_step": 0.2,
        "max_retries": 1,
    },
    result_expires=3600,
    task_acks_late=True,
    task_ignore_result=True,
    task_reject_on_worker_lost=True,
    task_serializer="json",
    timezone=os.getenv("CELERY_TIMEZONE", "Asia/Shanghai"),
    worker_prefetch_multiplier=1,
)
