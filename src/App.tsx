import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import MainLayout from "@/components/layout/MainLayout";
import Dashboard from "@/pages/Dashboard";
import TaskList from "@/pages/TaskList";
import TaskDetail from "@/pages/TaskDetail";
import CreateTask from "@/pages/CreateTask";
import Monitoring from "@/pages/Monitoring";
import Alerts from "@/pages/Alerts";
import Approvals from "@/pages/Approvals";
import Reports from "@/pages/Reports";
import Export from "@/pages/Export";
import Recommendations from "@/pages/Recommendations";
import Statistics from "@/pages/Statistics";
import Settings from "@/pages/Settings";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 30000,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <Routes>
          <Route element={<MainLayout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/tasks" element={<TaskList />} />
            <Route path="/tasks/:id" element={<TaskDetail />} />
            <Route path="/tasks/create" element={<CreateTask />} />
            <Route path="/monitoring" element={<Monitoring />} />
            <Route path="/alerts" element={<Alerts />} />
            <Route path="/approvals" element={<Approvals />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/export" element={<Export />} />
            <Route path="/recommendations" element={<Recommendations />} />
            <Route path="/statistics" element={<Statistics />} />
            <Route path="/settings" element={<Settings />} />
          </Route>
        </Routes>
      </Router>
    </QueryClientProvider>
  );
}
