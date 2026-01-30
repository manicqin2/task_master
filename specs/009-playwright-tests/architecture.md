# Architecture: Playwright End-to-End Tests

**Feature**: 009-playwright-tests
**Date**: 2026-01-30

## Test Architecture Overview

```mermaid
graph TB
    subgraph "Test Layer"
        TS[Test Suites<br/>*.spec.ts]
        PO[Page Objects<br/>*.page.ts]
        FX[Fixtures<br/>test-fixtures.ts]
        AH[API Helpers<br/>api-helpers.ts]
    end

    subgraph "Playwright Runtime"
        PT[Playwright Test Runner]
        BC[Browser Context]
        PG[Page Instance]
    end

    subgraph "Application Under Test"
        FE[Frontend<br/>localhost:5173]
        BE[Backend API<br/>localhost:8000]
        DB[(SQLite)]
    end

    TS --> PO
    TS --> FX
    FX --> AH
    PO --> PG
    FX --> BC
    PT --> BC
    BC --> PG
    PG --> FE
    AH --> BE
    FE --> BE
    BE --> DB
```

## Component Hierarchy

```mermaid
graph LR
    subgraph "Test Files"
        TE[task-entry.spec.ts]
        LW[lane-workflow.spec.ts]
        RW[retry-workflow.spec.ts]
        CP[cancel-pending.spec.ts]
        NV[navigation.spec.ts]
        TM[todo-management.spec.ts]
        EC[edge-cases.spec.ts]
    end

    subgraph "Page Objects"
        BP[BasePage]
        WP[WorkbenchPage]
        TP[TodosPage]
    end

    subgraph "Fixtures"
        EF[Extended Fixtures]
        API[API Helpers]
    end

    TE --> WP
    LW --> WP
    RW --> WP
    CP --> WP
    NV --> WP
    NV --> TP
    TM --> TP
    EC --> WP

    WP --> BP
    TP --> BP
    EF --> WP
    EF --> TP
    EF --> API
```

## User Flow Diagrams

### US1 & US2: Task Creation and Lane Workflow

```mermaid
sequenceDiagram
    participant U as User
    participant T as Test
    participant WP as WorkbenchPage
    participant FE as Frontend
    participant BE as Backend
    participant LLM as Gemini LLM

    T->>WP: goto()
    WP->>FE: Navigate to /
    T->>WP: createTask("Buy groceries")
    WP->>FE: Fill input, click submit
    FE->>BE: POST /api/v1/tasks
    BE-->>FE: 201 Created (pending)
    T->>WP: expect(pendingLane).toContainText("Buy groceries")

    Note over BE,LLM: Async enrichment
    BE->>LLM: Enrich task
    LLM-->>BE: Enriched response
    BE-->>FE: Polling returns completed

    T->>WP: expect(readyLane).toContainText("Buy groceries")
```

### US3: Error Handling and Retry

```mermaid
sequenceDiagram
    participant T as Test
    participant WP as WorkbenchPage
    participant FE as Frontend
    participant BE as Backend

    T->>WP: createTask("Task that fails")
    WP->>FE: Submit task
    FE->>BE: POST /api/v1/tasks

    Note over BE: Enrichment fails

    T->>WP: expect(errorLane).toContainText("Task that fails")
    T->>WP: expect(errorMessage).toBeVisible()

    T->>WP: clickRetry("Task that fails")
    WP->>FE: Click retry emblem
    FE->>BE: POST /api/v1/tasks/{id}/retry

    T->>WP: expect(pendingLane).toContainText("Task that fails")
```

### US4: Tab Navigation

```mermaid
sequenceDiagram
    participant T as Test
    participant NV as Navigation
    participant WP as WorkbenchPage
    participant TP as TodosPage
    participant FE as Frontend

    T->>NV: navigateTo("workbench")
    NV->>FE: Click workbench tab
    T->>WP: expect(lanes).toBeVisible()

    T->>NV: navigateTo("todos")
    NV->>FE: Click todos tab
    T->>TP: expect(todoList).toBeVisible()

    T->>NV: navigateTo("workbench")
    NV->>FE: Click workbench tab
    T->>WP: expect(state preserved)
```

