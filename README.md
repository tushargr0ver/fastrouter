# FastRouter

A unified AI API gateway and router for multiple LLM providers. FastRouter provides a single interface to interact with OpenAI, Anthropic, Google Gemini, and more, with built-in credit management and usage tracking.

## Features

- **Unified API**: Single endpoint for multiple LLM providers.
- **Dashboard**: User-friendly UI for managing API keys and viewing usage logs.
- **Credit System**: Integrated credit wallet for managing model usage.
- **Dockerized**: Simple deployment using Docker Compose.

## Project Structure

- `backend/primary`: Core logic, authentication, and database management (FastAPI).
- `backend/api`: Thin proxy layer for routing LLM requests (FastAPI).
- `frontend`: React-based dashboard for users (Bun + Vite).

## Getting Started

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/)
- [Docker Compose](https://docs.docker.com/compose/install/)

### Installation & Running

1. **Clone the repository**
   ```bash
   git clone https://github.com/tushargr0ver/fastrouter.git
   cd fastrouter
   ```

2. **Set up environment variables**
   Create a `.env` file in the root directory (you can use `.env.example` as a template if it exists).
   ```bash
   cp .env.example .env # If available, otherwise create one
   ```
   *Note: Ensure you set your provider API keys (OPENAI_API_KEY, etc.) in the `.env` file.*

3. **Run with Docker Compose**
   ```bash
   docker compose up --build
   ```

The services will be available at:
- **Frontend**: http://localhost:3000
- **Primary API**: http://localhost:8000
- **Proxy API**: http://localhost:8001

## License

MIT
