"""AI engine service entrypoint."""

from __future__ import annotations

import os

import uvicorn
from fastapi import FastAPI

from api.routes import register_routes


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

