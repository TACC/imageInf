FROM python:3.13-slim

# Set working directory
WORKDIR /app

# Install system packages (including vim)
RUN apt-get update && apt-get install -y --no-install-recommends \
    vim \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

WORKDIR /app

COPY ./imageinf /app/imageinf
COPY ./conftest.py /app/.

ENV PYTHONPATH=/app

CMD ["uvicorn", "imageinf.main:app", "--host", "0.0.0.0", "--port", "8000"]
