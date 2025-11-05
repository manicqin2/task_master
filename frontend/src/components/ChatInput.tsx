/**
 * ChatInput component - Input field for task submission
 */
import { useState, KeyboardEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send } from 'lucide-react';

interface ChatInputProps {
  onSubmit: (input: string) => void;
  disabled?: boolean;
}

export function ChatInput({ onSubmit, disabled = false }: ChatInputProps) {
  const [input, setInput] = useState('');

  const handleSubmit = () => {
    const trimmedInput = input.trim();
    if (!trimmedInput) return; // FR-010: Prevent empty submission

    onSubmit(trimmedInput);
    setInput(''); // Clear input after submission (SC-001)
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const isSubmitDisabled = disabled || !input.trim(); // FR-010

  return (
    <div className="flex gap-2 p-4 border-t">
      <Input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Enter a task..."
        disabled={disabled}
        className="flex-1"
      />
      <Button
        onClick={handleSubmit}
        disabled={isSubmitDisabled}
        size="icon"
      >
        <Send className="h-4 w-4" />
      </Button>
    </div>
  );
}
