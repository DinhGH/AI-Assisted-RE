"""AI engine service entrypoint."""

from __future__ import annotations

import os
from pathlib import Path

import uvicorn
from fastapi import FastAPI

from api.routes import register_routes


def _load_dotenv_file(path: Path) -> None:
    if not path.exists():
        return

    for line in path.read_text(encoding="utf-8").splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("#") or "=" not in stripped:
            continue

        key, value = stripped.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


current_dir = Path(__file__).resolve().parent
_load_dotenv_file(current_dir / ".env")
_load_dotenv_file(current_dir.parent / ".env")


def create_app() -> FastAPI:
    """Create and configure FastAPI app instance.

    WHY: Factory style enables cleaner test setup and dependency injection later.
    """
    app = FastAPI(
        title="AI-Assisted Requirement Quality Analysis Engine",
        version="1.0.0",
    )
    register_routes(app)
    return app


app = create_app()


if __name__ == "__main__":
    port = int(os.getenv("PORT", "8000"))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)

