"""Turn uploads (PNG/JPG/WEBP/PDF, or data URLs) into OpenCV images."""
from __future__ import annotations

import base64
import io

import cv2
import numpy as np


class UploadError(ValueError):
    pass


def decode_image_bytes(data: bytes) -> np.ndarray:
    arr = np.frombuffer(data, dtype=np.uint8)
    img = cv2.imdecode(arr, cv2.IMREAD_UNCHANGED)
    if img is None:
        raise UploadError("The image could not be decoded. Use PNG, JPG, WEBP or PDF.")
    if img.ndim == 2:
        img = cv2.cvtColor(img, cv2.COLOR_GRAY2BGR)
    elif img.shape[2] == 4:  # flatten transparency onto white
        alpha = img[:, :, 3:4].astype(np.float32) / 255.0
        img = (img[:, :, :3].astype(np.float32) * alpha + 255 * (1 - alpha)).astype(np.uint8)
    return img


def pdf_pages(data: bytes, max_pages: int = 8, scale: float = 2.0) -> list[np.ndarray]:
    """Render PDF pages with pypdfium2 (Apache/BSD licensed PDFium bindings)."""
    import pypdfium2 as pdfium

    pdf = pdfium.PdfDocument(data)
    pages = []
    for i in range(min(len(pdf), max_pages)):
        pil = pdf[i].render(scale=scale).to_pil().convert("RGB")
        pages.append(cv2.cvtColor(np.array(pil), cv2.COLOR_RGB2BGR))
    return pages


def load_upload(filename: str, data: bytes) -> list[tuple[str, np.ndarray]]:
    """One upload → list of (sheet name, image). A PDF gives one sheet per page."""
    base = filename.rsplit(".", 1)[0].replace("_", " ").replace("-", " ").strip()[:40] or "Plan"
    if data[:4] == b"%PDF" or filename.lower().endswith(".pdf"):
        pages = pdf_pages(data)
        if not pages:
            raise UploadError("The PDF has no pages.")
        return [(f"{base} · page {i + 1}" if len(pages) > 1 else base, p) for i, p in enumerate(pages)]
    return [(base, decode_image_bytes(data))]


def data_url_to_image(url: str) -> np.ndarray:
    if "," not in url:
        raise UploadError("Expected a data: URL")
    return decode_image_bytes(base64.b64decode(url.split(",", 1)[1]))


def image_to_data_url(img: np.ndarray, fmt: str = ".png", quality: int = 90) -> str:
    params = [cv2.IMWRITE_JPEG_QUALITY, quality] if fmt == ".jpg" else []
    ok, buf = cv2.imencode(fmt, img, params)
    if not ok:
        raise UploadError("Could not encode image")
    mime = "image/jpeg" if fmt == ".jpg" else "image/png"
    return f"data:{mime};base64," + base64.b64encode(buf.tobytes()).decode()


def shrink(img: np.ndarray, max_side: int = 1280) -> np.ndarray:
    h, w = img.shape[:2]
    s = min(1.0, max_side / max(h, w))
    return cv2.resize(img, (round(w * s), round(h * s)), interpolation=cv2.INTER_AREA) if s < 1 else img


def to_jpeg_b64(img: np.ndarray, max_side: int = 1280) -> str:
    """Base64 JPEG (no data: prefix) for vision-model requests."""
    ok, buf = cv2.imencode(".jpg", shrink(img, max_side), [cv2.IMWRITE_JPEG_QUALITY, 88])
    return base64.b64encode(buf.tobytes()).decode()


__all__ = ["UploadError", "load_upload", "data_url_to_image", "image_to_data_url", "shrink", "to_jpeg_b64", "io"]
