# Research: Multi-Lane Task Workflow with Action Emblems

## 1. Animation Library: Framer Motion

**Decision**: Use Framer Motion for lane transitions

**Rationale**:
- Industry-standard React animation library with excellent TypeScript support
- AnimatePresence component perfect for task movement between lanes
- Gesture animations for potential drag-and-drop in future
- Performance-optimized (uses transform/opacity, not layout recalcs)
- Small bundle size (~30KB gzipped)

**Implementation Pattern**:
```tsx
<AnimatePresence mode="sync">
  <motion.div
    key={task.id}
    layout
    initial={{ opacity: 0, x: -20 }}
    animate={{ opacity: 1, x: 0 }}
    exit={{ opacity: 0, x: 20 }}
    transition={{ duration: 0.3 }}
  >
    {/* Task card */}
  </motion.div>
</AnimatePresence>
```

**Alternatives considered**:
- React Spring: More complex API, overkill for this use case
- CSS transitions: Insufficient for complex layout animations
- React Transition Group: Lower-level, requires more custom code

## 2. UI Components: shadcn/ui Selection

**Decision**: Use Card, Button, Tooltip from shadcn/ui

**Components chosen**:
- `Card`: Base for TaskCard component (already styled, accessible)
- `Button`: Action emblems with variant="ghost" for subtle appearance
- `Tooltip`: Hover explanations for emblems (FR-009 requirement)
- `Badge`: Optional for lane labels or task metadata

**Rationale**:
- Project standard (constitution mandates shadcn/ui)
- Fully accessible (ARIA attributes built-in)
- Customizable via Tailwind classes
- Small bundle impact (tree-shakeable)

**Implementation notes**:
- Extend Card with custom CardEmblem sub-component for action buttons
- Use Tooltip.Provider at LaneWorkflow level for shared tooltip context

## 3. Optimistic UI Updates: TanStack Query Patterns

**Decision**: Use optimistic updates for cancel actions

**Pattern**:
```tsx
const cancelTaskMutation = useMutation({
  mutationFn: (taskId) => removeTaskFromUI(taskId),
  onMutate: async (taskId) => {
    // Cancel ongoing queries
    await queryClient.cancelQueries({ queryKey: ['tasks'] })

    // Snapshot previous state
    const previousTasks = queryClient.getQueryData(['tasks'])

    // Optimistically update cache
    queryClient.setQueryData(['tasks'], (old) =>
      old.filter(t => t.id !== taskId)
    )

    return { previousTasks }
  },
  onError: (err, taskId, context) => {
    // Rollback on error
    queryClient.setQueryData(['tasks'], context.previousTasks)
  }
})
```

**Rationale**:
- Instant UI feedback (meets <200ms requirement)
- Automatic rollback on error
- Integrates with existing polling (no conflicts)

**Alternatives considered**:
- Wait for server confirmation: Too slow, poor UX
- Manual state management: Duplicates TanStack Query capabilities

## 4. Timeout Detection: React Patterns

**Decision**: Use combination of request timestamps + polling checks

**Pattern**:
```tsx
const useTimeoutDetection = (taskId: string) => {
  const { data: task } = useTask(taskId)

  useEffect(() => {
    if (task?.status !== 'pending') return

    const startTime = task.submittedAt || Date.now()
    const checkInterval = setInterval(() => {
      const elapsed = Date.now() - startTime
      if (elapsed > 30000 && task.status === 'pending') {
        // Move to error lane
        moveToErrorLane(taskId, 'Backend unavailable - retry when online')
      }
    }, 1000) // Check every second

    return () => clearInterval(checkInterval)
  }, [task])
}
```

**Rationale**:
- Leverages existing polling (no duplicate requests)
- Separate interval for timeout checks (precise 30s detection)
- Automatic cleanup on component unmount

**Alternatives considered**:
- Single setTimeout: Inaccurate if component remounts
- Backend-driven timeout: Adds complexity, defeats "backend unavailable" purpose

## 5. Text Truncation: Expand/Collapse Pattern

**Decision**: CSS truncation + controlled expansion state

**Pattern**:
```tsx
const [expanded, setExpanded] = useState(false)

<div className={cn(
  "transition-all duration-200",
  !expanded && "line-clamp-2"
)}>
  {task.description}
</div>
{task.description.length > 100 && (
  <Button variant="link" onClick={() => setExpanded(!expanded)}>
    {expanded ? 'Show less' : 'Show more'}
  </Button>
)}
```

**Rationale**:
- CSS `line-clamp` handles ellipsis automatically
- Smooth expand animation with Tailwind transitions
- Accessible (screen readers get full text)
- Minimal JS (only toggle boolean)

**Alternatives considered**:
- Manual substring: Breaks on word boundaries poorly
- Tooltip for full text: Not discoverable, hover-only (bad for mobile)

## 6. Layout: CSS Grid for Lanes

**Decision**: CSS Grid with 3 equal columns

**Pattern**:
```css
.lane-container {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
  height: 100%;
}

.lane {
  display: flex;
  flex-direction: column;
  min-height: 0; /* Allows overflow scrolling */
}

.lane-tasks {
  flex: 1;
  overflow-y: auto;
}
```

**Rationale**:
- Grid superior for equal-width columns
- Flexbox within each lane for vertical task stacking
- `min-height: 0` critical for scroll containers in grid
- Responsive (can switch to 1-column on mobile)

**Alternatives considered**:
- Flexbox only: Requires manual width calc, less semantic
- Table layout: Accessibility issues, poor responsive behavior

## 7. State Management Strategy

**Decision**: Derive lane assignments from task status (no separate state)

**Pattern**:
```tsx
const tasksByLane = useMemo(() => {
  return {
    pending: tasks.filter(t => t.status === 'pending'),
    error: tasks.filter(t => t.status === 'error' || t.status === 'needs_info'),
    finished: tasks.filter(t => t.status === 'completed')
  }
}, [tasks])
```

**Rationale**:
- Single source of truth (task status from backend)
- No sync issues between lane and status
- Leverages existing polling for updates
- Minimal state complexity

**Alternatives considered**:
- Separate lane state: Adds complexity, sync issues
- Redux/Zustand: Overkill for derived data

## Performance Considerations

**Measured metrics**:
- Animation frame rate: Target 60fps (16.6ms per frame)
- List rendering: React.memo on TaskCard to prevent re-renders
- Lane filtering: Memoized with useMemo (recalc only when tasks change)

**Optimizations planned**:
- Debounce expand/collapse animations (prevent rapid toggling)
- Use layout prop in Framer Motion (optimizes shared layout animations)
- Lazy load ActionEmblem icons (reduces initial bundle)

## Integration Points with Feature 001

**Existing infrastructure to leverage**:
- `/api/tasks` polling (500ms interval via TanStack Query)
- Task interface (extend with optional `lane` field for client-side tracking)
- Error handling patterns (reuse toast notifications for errors)
- API client utilities (retry logic, error parsing)

**New backend endpoints needed**:
- `POST /api/tasks/:id/retry` - Re-submit failed task (returns updated task)
- No backend changes needed for cancel (frontend-only)
- No backend changes needed for confirm (P4, deferred)
