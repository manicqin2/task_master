# Feature Specification: Task Metadata Extraction

**Feature Branch**: `004-task-metadata-extraction`
**Created**: 2025-11-05
**Status**: Draft
**Input**: User description: "whenever a new task is created, extract from the task: project, persons, deadline, original, formatted, type, priority, chain_of_thought (for debug). Feel free to suggest more data. This data will be part of the cards. If any of these fields cannot be deduced, the card will wait in 'need attention' lane with options"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Automatic Metadata Extraction (Priority: P1)

A user submits a natural language task description (e.g., "Schedule meeting with Sarah and Tom from Marketing project by Friday to discuss Q4 budget"). The system automatically extracts structured metadata (project: Marketing, persons: Sarah, Tom, deadline: Friday, type: meeting, priority: normal) and displays a task card with this information visible to the user.

**Why this priority**: Core functionality - without automatic extraction, the entire feature provides no value. This is the minimum viable product that delivers immediate value by saving users from manual data entry.

**Independent Test**: Can be fully tested by submitting any task description and verifying that the returned task card displays extracted metadata fields. Delivers value by reducing manual data entry time from ~30 seconds to instant.

**Acceptance Scenarios**:

1. **Given** a new task is submitted with text "Meeting with John from ProjectX tomorrow at 2pm", **When** the enrichment service processes the task, **Then** the task card displays: persons=[John], project=[ProjectX], deadline=[tomorrow 2pm], type=[meeting]
2. **Given** a task "Review code for feature-auth by end of week (high priority)", **When** metadata extraction completes, **Then** the card shows: project=[feature-auth], deadline=[end of week], priority=[high], type=[review]
3. **Given** a task "Call mom", **When** extraction runs, **Then** the card shows: persons=[mom], type=[call], with project/deadline/priority empty but not causing errors

---

### User Story 2 - Incomplete Metadata Handling (Priority: P2)

When the system cannot confidently extract one or more required fields (e.g., "Send email" without specifying recipient or deadline), the task card moves to a "Need Attention" lane. The user sees which fields are missing and can either manually fill them or accept suggested values from the AI.

**Why this priority**: Prevents users from getting stuck with incomplete or incorrect metadata. Without this, ambiguous tasks would either fail silently or populate with incorrect data, eroding trust in the system.

**Independent Test**: Can be tested by submitting deliberately ambiguous tasks (e.g., "Follow up on that thing") and verifying the task appears in "Need Attention" lane with options to fill missing fields. Delivers value by ensuring data quality without blocking task creation.

**Acceptance Scenarios**:

1. **Given** a task "Send report" without deadline or recipient, **When** extraction cannot deduce these fields with confidence, **Then** the task appears in "Need Attention" lane with prompts for: persons=[?], deadline=[?], and suggested options for each
2. **Given** a task in "Need Attention" lane, **When** the user selects suggested values or provides manual input, **Then** the task moves to the appropriate lane (Pending/Error/Finished) and displays the confirmed metadata
3. **Given** a task "Meeting about XYZ project" where XYZ is ambiguous (multiple projects match), **When** extraction runs, **Then** the card shows project=[?] with dropdown options of matching projects

---

### User Story 3 - Debug Visibility with Chain of Thought (Priority: P3)

A developer or power user views a task card and expands a debug panel to see the AI's "chain of thought" - the reasoning process used to extract each metadata field. This includes confidence scores, alternative interpretations considered, and why certain values were chosen over others.

**Why this priority**: Enhances transparency and debuggability but not required for core functionality. Primarily valuable for developers troubleshooting extraction issues or users wanting to understand unexpected results.

**Independent Test**: Can be tested by enabling debug mode and verifying that each task card has an expandable section showing chain_of_thought data. Delivers value by enabling rapid diagnosis of extraction errors without needing backend access.

**Acceptance Scenarios**:

1. **Given** a task card with extracted metadata, **When** the user clicks "Show Debug Info", **Then** a panel displays chain_of_thought showing: "Extracted 'Sarah' as person (confidence: 95%, pattern: proper noun after 'with')"
2. **Given** debug mode is enabled, **When** viewing a task with ambiguous extraction, **Then** chain_of_thought shows alternative interpretations: "Considered 'review' as type (80%) vs 'meeting' (60%), selected 'review' based on context"

---

### User Story 4 - Rich Metadata Display on Task Cards (Priority: P2)

