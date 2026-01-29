import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuth } from './context/AuthContext';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Invoices from './pages/Invoices';
import CreateInvoice from './pages/CreateInvoice';
import EditInvoice from './pages/EditInvoice';
import ViewInvoice from './pages/ViewInvoice';
import Clients from './pages/Clients';
import Products from './pages/Products';
import Settings from './pages/Settings';

// Layout
import Layout from './components/layout/Layout';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  return user ? children : <Navigate to="/login" />;
};

function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" />
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        
        {/* Protected Routes */}
        <Route path="/" element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }>
          <Route index element={<Dashboard />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="invoices" element={<Invoices />} />
          <Route path="invoices/create" element={<CreateInvoice />} />
          <Route path="invoices/edit/:id" element={<EditInvoice />} />
          <Route path="invoices/view/:id" element={<ViewInvoice />} />
          <Route path="clients" element={<Clients />} />
          <Route path="products" element={<Products />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
