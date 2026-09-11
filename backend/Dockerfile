FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt requirements-ai.txt requirements-ocr.txt ./
RUN pip install --no-cache-dir -r requirements-ai.txt -r requirements-ocr.txt
COPY . .
RUN mkdir -p data uploads
EXPOSE 5001
CMD ["python", "app.py"]
