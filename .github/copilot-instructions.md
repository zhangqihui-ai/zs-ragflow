# Project instructions for Copilot

Read and follow the repository-root [AGENTS.md](../AGENTS.md) before any RAGFlow / ZS-RAG work. It is the authoritative project guide and persistent record of user requirements. For frontend work, also read [web/AGENTS.md](../web/AGENTS.md).

The two highest-priority repository requirements apply to every future task:

1. Develop using `docker-compose-dev.yml` with source mounts and hot reload for both the Vite frontend and Go backend. Start from the repository root with `docker compose -f docker-compose-dev.yml up --build -d`; see [the development guide](../docker/dev/README.md) for preparation.
2. Keep the UI blue and white, with consistent project fonts, backgrounds, and component styles. Use existing semantic tokens and shared components; do not replace the primary palette with another color scheme.

Use the Go implementation for server work. Follow the build and test commands in `AGENTS.md` and the relevant local instructions.
