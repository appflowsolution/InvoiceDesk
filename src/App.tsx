import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import Sidebar from './components/Sidebar';
import InvoiceForm from './components/InvoiceForm';
import InvoicesList from './components/InvoicesList';
import InvoiceView from './components/InvoiceView';
import Clients from './components/Clients';
import Projects from './components/Projects';
import Login from './components/Login';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <div className="flex min-h-screen bg-slate-50 font-sans">
                  <Sidebar />
                  <Routes>
                    <Route path="/invoices" element={<InvoicesList />} />
                    <Route path="/invoices/new" element={<InvoiceForm />} />
                    <Route path="/invoices/edit/:id" element={<InvoiceForm />} />
                    <Route path="/invoices/view/:id" element={<InvoiceView />} />
                    <Route path="/clients" element={<Clients />} />
                    <Route path="/projects" element={<Projects />} />
                    <Route path="*" element={<Navigate to="/invoices" replace />} />
                  </Routes>
                </div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
