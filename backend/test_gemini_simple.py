#!/usr/bin/env python3
"""
Minimal test for GeminiClient showing complete enrichment + extraction workflow.

Uses only ONE API call for enrichment and ONE for extraction to stay within rate limits.
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
    print("GeminiClient Simple Test - Complete Workflow")
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

    # Test: Complex task with multiple metadata fields
    print("=" * 60)
    print("COMPLETE WORKFLOW TEST")
    print("=" * 60)
    test_input = "urgent meeting with Sarah and Mike tmrw at 3pm for Q4 review #quarterly-review"
    print(f"Input: '{test_input}'")
    print()

    # Step 1: Enrich the task text
    print("[Step 1] Enriching task text...")
    try:
        enriched = await client.enrich_task(test_input)
        print(f"✅ Enriched: '{enriched}'")
    except GeminiAPIError as e:
        print(f"❌ Enrichment failed: {e.message}")
        return

    print()

    # Step 2: Extract metadata from enriched text
    print("[Step 2] Extracting metadata...")
    try:
        # Wait a moment to avoid rate limit
        await asyncio.sleep(2)

        metadata = await client.extract_metadata(enriched, TaskMetadata)
        print(f"✅ Metadata extracted successfully!\n")

        # Display all extracted fields
        print("Extracted Metadata:")
        print(f"  📁 Project: {metadata.project or 'None'} (confidence: {metadata.project_confidence:.2f})")
        print(f"  👥 Persons: {metadata.persons} (confidence: {metadata.persons_confidence:.2f})")
        print(f"  📅 Deadline: {metadata.deadline or 'None'} (confidence: {metadata.deadline_confidence:.2f})")
        print(f"  📋 Task Type: {metadata.task_type or 'None'} (confidence: {metadata.task_type_confidence:.2f})")
        print(f"  ⚠️  Priority: {metadata.priority or 'None'} (confidence: {metadata.priority_confidence:.2f})")
        print(f"  ⏱️  Effort: {metadata.effort_estimate or 'None'} min (confidence: {metadata.effort_confidence:.2f})")
        print(f"  🔗 Dependencies: {metadata.dependencies} (confidence: {metadata.dependencies_confidence:.2f})")
        print(f"  🏷️  Tags: {metadata.tags} (confidence: {metadata.tags_confidence:.2f})")

    except GeminiAPIError as e:
        print(f"❌ Metadata extraction failed: {e.message}")
        return

    print("\n" + "=" * 60)
    print("✅ Complete workflow test passed!")
    print("=" * 60)
    print()
    print("This demonstrates:")
    print("  1. enrich_task() - Improves raw user input")
    print("  2. extract_metadata() - Extracts all fields with confidence scores")
    print()
    print("All fields shown above (project, persons, deadline, task_type,")
    print("priority, effort_estimate, dependencies, tags) are extracted")
    print("using Gemini's structured output feature with Pydantic schemas.")


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n\n⚠️  Test interrupted by user")
    except Exception as e:
        print(f"\n\n❌ Fatal error: {e}")
        import traceback
        traceback.print_exc()
