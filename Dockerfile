FROM python:3.13-slim

# Set working directory
WORKDIR /app

# Install system packages (including vim)
RUN apt-get update && apt-get install -y --no-install-recommends \
    vim curl \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

COPY pyproject.toml uv.lock ./

ARG DEV=false
RUN if [ "$DEV" = "true" ]; then \
      uv sync --frozen --no-install-project; \
    else \
      uv sync --frozen --no-dev --no-install-project; \
    fi

COPY ./imageinf /app/imageinf
COPY ./conftest.py /app/.

ENV PYTHONPATH=/app

ENV PATH="/app/.venv/bin:$PATH"
ENV PYTHONPATH=/app

CMD ["uvicorn", "imageinf.main:app", "--host", "0.0.0.0", "--port", "8000"]
