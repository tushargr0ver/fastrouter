# Use slim Python image
FROM python:3.12-slim

# Install system deps
RUN apt-get update && apt-get install -y curl \
    && rm -rf /var/lib/apt/lists/*

# Install uv
RUN curl -Ls https://astral.sh/uv/install.sh | sh
ENV PATH="/root/.local/bin:$PATH"

# Set working directory
WORKDIR /app

# Copy dependency files first (for better caching)
COPY primary/pyproject.toml primary/uv.lock* ./
COPY database/ /database

# Install dependencies
RUN uv sync --frozen --no-dev

# Copy rest of the application
COPY primary/ .

# Expose port
EXPOSE 8000

# Run FastAPI with uvicorn
CMD ["uv", "run", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]