### US5: Todo Management

```mermaid
sequenceDiagram
    participant T as Test
    participant TP as TodosPage
    participant FE as Frontend
    participant BE as Backend

    Note over T: Setup: Task in Ready lane moved to Todos

    T->>TP: expect(todoItem).toBeVisible()
    T->>TP: markComplete("Task text")
    TP->>FE: Click complete button
    FE->>BE: PATCH /api/v1/tasks/{id}

    T->>TP: expect(todoItem).toHaveClass("completed")

    T->>TP: archiveTask("Task text")
    TP->>FE: Click archive button
    FE->>BE: DELETE or PATCH archive

    T->>TP: expect(todoItem).not.toBeVisible()
```

## Test Isolation Flow

```mermaid
flowchart TD
    subgraph "beforeEach Hook"
        A[Start Test] --> B[Create Fresh Browser Context]
        B --> C[Navigate to Base URL]
        C --> D{Test Needs Clean State?}
        D -->|Yes| E[API: Delete Test Tasks]
        D -->|No| F[Continue]
        E --> F
    end

    subgraph "Test Execution"
        F --> G[Run Test Steps]
        G --> H[Assertions]
    end

    subgraph "afterEach Hook"
        H --> I{Test Failed?}
        I -->|Yes| J[Capture Screenshot]
        I -->|Yes| K[Save Trace]
        I -->|No| L[Cleanup]
        J --> L
        K --> L
        L --> M[Close Browser Context]
    end
```

## CI/CD Integration

```mermaid
flowchart LR
    subgraph "CI Pipeline"
        A[Git Push] --> B[Install Dependencies]
        B --> C[Install Playwright Browsers]
        C --> D[Start Dev Server]
        D --> E[Run E2E Tests]
        E --> F{Tests Pass?}
        F -->|Yes| G[Generate HTML Report]
        F -->|No| H[Generate Failure Report]
        G --> I[Upload Artifacts]
        H --> I
        I --> J[Publish Results]
    end
```

## Directory Structure

```
frontend/
├── playwright.config.ts           # Test runner configuration
├── tests/
│   └── e2e/
│       ├── fixtures/              # Shared test setup
│       │   ├── test-fixtures.ts   # Extended Playwright fixtures
│       │   └── api-helpers.ts     # REST API utilities
│       ├── pages/                 # Page Object Models
│       │   ├── base.page.ts       # Common page methods
│       │   ├── workbench.page.ts  # Workbench interactions
│       │   └── todos.page.ts      # Todos interactions
│       ├── task-entry.spec.ts     # US1: Task creation
│       ├── lane-workflow.spec.ts  # US2: Lane transitions
│       ├── retry-workflow.spec.ts # US3: Error handling
│       ├── cancel-pending.spec.ts # US3: Cancel functionality
│       ├── navigation.spec.ts     # US4: Tab navigation
│       ├── todo-management.spec.ts# US5: Todo actions
│       ├── edge-cases.spec.ts     # Edge case coverage
│       └── *.performance.spec.ts  # US6: Performance tests
├── playwright-report/             # Generated HTML reports
└── test-results/                  # Screenshots, traces, JUnit XML
```

## Configuration

```mermaid
flowchart TD
    subgraph "playwright.config.ts"
        A[testDir: ./tests/e2e]
        B[fullyParallel: true]
        C[forbidOnly: CI only]
        D[retries: 2 on CI]
        E[reporter: html + junit]
        F[projects: chromium, firefox, webkit]
        G[webServer: npm run dev]
    end

    A --> H[Test Discovery]
    B --> I[Parallel Execution]
    C --> J[CI Safety]
    D --> K[Flaky Test Handling]
    E --> L[Reporting]
    F --> M[Cross-browser Testing]
    G --> N[Auto Dev Server]
```
