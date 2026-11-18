# Project instructions

Before any RAGFlow / ZS-RAG work, read and follow [AGENTS.md](AGENTS.md), the authoritative project guide and persistent record of user requirements. For frontend work, also read [web/AGENTS.md](web/AGENTS.md).

The highest-priority repository requirements are:

- Develop using `docker-compose-dev.yml` with source mounts and hot reload for the frontend and Go backend. Start with `docker compose -f docker-compose-dev.yml up --build -d`; preparation is documented in `docker/dev/README.md`.
- Keep the UI blue and white, using consistent project fonts, backgrounds, semantic color tokens, and shared component styles. Do not switch to another primary palette.

Apply these requirements to every subsequent development task. Consult `AGENTS.md` for the complete rules and validation commands.
