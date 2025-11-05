"""Initial task table

Revision ID: 001
Revises:
Create Date: 2025-11-04

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '001'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create tasks table."""
    op.create_table(
        'tasks',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('user_input', sa.Text(), nullable=False),
        sa.Column('enriched_text', sa.Text(), nullable=True),
        sa.Column('status', sa.Enum('open', 'completed', 'archived', name='taskstatus'), nullable=False),
        sa.Column('enrichment_status', sa.Enum('pending', 'processing', 'completed', 'failed', name='enrichmentstatus'), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('error_message', sa.Text(), nullable=True),
    )

    # Create index on created_at for reverse chronological ordering
    op.create_index('ix_tasks_created_at', 'tasks', ['created_at'], unique=False)

    # Create index on enrichment_status for polling queries
    op.create_index('ix_tasks_enrichment_status', 'tasks', ['enrichment_status'], unique=False)


def downgrade() -> None:
    """Drop tasks table."""
    op.drop_index('ix_tasks_enrichment_status', table_name='tasks')
    op.drop_index('ix_tasks_created_at', table_name='tasks')
    op.drop_table('tasks')
