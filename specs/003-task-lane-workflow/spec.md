# Feature Specification: Multi-Lane Task Workflow with Action Emblems

**Feature Branch**: `003-task-lane-workflow`
**Created**: 2025-11-05
**Status**: Draft
**Input**: User description: "multiple lanes, when a task is posted it will go into a pending lane, next lane will be a error/more info lane, last lane will be "finished lane"
in each lane the tasks have multiple "emblems", an emblem is an action

 in the pending lane a task can be canceled. for now this will only remove it from the lane, no backend support

in the error lane there will be a retry emblem.

in the finished lane there will be confirm emblem (later we will insert this functionality"

## Clarifications

### Session 2025-11-05

- Q: How does the system handle a task that fails multiple times (should retry be limited, or show retry count)? → A: No retry limit. Users can retry indefinitely, but Error/More Info lane tasks also have a cancel emblem so users can abandon permanently failed tasks.
- Q: What happens when a user tries to cancel a task that has already started processing (race condition between UI and backend state)? → A: Move task immediately to Error/More Info lane with "Cancellation failed - task already processing" message. User can then wait for it to complete or retry/cancel from Error lane.
- Q: How should the UI handle very long task descriptions or titles that overflow the task card? → A: Truncate at 100 characters with ellipsis. Show full text when user clicks/expands the task card.
- Q: What happens if the backend connection is lost while a task is in the Pending lane? → A: After 30 seconds with no response, automatically move task to Error/More Info lane with "Backend unavailable - retry when online" message.
- Q: Should there be a maximum number of tasks displayed per lane (pagination or virtualization)? → A: No limit. Display all tasks in each lane. Performance may degrade with 100+ tasks but this is acceptable given the assumption that typical usage will be under 100 tasks per lane.
- Q: Should confirmed tasks be archived/hidden, or remain visible with a "confirmed" badge? → A: Confirmed tasks remain visible in Finished lane with a "confirmed" badge indicator
- Q: Should confirm state be persisted in backend or kept as frontend-only state? → A: Frontend-only state (confirmed status lost on page refresh, no backend persistence)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Basic Lane Visualization and Task Movement (Priority: P1)

As a user viewing my tasks, I can see tasks organized into three distinct lanes (Pending, Error/More Info, Finished) so I understand at a glance what stage each task is in and what actions I need to take.

**Why this priority**: This is the foundational MVP - without visual lane organization, users cannot understand task status or take appropriate actions. All other features depend on this basic structure.

**Independent Test**: Can be fully tested by creating a task and observing it appear in the Pending lane, then triggering different outcomes to see tasks move to Error/More Info or Finished lanes. Delivers immediate value by improving task status visibility compared to a single-list view.

**Acceptance Scenarios**:

1. **Given** a user submits a new task, **When** the task is created, **Then** the task appears in the Pending lane
2. **Given** a task in the Pending lane encounters an error during processing, **When** the error occurs, **Then** the task moves to the Error/More Info lane
3. **Given** a task completes successfully, **When** processing finishes, **Then** the task moves to the Finished lane
4. **Given** a user views the task board, **When** tasks exist in multiple lanes, **Then** each lane displays its tasks in chronological order (newest first)

---

### User Story 2 - Cancel Action in Pending Lane (Priority: P2)

As a user with a task waiting in the Pending lane, I can cancel the task by clicking a cancel emblem, which immediately removes it from the lane, so I can quickly discard tasks I no longer need without waiting for backend processing.

**Why this priority**: Provides immediate user control over pending tasks. This is the first action emblem and establishes the pattern for other emblems. Frontend-only implementation makes it quick to deliver value.

**Independent Test**: Can be fully tested by creating a task in the Pending lane, clicking the cancel emblem, and verifying the task disappears from the UI. No backend verification needed for this iteration.

**Acceptance Scenarios**:

1. **Given** a task exists in the Pending lane, **When** the user clicks the cancel emblem, **Then** the task is immediately removed from the Pending lane
2. **Given** a task exists in the Pending lane, **When** the user hovers over the cancel emblem, **Then** a tooltip appears explaining "Cancel this task (removes from queue)"
3. **Given** a user cancels a task, **When** the task is removed, **Then** no error message is shown and the lane reflows smoothly
4. **Given** multiple tasks exist in the Pending lane, **When** the user cancels one task, **Then** only that specific task is removed and other tasks remain visible

---

### User Story 3 - Retry and Cancel Actions in Error/More Info Lane (Priority: P3)

As a user with a failed task in the Error/More Info lane, I can retry the task by clicking a retry emblem (which re-submits it to the backend), or I can cancel the task by clicking a cancel emblem (which removes it from the UI), so I can either recover from transient errors or abandon permanently failed tasks without re-entering task data.

**Why this priority**: Addresses error recovery, which is important but less critical than basic visualization and cancellation. Requires backend integration for retry, making it more complex than P2. Adding cancel gives users an escape hatch for tasks that cannot be fixed.

**Independent Test**: Can be fully tested by forcing a task to fail (e.g., backend unavailable), verifying it appears in Error/More Info lane with both retry and cancel emblems, testing retry (task moves back to Pending), and testing cancel (task disappears from UI).

**Acceptance Scenarios**:

1. **Given** a task exists in the Error/More Info lane, **When** the user clicks the retry emblem, **Then** the task moves back to the Pending lane and re-attempts processing
2. **Given** a task exists in the Error/More Info lane, **When** the user hovers over the retry emblem, **Then** a tooltip appears explaining "Retry this task"
3. **Given** a task is retried, **When** the retry succeeds, **Then** the task moves to the Finished lane
4. **Given** a task is retried, **When** the retry fails again, **Then** the task returns to the Error/More Info lane with an updated error message
5. **Given** a task in the Error/More Info lane, **When** viewing the task card, **Then** the error message or reason for requiring more info is clearly displayed
6. **Given** a task exists in the Error/More Info lane, **When** the user clicks the cancel emblem, **Then** the task is immediately removed from the Error/More Info lane
7. **Given** a task exists in the Error/More Info lane, **When** the user hovers over the cancel emblem, **Then** a tooltip appears explaining "Cancel this task (cannot be recovered)"

---

### User Story 4 - Confirm Action in Finished Lane (Priority: P4)

As a user with a completed task in the Finished lane, I can confirm the task by clicking a confirm emblem, which marks the task as acknowledged with a visible badge, so I can distinguish between tasks I've reviewed and those I haven't yet confirmed.

**Why this priority**: Nice-to-have feature for task management hygiene. The spec notes this functionality will be inserted later, so it's the lowest priority for initial implementation.

**Independent Test**: Can be fully tested by completing a task, verifying it appears in the Finished lane with a confirm emblem, clicking confirm, and observing the task receives a visual "confirmed" badge while remaining visible in the Finished lane.

**Acceptance Scenarios**:

1. **Given** a task exists in the Finished lane, **When** the user clicks the confirm emblem, **Then** the task is marked as confirmed and remains visible in the Finished lane with a "confirmed" badge indicator
2. **Given** a task exists in the Finished lane, **When** the user hovers over the confirm emblem, **Then** a tooltip appears explaining "Confirm completion"
3. **Given** multiple tasks exist in the Finished lane, **When** the user confirms one task, **Then** only that specific task's state changes
4. **Given** a user confirms a task, **When** the confirmation completes, **Then** visual feedback indicates successful confirmation

---

### Edge Cases

- What happens if the user navigates away while a task is in the Pending lane?
- What happens if a user tries to retry a task but the backend is still unavailable?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST display three distinct lanes labeled "Pending", "Error/More Info", and "Finished"
- **FR-002**: System MUST automatically place newly created tasks in the Pending lane
- **FR-003**: System MUST automatically move tasks to the Error/More Info lane when processing encounters an error or requires additional information
- **FR-003a**: System MUST automatically move tasks from Pending lane to Error/More Info lane with message "Backend unavailable - retry when online" if no response is received within 30 seconds
- **FR-004**: System MUST automatically move tasks to the Finished lane when processing completes successfully
- **FR-005**: Each task card MUST display action emblems appropriate to its current lane (cancel in Pending, retry and cancel in Error/More Info, confirm in Finished)
- **FR-006**: Clicking the cancel emblem in the Pending lane MUST immediately remove the task from the UI without backend communication
- **FR-006a**: If a cancel attempt on a Pending task fails due to the task already being in processing state, the system MUST move the task to the Error/More Info lane with message "Cancellation failed - task already processing"
- **FR-007**: Clicking the retry emblem in the Error/More Info lane MUST re-submit the task to the backend and move it to the Pending lane
- **FR-007a**: Clicking the cancel emblem in the Error/More Info lane MUST immediately remove the task from the UI without backend communication
- **FR-007b**: Tasks in the Error/More Info lane can be retried unlimited times (no retry limit enforced)
- **FR-008**: Clicking the confirm emblem in the Finished lane MUST mark the task as confirmed with a "confirmed" badge (frontend-only state, not persisted to backend, lost on page refresh)
- **FR-009**: Each action emblem MUST display a tooltip on hover explaining its function
- **FR-010**: Tasks within each lane MUST be ordered chronologically with most recent tasks first
- **FR-010a**: Each lane MUST display all tasks without pagination or virtualization (no maximum task limit per lane)
- **FR-011**: Task cards MUST display the task title/description clearly within the lane
- **FR-011a**: Task titles/descriptions longer than 100 characters MUST be truncated with ellipsis (...) and provide a click/expand interaction to show full text
- **FR-012**: Error/More Info lane tasks MUST display the error message or reason for requiring additional information
- **FR-013**: Lane transitions (task moving between lanes) MUST be visually smooth with appropriate animations

### Key Entities

- **Task**: Represents a work item with attributes including title/description, current lane (pending/error/finished), creation timestamp, error message (if applicable), and confirmation status (for finished tasks, frontend-only state)
- **Lane**: Represents a workflow stage (Pending, Error/More Info, Finished) containing zero or more tasks, with visual boundaries separating it from other lanes
- **Action Emblem**: Represents a clickable UI element associated with a task, with attributes including emblem type (cancel/retry/confirm), tooltip text, and action handler

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can visually identify task status (pending/error/finished) within 2 seconds of viewing the interface
- **SC-002**: Task cancellation removes the task from the UI within 200 milliseconds of clicking the cancel emblem
- **SC-003**: Task retry moves the task to Pending lane and re-submits to backend within 500 milliseconds of clicking retry emblem
- **SC-004**: 95% of users successfully perform cancel, retry, or confirm actions on first attempt without guidance
- **SC-005**: Lane transitions (task movement between lanes) complete with smooth animations within 300 milliseconds
- **SC-006**: Users can distinguish between different action emblems (cancel/retry/confirm) within 1 second based on visual design
- **SC-007**: Error messages in the Error/More Info lane provide sufficient context for users to understand why the task failed or needs attention
- **SC-008**: Tasks in Pending lane automatically move to Error/More Info lane within 30 seconds if backend does not respond

## Scope Boundaries *(optional)*

### In Scope

- Visual lane-based task organization (Pending, Error/More Info, Finished)
- Action emblems for cancel, retry, and confirm
- Frontend-only cancel implementation (no backend persistence)
- Backend-integrated retry implementation (re-submit to existing task processing endpoint)
- Basic tooltip explanations for each emblem
- Smooth visual transitions when tasks move between lanes
- Display of error messages in Error/More Info lane

### Out of Scope

- Backend persistence of canceled tasks (they are simply removed from UI)
- Backend persistence of confirmed task state (frontend-only, lost on page refresh)
- Task archiving or removal after confirmation (confirmed tasks remain visible with badge)
- Task filtering or search within lanes
- Bulk actions (e.g., cancel all pending tasks, retry all failed tasks)
- Custom lane configurations or user-defined lanes
- Task priority indicators or sorting options beyond chronological
- Historical view of canceled or confirmed tasks
- Notification system for task state changes
- Drag-and-drop task movement between lanes

## Dependencies & Assumptions *(optional)*

### Dependencies

- Existing task creation functionality from Feature 001 (chat-based task entry)
- Backend API endpoints for task submission and status updates
- Backend must provide task status information (pending/error/finished) and error messages
- Frontend UI framework (React) and component library (shadcn/ui) from Feature 001

### Assumptions

- Tasks have a deterministic lifecycle (pending → processing → finished OR error)
- Task processing is asynchronous (tasks don't complete instantly)
- Backend provides clear error messages when tasks fail
- Users understand the concept of workflow lanes (no onboarding tutorial required)
- The existing polling mechanism from Feature 001 (500ms interval) will detect task status changes
- Cancel action is acceptable as a frontend-only operation for this iteration (no backend notification needed)
- Confirm functionality is frontend-only with no backend persistence (confirmed status resets on page refresh, suitable for session-based acknowledgment)
- Maximum reasonable number of tasks per lane is under 100 (no pagination needed initially)
