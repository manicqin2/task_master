"""Main entry point for TaskMaster backend."""
import uvicorn

from .api import app
from .lib.database import init_db


@app.on_event("startup")
async def startup_event():
    """Initialize database on application startup."""
    await init_db()


if __name__ == "__main__":
    uvicorn.run(
        "src.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
    )
