import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import MainPage from './pages/MainPage';
import Login from './pages/Login';
import Logout from './pages/Logout';
import Callback from './pages/Callback';
import './App.css';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter basename="/imageinf/ui">
        <Routes>
          <Route path="/" element={<MainPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/logout" element={<Logout />} />
          <Route path="/auth/callback" element={<Callback />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
