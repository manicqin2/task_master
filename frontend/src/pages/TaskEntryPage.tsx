/**
 * TaskEntryPage - Main application page
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Navigation, NavigationTab } from '@/components/Navigation/Navigation';
import { LaneWorkflow } from '@/components/LaneWorkflow/LaneWorkflow';
import { TodoList } from '@/components/Todos/TodoList';
import { QueryBar } from '@/components/QueryBar/QueryBar';
import { ProjectsView } from '@/components/Projects/ProjectsView';
import { PersonsView } from '@/components/Persons/PersonsView';
import { AgendaView } from '@/components/Agenda/AgendaView';
import { listTodoTasks, updateTaskStatus, createTask } from '@/services/api';

export function TaskEntryPage() {
  const [activeTab, setActiveTab] = useState<NavigationTab>('workbench');
  const [queryInput, setQueryInput] = useState('');
  const queryClient = useQueryClient();

  // Fetch todos
  const { data: todosData } = useQuery({
    queryKey: ['todo-tasks'],
    queryFn: listTodoTasks,
    refetchInterval: 2000, // Poll every 2s
  });

  const todos = todosData?.tasks || [];

  // Create task mutation
  const createTaskMutation = useMutation({
    mutationFn: createTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workbench-tasks'] });
      setQueryInput(''); // Clear input after successful creation
    },
  });

  // Finish todo mutation
  const finishMutation = useMutation({
    mutationFn: (taskId: string) => updateTaskStatus(taskId, 'completed'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['todo-tasks'] });
    },
  });

  // Archive todo mutation
  const archiveMutation = useMutation({
    mutationFn: (taskId: string) => updateTaskStatus(taskId, 'archived'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['todo-tasks'] });
    },
  });

  const handleCreateTask = (userInput: string) => {
    createTaskMutation.mutate(userInput);
  };

  const handleFinish = (taskId: string) => {
    finishMutation.mutate(taskId);
  };

  const handleArchive = (taskId: string) => {
    archiveMutation.mutate(taskId);
  };

  const handleRephraseTask = (originalText: string) => {
    // If there's already text, append with separator
    if (queryInput.trim()) {
      setQueryInput(queryInput + '\n\n' + originalText);
    } else {
      setQueryInput(originalText);
    }
  };

  return (
    <div className="flex flex-col h-screen w-full bg-white">
      {/* Navigation */}
      <div className="flex-none px-6 py-4 border-b border-gray-200">
        <Navigation activeTab={activeTab} onTabChange={setActiveTab} />
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden px-6 py-6">
        {activeTab === 'workbench' && (
          <div className="flex flex-col h-full gap-4">
            <QueryBar
              onSubmit={handleCreateTask}
              isLoading={createTaskMutation.isPending}
              value={queryInput}
              onChange={setQueryInput}
            />
            <div className="flex-1 overflow-hidden">
              <LaneWorkflow onRephrase={handleRephraseTask} />
            </div>
          </div>
        )}

        {activeTab === 'todos' && (
          <div className="h-full overflow-y-auto">
            <TodoList
              tasks={todos}
              onFinish={handleFinish}
              onArchive={handleArchive}
            />
          </div>
        )}

        {activeTab === 'projects' && <ProjectsView />}
        {activeTab === 'persons' && <PersonsView />}
        {activeTab === 'agenda' && <AgendaView />}
      </div>
    </div>
  );
}
