"""SQLAlchemy models and base setup."""
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()

# Import models after Base is defined
from .task import Task  # noqa: E402
from .workbench import Workbench  # noqa: E402
from .todos import Todo  # noqa: E402

__all__ = ["Base", "Task", "Workbench", "Todo"]
