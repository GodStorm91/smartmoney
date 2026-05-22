FROM python:3.11-slim

WORKDIR /app

# uv for fast, reproducible installs
RUN pip install --no-cache-dir uv

# Install deps first (better layer caching)
COPY pyproject.toml uv.lock ./
COPY src ./src
RUN uv sync --frozen --no-dev

EXPOSE 3000

# Serves streamable-http on /mcp at 0.0.0.0:3000 (see config.py env overrides)
CMD ["uv", "run", "smartmoney-mcp"]