Task cards display extracted metadata fields in a scannable, visually distinct format (e.g., badges for project, avatars for persons, date indicators for deadlines, priority flags). Users can quickly scan multiple cards to find tasks by project, person, or urgency without reading full descriptions.

**Why this priority**: Enhances usability and value of extracted metadata. Without visual distinction, metadata extraction provides less value since users must still read full text to understand task attributes.

**Independent Test**: Can be tested by viewing a lane with multiple tasks and verifying that metadata fields are visually differentiated and allow quick scanning. Delivers value by reducing time to find relevant tasks from linear reading to instant visual scanning.

**Acceptance Scenarios**:

1. **Given** a task card with metadata project=[Marketing], persons=[Sarah], deadline=[Friday], priority=[high], **When** displayed in a lane, **Then** the card shows: a blue "Marketing" badge, a person icon with "Sarah", a red "Friday" date indicator, and a high-priority flag icon
2. **Given** multiple task cards in a lane, **When** user scans visually, **Then** cards with the same project show matching colored badges, making project grouping visually apparent
3. **Given** a task with missing metadata fields, **When** displayed, **Then** empty fields show placeholder states (e.g., "No deadline" in gray) rather than blank space

---

### Edge Cases

- What happens when a task mentions multiple projects (e.g., "Sync ProjectA with ProjectB")? System should extract both as an array: project=[ProjectA, ProjectB] or prompt for clarification in "Need Attention" if context is ambiguous.
- How does the system handle relative dates (e.g., "tomorrow", "next week", "in 3 days")? System should convert to absolute dates based on current timestamp, storing both original text and calculated date.
- What if a person's name is ambiguous (e.g., "John" when there are 3 Johns in the system)? System should move to "Need Attention" with a dropdown of matching users.
- What happens when extraction confidence is borderline (e.g., 50-60%)? System should use a confidence threshold (e.g., 70%) - below this, the field goes to "Need Attention" rather than auto-populating.
- How does the system handle tasks with no extractable metadata (e.g., "Remember the thing")? Task appears in "Need Attention" with all fields marked as needing input, preventing data loss but requiring user intervention.
- What if the original task text is extremely long (e.g., 5000+ characters)? System should extract metadata from the full text but display truncated original text on the card with an expand option.
- How are time zones handled for deadlines? System should use the user's local timezone by default, with an option to specify if different.
- What happens when a task is updated after initial extraction? Metadata should be re-extracted and compared to existing values, with conflicts flagged for user review.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST extract project names from task descriptions, supporting both explicit mentions (e.g., "ProjectX", "feature-auth") and implicit context (e.g., "the API project")
- **FR-002**: System MUST identify and extract person names, including both full names (e.g., "Sarah Johnson") and first names (e.g., "Sarah"), handling multiple persons per task
- **FR-003**: System MUST parse and extract deadline information, including absolute dates (e.g., "March 15", "2025-03-15"), relative dates (e.g., "tomorrow", "next Friday", "in 3 days"), and times (e.g., "by 2pm", "before EOD")
- **FR-004**: System MUST preserve the original unmodified task text submitted by the user for reference and audit purposes
- **FR-005**: System MUST generate a formatted/cleaned version of the task text suitable for display on task cards, removing redundant information already captured in metadata fields
- **FR-006**: System MUST classify tasks by type (e.g., meeting, call, email, review, development, research, administrative) based on action verbs and context
- **FR-007**: System MUST determine task priority (e.g., low, normal, high, urgent) from explicit keywords (e.g., "urgent", "high priority", "ASAP") or implicit cues (e.g., "as soon as possible", "critical")
- **FR-008**: System MUST generate and store chain_of_thought data for each extraction, including reasoning steps, confidence scores, and alternative interpretations considered
- **FR-009**: System MUST calculate and store confidence scores (0-100%) for each extracted metadata field
- **FR-010**: System MUST identify tasks with low-confidence or missing required fields (specifically `project`, which is required to move to Ready lane per Feature 003) and route them to a "Need Attention" lane via `requires_attention` flag
- **FR-011**: Users MUST be able to view extracted metadata on task cards in a structured, scannable format
- **FR-012**: Users MUST be able to manually correct or confirm metadata for tasks in the "Need Attention" lane
- **FR-013**: System MUST persist all extracted metadata fields along with the task entity
- **FR-014**: System MUST support optional debug mode where chain_of_thought data is visible to users for transparency and troubleshooting
- **FR-015**: System MUST extract estimated effort or duration if mentioned (e.g., "30 minute call", "2-hour review session")
- **FR-016**: System MUST identify dependencies or blockers if mentioned (e.g., "after John completes his part", "blocked by API deployment")
- **FR-017**: System MUST extract tags or categories if mentioned (e.g., "#bug", "#feature", "category: infrastructure")
- **FR-018**: System MUST handle tasks in multiple languages based on user locale

