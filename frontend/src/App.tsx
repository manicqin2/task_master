import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TaskEntryPage } from './pages/TaskEntryPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TaskEntryPage />
    </QueryClientProvider>
  );
}

export default App;
