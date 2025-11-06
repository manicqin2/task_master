"""Metadata extraction service using LLM Structured Outputs.

This service extracts structured metadata from natural language task descriptions:
- Project names
- Person names
- Deadlines (text and parsed datetime)
- Task types (meeting, call, email, etc.)
- Priority levels
- Effort estimates
- Dependencies
- Tags

Uses OpenAI-compatible structured outputs with Pydantic schemas for reliable extraction.
"""
import json
from datetime import datetime, timezone
from typing import Optional

from openai import AsyncOpenAI

from src.lib.metadata_parsers import parse_deadline, extract_tags, normalize_person_name
from src.models.enums import Priority, TaskType
from src.models.task_metadata import MetadataExtractionResponse


class MetadataExtractor:
    """Extract structured metadata from task descriptions using LLM."""

    # Confidence threshold for auto-population (70%)
    CONFIDENCE_THRESHOLD = 0.7

    def __init__(self, llm_client: AsyncOpenAI, reference_time: Optional[datetime] = None):
        """Initialize metadata extractor.

        Args:
            llm_client: OpenAI-compatible async client (e.g., Ollama)
            reference_time: Reference time for relative date parsing (defaults to now)
        """
        self.llm_client = llm_client
        self.reference_time = reference_time or datetime.now(timezone.utc)

    async def extract(self, task_text: str) -> MetadataExtractionResponse:
        """Extract structured metadata from task description.

        Args:
            task_text: Natural language task description

        Returns:
            MetadataExtractionResponse with extracted fields and confidence scores

        Raises:
            Exception: If extraction fails
        """
        if not task_text or not task_text.strip():
            # Return empty response with low confidence for empty input
            return MetadataExtractionResponse(
                project=None,
                project_confidence=0.0,
                persons=[],
                persons_confidence=0.0,
                deadline=None,
                deadline_confidence=0.0,
                task_type=None,
                task_type_confidence=0.0,
                priority=None,
                priority_confidence=0.0,
                effort_estimate=None,
                effort_confidence=0.0,
                dependencies=[],
                dependencies_confidence=0.0,
                tags=[],
                tags_confidence=0.0,
            )

        # Build system prompt for structured extraction
        system_prompt = self._build_extraction_prompt()

        try:
            # Call LLM with structured output (Pydantic schema)
            response = await self.llm_client.chat.completions.create(
                model="llama3.2",  # Should match OLLAMA_MODEL
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": f"Extract metadata from this task:\n\n{task_text}"},
                ],
                temperature=0.1,  # Low temperature for consistent extraction
                max_tokens=500,
                response_format={"type": "json_object"},  # Request JSON response
            )

            # Parse LLM response
            content = response.choices[0].message.content
            if not content:
                raise ValueError("LLM returned empty response")

            # Parse JSON response
            extraction_data = json.loads(content)

            # Post-process extracted data
            return self._post_process_extraction(extraction_data, task_text)

        except Exception as e:
            raise Exception(f"Metadata extraction failed: {str(e)}") from e

    def _build_extraction_prompt(self) -> str:
        """Build system prompt for metadata extraction."""
        return f"""You are a metadata extraction assistant. Extract structured information from task descriptions.

Extract the following fields with confidence scores (0.0-1.0):

1. **project**: Project or category name (e.g., "ProjectX", "Work", "Personal")
   - Confidence: 1.0 if explicitly mentioned, 0.5 if implied, 0.0 if none

2. **persons**: List of person names mentioned (e.g., ["Sarah Johnson", "Mike Chen"])
   - Confidence: 1.0 if full names, 0.8 if first names only, 0.0 if none
   - Use full names when available

3. **deadline**: Original deadline phrase (e.g., "tomorrow at 3pm", "by Friday")
   - Confidence: 1.0 if explicit time/date, 0.7 if relative date, 0.0 if none
   - Preserve original phrasing

4. **task_type**: One of: meeting, call, email, review, development, research, administrative, other
   - Confidence: 1.0 if action verb matches (Call→call), 0.5 if implied, 0.3 for "other"

5. **priority**: One of: low, normal, high, urgent
   - Confidence: 1.0 if keyword present (urgent, high priority), 0.5 if implied, 0.3 for "normal"

6. **effort_estimate**: Time to complete in minutes (e.g., 30, 60, 120)
   - Confidence: 0.8 if explicitly stated, 0.4 if implied from task type, 0.0 if unknown

7. **dependencies**: List of prerequisites or blockers mentioned
   - Confidence: 0.9 if explicit ("after X", "waiting for Y"), 0.0 if none

8. **tags**: List of hashtags or keywords (e.g., ["bug", "urgent"])
   - Confidence: 1.0 if hashtags present, 0.7 if keywords extracted, 0.0 if none

9. **chain_of_thought**: Brief reasoning for your extractions (1-2 sentences)

**Response Format (JSON)**:
{{
  "project": "ProjectX",
  "project_confidence": 0.95,
  "persons": ["Sarah Johnson"],
  "persons_confidence": 1.0,
  "deadline": "tomorrow at 3pm",
  "deadline_confidence": 1.0,
  "task_type": "call",
  "task_type_confidence": 1.0,
  "priority": "urgent",
  "priority_confidence": 1.0,
  "effort_estimate": 30,
  "effort_confidence": 0.6,
  "dependencies": [],
  "dependencies_confidence": 0.0,
  "tags": ["quarterly-review"],
  "tags_confidence": 0.7,
  "chain_of_thought": "Task starts with 'Call' action verb indicating task_type=call. 'urgent' keyword at end indicates high priority. Full name 'Sarah Johnson' and project 'ProjectX' explicitly mentioned."
}}

**Important**:
- Return ONLY valid JSON, no markdown or extra text
- All confidence scores must be between 0.0 and 1.0
- Use null for missing values, empty arrays [] for empty lists
- Person names should be properly capitalized (Title Case)
- Task type must be one of the allowed values
- Priority must be one of: low, normal, high, urgent

Current date/time for reference: {self.reference_time.isoformat()}
"""

    def _post_process_extraction(
        self, extraction_data: dict, original_text: str
    ) -> MetadataExtractionResponse:
        """Post-process LLM extraction results.

        Args:
            extraction_data: Raw extraction data from LLM
            original_text: Original task text

        Returns:
            Validated and processed MetadataExtractionResponse
        """
        # Normalize person names
        persons = extraction_data.get("persons", [])
        if persons:
            persons = [normalize_person_name(name) for name in persons if name]

        # Extract hashtags from original text (supplement LLM extraction)
        extracted_tags = extract_tags(original_text)
        llm_tags = extraction_data.get("tags", [])
        # Combine and deduplicate tags
        all_tags = list(set(extracted_tags + llm_tags))

        # Parse task_type enum
        task_type_str = extraction_data.get("task_type")
        task_type = None
        if task_type_str:
            try:
                task_type = TaskType(task_type_str.lower())
            except ValueError:
                task_type = TaskType.OTHER

        # Parse priority enum
        priority_str = extraction_data.get("priority")
        priority = None
        if priority_str:
            try:
                priority = Priority(priority_str.lower())
            except ValueError:
                priority = Priority.NORMAL

        # Build response
        return MetadataExtractionResponse(
            project=extraction_data.get("project"),
            project_confidence=extraction_data.get("project_confidence", 0.0),
            persons=persons,
            persons_confidence=extraction_data.get("persons_confidence", 0.0),
            deadline=extraction_data.get("deadline"),
            deadline_confidence=extraction_data.get("deadline_confidence", 0.0),
            task_type=task_type,
            task_type_confidence=extraction_data.get("task_type_confidence", 0.0),
            priority=priority,
            priority_confidence=extraction_data.get("priority_confidence", 0.0),
            effort_estimate=extraction_data.get("effort_estimate"),
            effort_confidence=extraction_data.get("effort_confidence", 0.0),
            dependencies=extraction_data.get("dependencies", []),
            dependencies_confidence=extraction_data.get("dependencies_confidence", 0.0),
            tags=all_tags,
            tags_confidence=extraction_data.get("tags_confidence", 0.0),
            chain_of_thought=extraction_data.get("chain_of_thought"),
        )

    def should_populate_field(self, confidence: float) -> bool:
        """Check if field should be auto-populated based on confidence.

        Args:
            confidence: Confidence score (0.0-1.0)

        Returns:
            True if confidence >= threshold (0.7)
        """
        return confidence >= self.CONFIDENCE_THRESHOLD

    def requires_attention(self, response: MetadataExtractionResponse) -> bool:
        """Check if extracted metadata requires user attention.

        Args:
            response: Metadata extraction response

        Returns:
            True if any important field has low confidence
        """
        # Check important fields
        important_fields = [
            response.project_confidence,
            response.persons_confidence,
            response.task_type_confidence,
            response.priority_confidence,
        ]

        # If any important field is below threshold, needs attention
        return any(conf < self.CONFIDENCE_THRESHOLD for conf in important_fields)
