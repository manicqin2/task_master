# Feature Specification: Task Management UI Enhancements

**Feature Branch**: `008-ui-enhancements`
**Created**: 2026-01-06
**Status**: Draft
**Input**: User description: "enhancements: low priority is default, deadline should be converted to date, projects agenda persons tabs should show the same as todos but with different filters"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Default Priority to Low (Priority: P1)

As a user creating a new task, I want the priority to default to "Low" instead of requiring manual selection, so that I can quickly add tasks without worrying about priority assignment for routine items.

**Why this priority**: This is the highest priority because it directly impacts the task creation workflow that every user performs multiple times daily. Setting a sensible default reduces cognitive load and speeds up task entry.

**Independent Test**: Can be fully tested by creating a new task without selecting a priority and verifying that it defaults to "Low" in both the Task Workbench and todo list views.

**Acceptance Scenarios**:

1. **Given** I am creating a new task in the chat input, **When** I submit the task without specifying priority, **Then** the task should appear with "Low" priority indicator
2. **Given** I am in the Task Workbench "More Info" lane editing metadata, **When** the priority field is not yet set, **Then** the priority selector should show "Low" as the pre-selected value
3. **Given** a task has been enriched by the LLM without priority metadata, **When** I view the task card, **Then** it should display with "Low" priority badge
4. **Given** I move a task from Ready lane to the todo list, **When** the task had no explicit priority set, **Then** the todo item should show "Low" priority

---

### User Story 2 - Natural Language Deadline Conversion (Priority: P2)

As a user, I want deadline inputs like "tomorrow", "next Friday", or "in 2 weeks" to be automatically converted to actual dates, so that I can specify deadlines naturally without calculating dates manually.

**Why this priority**: Important for user experience but not critical for MVP - users can still manually enter dates. This enhancement makes the system more intuitive and reduces friction.

**Independent Test**: Can be tested by entering various natural language deadline phrases and verifying they convert to correct ISO dates in the metadata editor and task display.

**Acceptance Scenarios**:

1. **Given** I enter "tomorrow" in the deadline field, **When** I save the metadata, **Then** the system should convert it to tomorrow's ISO date (YYYY-MM-DD)
2. **Given** I enter "next Friday" as a deadline, **When** the task is saved, **Then** the deadline should show the actual date of the next occurring Friday
3. **Given** I enter "in 2 weeks" for a deadline, **When** viewing the task card, **Then** the deadline indicator should display the date 14 days from today
4. **Given** I enter an absolute date like "2026-02-15", **When** saving, **Then** the system should preserve it as-is without modification
5. **Given** I enter an invalid deadline phrase like "someday", **When** attempting to save, **Then** the system should show a validation error and suggest valid formats

---

### User Story 3 - Unified Task Views with Filtering (Priority: P3)

As a user, I want Projects, Agenda, and Persons tabs to show the same task interface as the Todos tab but with different filtering applied, so that I can view my tasks organized by different dimensions without learning multiple interfaces.

**Why this priority**: This is a nice-to-have enhancement that improves consistency and navigation but doesn't block core task management functionality. Users can still manage tasks effectively using the Todos tab alone.

**Independent Test**: Can be tested by navigating to each tab (Projects, Agenda, Persons) and verifying that the task display format matches the Todos tab with appropriate filters applied.

**Acceptance Scenarios**:

1. **Given** I am on the Projects tab, **When** I select a project, **Then** I should see the same task list interface as the Todos tab, filtered to show only tasks from that project
2. **Given** I am on the Agenda tab, **When** I select a date, **Then** I should see the same task cards as in Todos, filtered to tasks with deadlines on that date
3. **Given** I am on the Persons tab, **When** I select a person, **Then** I should see the same task display as Todos, filtered to tasks assigned to that person
4. **Given** I am viewing filtered tasks in any tab, **When** I complete or edit a task, **Then** the changes should be reflected immediately in all relevant tabs
5. **Given** I am in the Projects tab with no project selected, **When** the view loads, **Then** I should see a prompt to select a project or a list of all projects with task counts

---

### Edge Cases

1. **Given** I enter "tomorrow" as a deadline on Monday and the task is saved, **When** I view the task on Tuesday (the next day), **Then** the deadline should still show Monday's date + 1 day (not recalculate to Tuesday + 1 day)
2. **Given** I have 5 tasks all with "Low" priority, **When** I sort the task list by priority, **Then** tasks within the same priority group should be ordered by deadline (earliest first), with tasks without deadlines appearing last
3. **Given** today is Monday and I enter "next Monday" as a deadline, **When** the system converts it, **Then** it should resolve to 7 days from today (the following Monday, not today)
4. **Given** I enter "in 3 days" as a deadline on January 1st and then edit the task on January 10th, **When** I open the deadline field in the metadata editor, **Then** it should display "2026-01-04" (the calculated date), not the original phrase "in 3 days"
5. **Given** I have tasks with null/missing deadlines, **When** sorting by deadline within the same priority group, **Then** tasks without deadlines should appear after tasks with deadlines

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST set task priority to "Low" by default when no priority is specified during task creation
- **FR-002**: System MUST display "Low" as the pre-selected value in the priority selector for tasks without explicit priority metadata
- **FR-003**: System MUST accept natural language deadline inputs including "tomorrow", "next [day of week]", "in N days/weeks/months"
- **FR-004**: System MUST convert natural language deadline inputs to ISO date format (YYYY-MM-DD) for storage and display
- **FR-005**: System MUST preserve absolute date inputs (YYYY-MM-DD format) without modification
- **FR-006**: System MUST validate deadline inputs and show clear error messages for unrecognized formats
- **FR-007**: Projects tab MUST display tasks using the same UI components as the Todos tab, filtered by selected project
- **FR-008**: Agenda tab MUST display tasks using the same UI components as the Todos tab, filtered by deadline date
- **FR-009**: Persons tab MUST display tasks using the same UI components as the Todos tab, filtered by assigned person
- **FR-010**: All tab views MUST support the same task actions (complete, edit, delete) with consistent behavior
- **FR-011**: System MUST store natural language deadlines as calculated ISO dates permanently (no recalculation on subsequent views)
- **FR-012**: System MUST sort tasks with identical priority by deadline in ascending order (earliest first), with null deadlines sorted last
- **FR-013**: System MUST interpret "next [day of week]" as 7 days from current date when current day matches the specified day of week
- **FR-014**: System MUST display calculated ISO dates in the deadline field when editing tasks, not the original natural language phrase

### Key Entities

- **Task Priority**: Default value of "Low" (enum: Low, Normal, High, Urgent) - assigned to all tasks unless explicitly set otherwise
- **Deadline**: Stored as ISO date string (YYYY-MM-DD), accepts both natural language inputs and absolute dates for entry
- **Task Filter**: Criteria for displaying tasks in different tab views (by project, by deadline date, by assigned person)

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of tasks created without explicit priority assignment display "Low" priority in all views
- **SC-002**: Users can successfully create tasks with natural language deadlines with 90%+ accuracy for common phrases (tomorrow, next Friday, in N days/weeks)
- **SC-003**: All four tab views (Todos, Projects, Agenda, Persons) use identical task card components and support identical task actions
- **SC-004**: Task state changes (complete, edit, delete) in filtered views reflect immediately (within 500ms) in all other views showing the same task
- **SC-005**: Invalid deadline inputs show clear validation errors with suggested valid formats, preventing task creation with malformed dates
