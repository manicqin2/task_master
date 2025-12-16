/**
 * QueryBar Component
 *
 * Input bar for creating new tasks via natural language.
 * Displays at the top of the Workbench view.
 *
 * @feature 001-chat-task-entry
 */

import { useState, FormEvent } from 'react';
import { Send } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface QueryBarProps {
  /**
   * Callback when user submits a task
   */
  onSubmit: (userInput: string) => void;

  /**
   * Whether submission is in progress
   */
  isLoading?: boolean;

  /**
   * Controlled value (optional)
   */
  value?: string;

  /**
   * Callback when value changes (optional)
   */
  onChange?: (value: string) => void;

  /**
   * Additional CSS classes
   */
  className?: string;
}

/**
 * QueryBar component - input for creating new tasks
 */
export function QueryBar({ onSubmit, isLoading = false, value, onChange, className }: QueryBarProps) {
  const [internalInput, setInternalInput] = useState('');

  // Use controlled or uncontrolled mode
  const input = value !== undefined ? value : internalInput;
  const setInput = onChange !== undefined ? onChange : setInternalInput;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      onSubmit(input.trim());
      setInput('');
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={cn(
        'flex items-center gap-3 bg-white border border-gray-200 rounded-xl px-4 py-3',
        'focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500',
        className
      )}
    >
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="What do you need to do?"
        disabled={isLoading}
        className={cn(
          'flex-1 bg-transparent border-none outline-none',
          'text-base text-neutral-950 placeholder:text-gray-400',
          'disabled:opacity-50'
        )}
      />
      <button
        type="submit"
        disabled={!input.trim() || isLoading}
        className={cn(
          'flex items-center justify-center w-9 h-9 rounded-lg',
          'bg-blue-600 text-white transition-colors',
          'hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed'
        )}
        aria-label="Submit task"
      >
        <Send className="w-4 h-4" />
      </button>
    </form>
  );
}
