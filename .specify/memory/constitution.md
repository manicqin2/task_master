<!--
Sync Impact Report:
- Version change: 1.1.0 → 1.2.0
- Modified principles: None
- Added sections:
  * Visual Documentation Standards (diagram requirements for specifications)
- Removed sections: None
- Templates requiring updates:
  ⏳ spec-template.md (needs update - must include architecture.md section)
  ⏳ plan-template.md (needs review - ensure diagrams are planned)
  ✅ tasks-template.md (reviewed - compatible)
- Follow-up TODOs:
  * Update spec-template.md to include architecture.md file requirement
  * Add diagram checklist to spec validation
-->

# TaskMaster Constitution

## Core Principles

### I. Library-First Architecture

Every feature in TaskMaster must be designed and implemented as a standalone library before integration into the broader system.

**Requirements**:
- Libraries MUST be self-contained with minimal external dependencies
- Libraries MUST be independently testable in isolation
- Libraries MUST have a clear, singular purpose
- Libraries MUST include comprehensive documentation
- No organizational-only libraries permitted—each must deliver concrete functionality

**Rationale**: Library-first architecture ensures modularity, reusability, and maintainability. It forces clarity of purpose and prevents tight coupling that leads to technical debt.

### II. Test-Driven Development (NON-NEGOTIABLE)

All code in TaskMaster MUST follow strict Test-Driven Development practices.

**Requirements**:
- Tests MUST be written before implementation code
- Tests MUST be reviewed and approved by stakeholders before implementation begins
- Tests MUST fail initially (Red phase)
- Implementation proceeds only after failing tests are confirmed (Green phase)
- Refactoring follows successful implementation (Refactor phase)
- The Red-Green-Refactor cycle is strictly enforced without exception

**Rationale**: TDD ensures code correctness, prevents regressions, and serves as living documentation. It is non-negotiable because it fundamentally impacts code quality, maintainability, and project velocity over time.

### III. Clean Modular Architecture

TaskMaster code MUST maintain clear separation of concerns and explicit dependency boundaries.

**Requirements**:
- MUST separate business logic from infrastructure concerns
- MUST define explicit interfaces between modules
- MUST follow dependency inversion—depend on abstractions, not concretions
- MUST avoid circular dependencies
- MUST keep module coupling low and cohesion high
- Integration tests MUST validate contracts between modules

**Rationale**: Clean architecture ensures long-term maintainability, testability, and enables independent evolution of system components. It prevents the creation of monolithic, tightly-coupled code that becomes unmaintainable.

## Development Standards

### Testing Requirements

- **Contract Tests**: Required for all library public APIs and module boundaries
- **Integration Tests**: Required for:
  - New library integrations
  - Contract changes between modules
  - Inter-service communication
  - Shared data schemas
- **Unit Tests**: Required for all business logic and utility functions
- All tests MUST be automated and run in CI/CD pipeline

### Visual Documentation Standards

Every feature specification MUST include visual diagrams to communicate architecture, flows, and system interactions.

**Requirements**:
- All specifications MUST include an `architecture.md` file with relevant diagrams
- Diagrams MUST use Mermaid format for consistency and renderability
- Diagrams MUST be stored in the feature's spec directory (e.g., `specs/001-feature-name/architecture.md`)
- Diagrams MUST be updated when the implementation changes

**Required Diagrams by Feature Type**:

**System/Infrastructure Features**:
- System architecture overview (component diagram)
- Container/deployment diagram
- Startup sequence diagram
- Configuration flow

**API/Backend Features**:
- Sequence diagram showing request/response flow
- Component interaction diagram
- Data flow diagram
- State transition diagram (if stateful)

**UI/Frontend Features**:
- Component hierarchy diagram
- User flow diagram
- State management diagram
- Data flow between components

**Data/Storage Features**:
- Entity relationship diagram (ERD)
- Data flow diagram
- Migration/versioning flow
- Query optimization diagrams (if complex)

**Integration Features**:
- System integration diagram
- Sequence diagram for cross-system flows
- Authentication/authorization flow
- Error handling and retry logic

**General Guidelines**:
- Keep diagrams focused—one concept per diagram
- Include timing information for async flows
- Document key configuration and environment variables
- Add troubleshooting sections with common issues
- Include API endpoint examples where applicable

**Rationale**: Visual diagrams dramatically improve understanding of complex systems, reduce onboarding time, serve as architecture decision records, and make code reviews more effective. They ensure knowledge is preserved beyond individual team members.

### Code Quality

- Code MUST pass linting and formatting checks before commit
- Code reviews are mandatory for all changes
- Complexity MUST be justified—if a simpler solution exists, it MUST be used
- Documentation MUST be updated alongside code changes
- Breaking changes MUST be versioned and communicated

### Versioning

- Projects MUST use semantic versioning: MAJOR.MINOR.PATCH
  - MAJOR: Breaking changes
  - MINOR: New features, backward compatible
  - PATCH: Bug fixes, backward compatible
- Version changes MUST be documented in changelog
- Breaking changes MUST include migration guides

### Technology Standards

- **MCP Integration**: Model Context Protocol (MCP) MUST be used for accessing external tools and services
  - Context7 MCP server MUST be used for retrieving up-to-date library documentation
  - Developers MUST use Context7 for researching libraries and frameworks before implementation
  - Documentation queries MUST go through Context7 to ensure accuracy and currency
- **UI Components**: shadcn/ui MUST be the standard component library for all user interface development
  - All UI components SHOULD be sourced from shadcn/ui when available
  - Custom components MUST follow shadcn/ui patterns and conventions
  - Component customization MUST maintain shadcn/ui architectural principles

**Rationale**: Standardizing on Context7 ensures developers have access to current, accurate documentation without manual searching. shadcn/ui provides a consistent, accessible, and maintainable UI component foundation that aligns with modern best practices.

## Governance

### Constitution Authority

This constitution supersedes all other development practices and guidelines for the TaskMaster project. When conflicts arise between this constitution and other documentation, the constitution takes precedence.

### Compliance

- All pull requests MUST verify compliance with constitutional principles
- Code reviews MUST explicitly check for constitutional violations
- Any complexity or deviation from principles MUST be justified in writing
- Violations without justification will not be merged

### Amendments

Amendments to this constitution require:
1. Written proposal with rationale
2. Review and approval from project stakeholders
3. Migration plan for existing code if applicable
4. Version bump according to semantic versioning rules
5. Update to all dependent templates and documentation

### Amendment Process

- MAJOR version: Backward incompatible changes to core principles or removal of principles
- MINOR version: New principles added or material expansion of existing principles
- PATCH version: Clarifications, wording improvements, non-semantic refinements

### Review Cycle

The constitution MUST be reviewed:
- At project milestones
- When patterns of violations emerge
- Annually at minimum
- Before major architectural decisions

**Version**: 1.2.0 | **Ratified**: 2025-11-04 | **Last Amended**: 2025-11-05
