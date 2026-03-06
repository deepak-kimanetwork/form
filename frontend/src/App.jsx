import { BrowserRouter, Routes, Route } from 'react-router-dom';
import AdminDashboard from './pages/AdminDashboard';
import AICreate from './pages/AICreate';
import FormBuilder from './pages/FormBuilder';
import PublicForm from './pages/PublicForm';
import Responses from './pages/Responses';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AdminDashboard />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/create" element={<AICreate />} />
        <Route path="/admin/builder" element={<FormBuilder />} />
        <Route path="/forms/:formId" element={<PublicForm />} />
        <Route path="/responses" element={<Responses />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
