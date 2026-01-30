# Data Model: Playwright End-to-End Tests

**Feature**: 009-playwright-tests
**Date**: 2026-01-30

## Overview

This feature is a **test-only feature** and does not introduce new data persistence. The data model describes the test infrastructure entities and their relationships.

## Test Infrastructure Entities

### TestSuite

**Purpose**: Collection of related test cases organized by feature area

**Attributes**:
- `name`: string - Suite identifier (e.g., "Task Entry", "Lane Workflow")
- `testDir`: string - Directory containing test files
- `timeout`: number - Maximum test duration in milliseconds (default: 30000)

**Files**:
- `task-entry.spec.ts` - Task creation tests
- `lane-workflow.spec.ts` - Lane transition tests
- `retry-workflow.spec.ts` - Retry functionality tests
- `cancel-pending.spec.ts` - Cancel functionality tests
- `navigation.spec.ts` - Tab navigation tests (NEW)
- `todo-management.spec.ts` - Todo completion/archive tests (NEW)
- `edge-cases.spec.ts` - Edge case coverage (NEW)

---

### PageObject

**Purpose**: Abstraction layer encapsulating page structure and common interactions

**Entities**:

#### BasePage
- `page`: Playwright Page instance
- `goto()`: Navigate to page
- `waitForLoad()`: Wait for page ready state

#### WorkbenchPage extends BasePage
- `chatInput`: Locator - `[data-testid="chat-input"]`
- `submitButton`: Locator - `[data-testid="submit-button"]`
- `pendingLane`: Locator - `[data-testid="lane-pending"]`
- `errorLane`: Locator - `[data-testid="lane-error"]`
- `readyLane`: Locator - `[data-testid="lane-finished"]`
- `createTask(text: string)`: Create a new task
- `getTaskCard(text: string)`: Get task card by content
- `clickRetry(taskText: string)`: Click retry on failed task
- `clickCancel(taskText: string)`: Click cancel on task

#### TodosPage extends BasePage
- `todoList`: Locator - `[data-testid="todo-list"]`
- `todoItems`: Locator - `[data-testid="todo-item"]`
- `showFinishedToggle`: Locator - `[data-testid="show-finished-toggle"]`
- `markComplete(taskText: string)`: Mark todo as complete
- `archiveTask(taskText: string)`: Archive completed task
- `toggleShowFinished()`: Toggle visibility of finished tasks

#### NavigationComponent
- `workbenchTab`: Locator - `[data-testid="tab-workbench"]`
- `todosTab`: Locator - `[data-testid="tab-todos"]`
- `navigateTo(tab: string)`: Click tab to navigate

---

### TestFixture

**Purpose**: Reusable setup and teardown logic for common test scenarios

**Entities**:

#### ExtendedTest
Extends base Playwright test with custom fixtures:
- `workbenchPage`: WorkbenchPage instance
- `todosPage`: TodosPage instance
- `apiHelpers`: API utility functions

#### ApiHelpers
- `cleanupTasks()`: Delete all test tasks via API
- `createTask(text: string)`: Create task directly via API
- `getTaskById(id: string)`: Fetch task details
- `waitForEnrichment(id: string)`: Poll until enrichment complete

---

### TestReport

**Purpose**: Output artifact showing test results, timing, and any failures

**Attributes**:
- `reporter`: "html" | "junit" | "list"
- `outputDir`: string - Report output directory
- `artifacts`: Screenshots, traces, videos on failure

**Output Files**:
- `playwright-report/index.html` - HTML report
- `test-results/e2e-junit-results.xml` - JUnit XML for CI

---

## Data Flow

```
TestSuite
    ├── imports PageObjects (WorkbenchPage, TodosPage)
    ├── imports TestFixtures (ExtendedTest, ApiHelpers)
    └── produces TestReport

PageObject
    └── wraps Playwright Page
        └── uses Locators (data-testid selectors)

TestFixture
    ├── provides setup/teardown hooks
    └── provides ApiHelpers for test isolation
```

## Selectors Reference

| Component | Selector | Usage |
|-----------|----------|-------|
| Chat Input | `[data-testid="chat-input"]` | Task creation input |
| Submit Button | `[data-testid="submit-button"]` | Submit task |
| Pending Lane | `[data-testid="lane-pending"]` | Tasks being enriched |
| Error Lane | `[data-testid="lane-error"]` | Failed tasks |
| Ready Lane | `[data-testid="lane-finished"]` | Completed tasks |
| Task Card | `[data-testid="task-card"]` | Individual task |
| Retry Button | `[data-testid="emblem-retry"]` | Retry failed task |
| Cancel Button | `[data-testid="emblem-cancel"]` | Cancel task |
| Error Message | `[data-testid="error-message"]` | Error display |
| Todo List | `[data-testid="todo-list"]` | Todo items container |
| Todo Item | `[data-testid="todo-item"]` | Individual todo |
| Tab Workbench | `[data-testid="tab-workbench"]` | Workbench navigation |
| Tab Todos | `[data-testid="tab-todos"]` | Todos navigation |

## Notes

- No database schema changes required
- No API contracts to define (tests consume existing API)
- Test data created via existing POST /api/v1/tasks endpoint
- Test cleanup via existing DELETE /api/v1/tasks/{id} endpoint
