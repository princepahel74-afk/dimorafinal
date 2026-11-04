# DIMORA — one container serving the website and the API. Works on Railway, Fly.io, Koyeb, Google
# Cloud Run, a VPS, or Render (Docker runtime).  docker build -t dimora . && docker run -p 8000:8000 dimora
FROM python:3.11-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 PORT=8000 DIMORA_PUBLIC=1 DIMORA_AI_PROVIDER=openrouter
RUN useradd -m -u 1000 dimora
WORKDIR /app
COPY backend/requirements.txt backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt
COPY --chown=dimora backend backend
COPY --chown=dimora frontend frontend
USER dimora
EXPOSE 8000
CMD gunicorn --chdir backend -w 1 --threads 4 -t 180 -b 0.0.0.0:$PORT app:app
