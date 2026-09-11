import uuid
from pathlib import Path


ALLOWED_EXTENSIONS = {"pdf", "doc", "docx", "png", "jpg", "jpeg", "txt"}


class InvalidFileError(ValueError):
    pass


class LocalFileStorage:
    """Local storage adapter. Keep route code independent from a future OSS adapter."""

    def __init__(self, root):
        self.root = Path(root)
        self.root.mkdir(parents=True, exist_ok=True)

    def save(self, uploaded):
        original_name = Path(uploaded.filename.replace("\\", "/")).name[:255]
        suffix = original_name.rsplit(".", 1)[-1].lower() if "." in original_name else ""
        if suffix not in ALLOWED_EXTENSIONS:
            raise InvalidFileError("仅支持 PDF、Word、图片和 TXT 文件")

        stored_name = f"{uuid.uuid4().hex}.{suffix}"
        destination = self.root / stored_name
        uploaded.save(destination)
        return {
            "original_name": original_name,
            "stored_name": stored_name,
            "mime_type": uploaded.mimetype or "application/octet-stream",
            "size": destination.stat().st_size,
        }

    def delete(self, stored_name):
        path = self.root / stored_name
        if path.is_file():
            path.unlink()
