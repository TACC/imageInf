FROM python:3.13-slim

# Set working directory
WORKDIR /app

# Install system packages (including vim)
RUN apt-get update && apt-get install -y --no-install-recommends \
    vim \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

# Install dependencies (frozen from lockfile, no dev deps)
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev --no-install-project

COPY ./imageinf /app/imageinf
COPY ./conftest.py /app/.

ENV PYTHONPATH=/app

ENV PATH="/app/.venv/bin:$PATH"
ENV PYTHONPATH=/app

CMD ["uvicorn", "imageinf.main:app", "--host", "0.0.0.0", "--port", "8000"]
