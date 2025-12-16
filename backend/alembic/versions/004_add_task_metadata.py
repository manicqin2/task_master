"""Add task metadata fields

Revision ID: 004
Revises: 001
Create Date: 2025-11-05

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '004'
down_revision: Union[str, None] = '001'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add metadata fields to tasks table."""
    # Add metadata columns
    op.add_column('tasks', sa.Column('project', sa.String(100), nullable=True))
    op.add_column('tasks', sa.Column('persons', sa.Text(), nullable=True))  # JSON array stored as TEXT
    op.add_column('tasks', sa.Column('task_type', sa.String(50), nullable=True))
    op.add_column('tasks', sa.Column('priority', sa.String(20), nullable=True))
    op.add_column('tasks', sa.Column('deadline_text', sa.String(200), nullable=True))
    op.add_column('tasks', sa.Column('deadline_parsed', sa.DateTime(timezone=True), nullable=True))
    op.add_column('tasks', sa.Column('effort_estimate', sa.Integer(), nullable=True))
    op.add_column('tasks', sa.Column('dependencies', sa.Text(), nullable=True))  # JSON array stored as TEXT
    op.add_column('tasks', sa.Column('tags', sa.Text(), nullable=True))  # JSON array stored as TEXT
    op.add_column('tasks', sa.Column('metadata_suggestions', sa.Text(), nullable=True))  # JSON string
    op.add_column('tasks', sa.Column('extracted_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('tasks', sa.Column('requires_attention', sa.Boolean(), nullable=False, server_default='0'))

    # Create indexes for efficient querying
    op.create_index('idx_task_project', 'tasks', ['project'], unique=False)
    op.create_index('idx_task_deadline_parsed', 'tasks', ['deadline_parsed'], unique=False)
    op.create_index('idx_task_requires_attention', 'tasks', ['requires_attention'], unique=False)
    op.create_index('idx_task_priority', 'tasks', ['priority'], unique=False)


def downgrade() -> None:
    """Remove metadata fields from tasks table."""
    # Drop indexes first
    op.drop_index('idx_task_priority', table_name='tasks')
    op.drop_index('idx_task_requires_attention', table_name='tasks')
    op.drop_index('idx_task_deadline_parsed', table_name='tasks')
    op.drop_index('idx_task_project', table_name='tasks')

    # Drop columns
    op.drop_column('tasks', 'requires_attention')
    op.drop_column('tasks', 'extracted_at')
    op.drop_column('tasks', 'metadata_suggestions')
    op.drop_column('tasks', 'tags')
    op.drop_column('tasks', 'dependencies')
    op.drop_column('tasks', 'effort_estimate')
    op.drop_column('tasks', 'deadline_parsed')
    op.drop_column('tasks', 'deadline_text')
    op.drop_column('tasks', 'priority')
    op.drop_column('tasks', 'task_type')
    op.drop_column('tasks', 'persons')
    op.drop_column('tasks', 'project')
