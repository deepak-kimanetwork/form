import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AdminDashboard from './pages/AdminDashboard';
import AICreate from './pages/AICreate';
import FormBuilder from './pages/FormBuilder';
import PublicForm from './pages/PublicForm';
import Responses from './pages/Responses';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Templates from './pages/Templates';
import Documentation from './pages/Documentation';
import { AuthProvider, useAuth } from './contexts/AuthContext';

const ProtectedRoute = ({ children }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return children;
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
          <Route path="/create" element={<ProtectedRoute><AICreate /></ProtectedRoute>} />
          <Route path="/admin/builder" element={<ProtectedRoute><FormBuilder /></ProtectedRoute>} />
          <Route path="/responses" element={<ProtectedRoute><Responses /></ProtectedRoute>} />
          <Route path="/templates" element={<ProtectedRoute><Templates /></ProtectedRoute>} />
          <Route path="/docs" element={<ProtectedRoute><Documentation /></ProtectedRoute>} />
          <Route path="/forms/:formId" element={<PublicForm />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
