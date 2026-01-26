FROM python:3.10-slim

# Prevent TF from grabbing all memory
ENV TF_CPP_MIN_LOG_LEVEL=2
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# System deps for Pillow & TensorFlow
RUN apt-get update && apt-get install -y \
    build-essential \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Gunicorn entrypoint
CMD ["gunicorn", "-b", "0.0.0.0:8080", "model_api:app"]
