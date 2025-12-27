#!/usr/bin/env python3
"""
Full test script for GeminiClient including metadata extraction.

This demonstrates the complete workflow:
1. Enrich raw user input
2. Extract structured metadata (project, persons, deadline, tags, etc.)
"""

import asyncio
import os
import sys
from pathlib import Path
from pydantic import BaseModel

# Add src to path
sys.path.insert(0, str(Path(__file__).parent))

from src.lib.gemini_client import GeminiClient, GeminiClientConfig, GeminiAPIError


# Define the metadata schema (matches TaskMetadataExtraction)
class TaskMetadata(BaseModel):
    """Schema for extracted task metadata."""
    project: str | None = None
    project_confidence: float = 0.0

    persons: list[str] = []
    persons_confidence: float = 0.0

    deadline: str | None = None
    deadline_confidence: float = 0.0

    task_type: str | None = None
    task_type_confidence: float = 0.0

    priority: str | None = None
    priority_confidence: float = 0.0

    effort_estimate: int | None = None
    effort_confidence: float = 0.0

    dependencies: list[str] = []
    dependencies_confidence: float = 0.0

    tags: list[str] = []
    tags_confidence: float = 0.0


async def main():
    print("=" * 60)
    print("GeminiClient Full Test - Enrichment + Metadata Extraction")
    print("=" * 60)

    # Load configuration
    env_file = Path(__file__).parent.parent / ".env.development"
    if env_file.exists():
        with open(env_file) as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    key, value = line.split("=", 1)
                    os.environ[key] = value

    api_key = os.getenv("GEMINI_API_KEY", "")

    if api_key == "your_gemini_api_key_here" or not api_key:
        print("\n❌ ERROR: Please set a real GEMINI_API_KEY in .env.development")
        return

    # Initialize client
    config = GeminiClientConfig(
        api_key=api_key,
        model=os.getenv("GEMINI_MODEL", "gemini-2.5-flash"),
        timeout=float(os.getenv("GEMINI_TIMEOUT", "15.0")),
        max_retries=int(os.getenv("GEMINI_MAX_RETRIES", "3")),
    )
    client = GeminiClient(config)
    print("✅ Client initialized\n")

    # Test case 1: Simple task
    print("=" * 60)
    print("TEST 1: Simple Task")
    print("=" * 60)
    test_input_1 = "call John tmrw about project Alpha"
    print(f"Input: '{test_input_1}'")

    # Step 1: Enrich
    enriched_1 = await client.enrich_task(test_input_1)
    print(f"Enriched: '{enriched_1}'")

    # Step 2: Extract metadata
    metadata_1 = await client.extract_metadata(enriched_1, TaskMetadata)
    print(f"\nExtracted Metadata:")
    print(f"  Project: {metadata_1.project} (confidence: {metadata_1.project_confidence:.2f})")
    print(f"  Persons: {metadata_1.persons} (confidence: {metadata_1.persons_confidence:.2f})")
    print(f"  Deadline: {metadata_1.deadline} (confidence: {metadata_1.deadline_confidence:.2f})")
    print(f"  Task Type: {metadata_1.task_type} (confidence: {metadata_1.task_type_confidence:.2f})")
    print(f"  Priority: {metadata_1.priority} (confidence: {metadata_1.priority_confidence:.2f})")
    print(f"  Tags: {metadata_1.tags} (confidence: {metadata_1.tags_confidence:.2f})")

    # Test case 2: Complex task with more metadata
    print("\n" + "=" * 60)
    print("TEST 2: Complex Task")
    print("=" * 60)
    test_input_2 = "urgent meeting with Sarah and Mike tomorrow at 3pm for Q4 review #quarterly-review"
    print(f"Input: '{test_input_2}'")

    # Step 1: Enrich
    enriched_2 = await client.enrich_task(test_input_2)
    print(f"Enriched: '{enriched_2}'")

    # Step 2: Extract metadata
    metadata_2 = await client.extract_metadata(enriched_2, TaskMetadata)
    print(f"\nExtracted Metadata:")
    print(f"  Project: {metadata_2.project} (confidence: {metadata_2.project_confidence:.2f})")
    print(f"  Persons: {metadata_2.persons} (confidence: {metadata_2.persons_confidence:.2f})")
    print(f"  Deadline: {metadata_2.deadline} (confidence: {metadata_2.deadline_confidence:.2f})")
    print(f"  Task Type: {metadata_2.task_type} (confidence: {metadata_2.task_type_confidence:.2f})")
    print(f"  Priority: {metadata_2.priority} (confidence: {metadata_2.priority_confidence:.2f})")
    print(f"  Effort: {metadata_2.effort_estimate} minutes (confidence: {metadata_2.effort_confidence:.2f})")
    print(f"  Tags: {metadata_2.tags} (confidence: {metadata_2.tags_confidence:.2f})")

    # Test case 3: Task with dependencies
    print("\n" + "=" * 60)
    print("TEST 3: Task with Dependencies")
    print("=" * 60)
    test_input_3 = "send email to client after reviewing contract"
    print(f"Input: '{test_input_3}'")

    # Step 1: Enrich
    enriched_3 = await client.enrich_task(test_input_3)
    print(f"Enriched: '{enriched_3}'")

    # Step 2: Extract metadata
    metadata_3 = await client.extract_metadata(enriched_3, TaskMetadata)
    print(f"\nExtracted Metadata:")
    print(f"  Task Type: {metadata_3.task_type} (confidence: {metadata_3.task_type_confidence:.2f})")
    print(f"  Priority: {metadata_3.priority} (confidence: {metadata_3.priority_confidence:.2f})")
    print(f"  Dependencies: {metadata_3.dependencies} (confidence: {metadata_3.dependencies_confidence:.2f})")

    print("\n" + "=" * 60)
    print("✅ All metadata extraction tests completed successfully!")
    print("=" * 60)


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n\n⚠️  Test interrupted by user")
    except Exception as e:
        print(f"\n\n❌ Fatal error: {e}")
        import traceback
        traceback.print_exc()