### Key Entities *(include if feature involves data)*

- **Task Metadata**: Represents structured information extracted from a task description. Core attributes include:
  - `project` (string or array): Project name(s) associated with the task
  - `persons` (array of strings): People mentioned in the task
  - `deadline` (datetime with original text): When the task must be completed
  - `original_text` (string): Unmodified user input
  - `formatted_text` (string): Cleaned version for card display
  - `type` (enum): Category of task (meeting, call, email, review, development, etc.)
  - `priority` (enum): Urgency level (low, normal, high, urgent)
  - `chain_of_thought` (JSON object): AI reasoning process with confidence scores
  - `confidence_scores` (JSON object): Per-field confidence (0-100%)
  - `extracted_at` (timestamp): When extraction occurred
  - `requires_attention` (boolean): Whether task needs user review
  - `effort_estimate` (duration): Estimated time to complete if mentioned
  - `dependencies` (array of strings): Blockers or prerequisites
  - `tags` (array of strings): User-defined or auto-extracted tags

- **Need Attention Item**: Represents a task with incomplete or low-confidence metadata requiring user input. Attributes:
  - `task_id` (reference): Associated task
  - `missing_fields` (array): Fields that could not be extracted
  - `ambiguous_fields` (array): Fields with low confidence requiring confirmation
  - `suggested_values` (JSON object): AI-proposed values for missing fields with confidence scores
  - `user_action_required` (enum): Type of input needed (confirm, select, provide)

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 80% of submitted tasks have all required metadata fields automatically extracted with >70% confidence, requiring no user intervention
- **SC-002**: Users spend less than 10 seconds resolving tasks in "Need Attention" lane on average, compared to ~30 seconds for manual entry
- **SC-003**: Metadata extraction completes within 2 seconds of task submission for 95% of tasks
- **SC-004**: 90% of extracted person names correctly match existing users or contacts in the system
- **SC-005**: 95% of extracted deadlines are accurate when validated against user intent in testing scenarios
- **SC-006**: Users report 80%+ satisfaction with metadata accuracy in post-feature surveys
- **SC-007**: Task cards with rich metadata enable users to find relevant tasks 3x faster than text-only search in time-to-task studies
- **SC-008**: Less than 5% of tasks require manual correction of extracted metadata after initial user review
- **SC-009**: Chain of thought debug information enables developers to diagnose and fix extraction issues within 15 minutes on average

## Dependencies

- Extends Feature 001 (Chat Task Entry) - requires existing task creation and enrichment pipeline
- Requires LLM access (Ollama or OpenAI-compatible endpoint) for metadata extraction
- May require user/contact database integration for person name disambiguation
- May require project/workspace metadata for project name matching

## Assumptions

- Task descriptions are primarily in English (can be extended to other languages in future iterations)
- Users have existing projects and contacts in the system that can be referenced for disambiguation
- Confidence threshold of 70% is appropriate for auto-populating fields (can be tuned based on user feedback)
- "Need Attention" lane exists in the UI (part of Feature 003's lane workflow)
- **Project field is REQUIRED**: Tasks must have `project` metadata assigned (with confidence ≥70%) to move from More Info lane to Ready lane (per Feature 003 Task Workbench concept)
- Backend enrichment service can be extended to support structured metadata extraction beyond current status tracking
- Users prefer automatic extraction with occasional corrections over manual entry for every field
- Debug/chain_of_thought data is primarily for developers and power users, not displayed by default
- Task metadata should be immutable after creation unless explicitly updated by user or re-extraction is triggered

## Out of Scope

- Real-time extraction as user types (this feature extracts after submission)
- Natural language search or querying across metadata fields (searching is a separate feature)
- Bulk editing or updating metadata for multiple tasks at once
- Machine learning model training or fine-tuning (uses existing LLM capabilities)
- Integration with external calendars or project management tools for metadata enrichment
- Automatic re-extraction when related entities change (e.g., project renamed)
- Metadata extraction from non-text inputs (images, voice, attachments)
- Role-based access control for viewing certain metadata fields (assume all task data is visible to task owner)
