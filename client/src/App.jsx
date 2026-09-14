import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes, useLocation, useParams } from 'react-router-dom';
import { ArrowPathIcon, CloudIcon } from '@heroicons/react/24/outline';
import { useAuth } from './context/AuthContext';
import AppLayout from './components/AppLayout';
import { Button, Spinner } from './components/ui';

const Landing = lazy(() => import('./pages/Landing'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const NotFound = lazy(() => import('./pages/NotFound'));
const PublicInvoice = lazy(() => import('./pages/PublicInvoice'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const SalesList = lazy(() => import('./pages/sales/SalesList'));
const SalesForm = lazy(() => import('./pages/sales/SalesForm'));
const SalesView = lazy(() => import('./pages/sales/SalesView'));
const PurchaseList = lazy(() => import('./pages/purchases/PurchaseList'));
const PurchaseForm = lazy(() => import('./pages/purchases/PurchaseForm'));
const PurchaseView = lazy(() => import('./pages/purchases/PurchaseView'));
const Parties = lazy(() => import('./pages/parties/Parties'));
const PartyDetail = lazy(() => import('./pages/parties/PartyDetail'));
const Items = lazy(() => import('./pages/Items'));
const Expenses = lazy(() => import('./pages/Expenses'));
const Payments = lazy(() => import('./pages/Payments'));
const Reports = lazy(() => import('./pages/reports/Reports'));
const Settings = lazy(() => import('./pages/settings/Settings'));

function FullScreen({ children }) {
  return <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50 p-6 text-center">{children}</div>;
}

function SessionGate({ children, guestOnly = false }) {
  const { user, status, slowStart, retry } = useAuth();
  const location = useLocation();

  if (status === 'loading') {
    return (
      <FullScreen>
        <Spinner className="size-8 text-brand-600" />
        <p className="max-w-sm text-sm text-slate-500">
          {slowStart ? 'Waking up the server. The first load can take up to a minute...' : 'Loading your workspace...'}
        </p>
      </FullScreen>
    );
  }

  if (status === 'offline') {
    return (
      <FullScreen>
        <div className="flex size-12 items-center justify-center rounded-full bg-amber-50 text-amber-600">
          <CloudIcon className="size-6" />
        </div>
        <div>
          <p className="font-semibold text-slate-900">Cannot connect to the server</p>
          <p className="mt-1 text-sm text-slate-500">Please check your internet connection and try again.</p>
        </div>
        <Button icon={ArrowPathIcon} onClick={retry}>
          Retry
        </Button>
      </FullScreen>
    );
  }

  if (guestOnly) return user ? <Navigate to={location.state?.from || '/dashboard'} replace /> : children;
  return user ? children : <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
}

function LegacyInvoiceRedirect() {
  const { id } = useParams();
  return <Navigate to={`/sales/${id}`} replace />;
}

export default function App() {
  return (
    <Suspense
      fallback={
        <FullScreen>
          <Spinner className="size-8 text-brand-600" />
        </FullScreen>
      }
    >
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<SessionGate guestOnly><Login /></SessionGate>} />
        <Route path="/register" element={<SessionGate guestOnly><Register /></SessionGate>} />
        <Route path="/share/:token" element={<PublicInvoice />} />

        <Route element={<SessionGate><AppLayout /></SessionGate>}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/sales" element={<SalesList key="invoices" kind="invoices" />} />
          <Route path="/quotations" element={<SalesList key="quotations" kind="quotations" />} />
          <Route path="/sales/new" element={<SalesForm />} />
          <Route path="/sales/:id" element={<SalesView />} />
          <Route path="/sales/:id/edit" element={<SalesForm />} />
          <Route path="/purchases" element={<PurchaseList />} />
          <Route path="/purchases/new" element={<PurchaseForm />} />
          <Route path="/purchases/:id" element={<PurchaseView />} />
          <Route path="/purchases/:id/edit" element={<PurchaseForm />} />
          <Route path="/parties" element={<Parties />} />
          <Route path="/parties/:id" element={<PartyDetail />} />
          <Route path="/items" element={<Items />} />
          <Route path="/expenses" element={<Expenses />} />
          <Route path="/payments" element={<Payments />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/settings" element={<Settings />} />

          {/* v1 URLs */}
          <Route path="/invoices" element={<Navigate to="/sales" replace />} />
          <Route path="/invoices/create" element={<Navigate to="/sales/new" replace />} />
          <Route path="/invoices/view/:id" element={<LegacyInvoiceRedirect />} />
          <Route path="/invoices/edit/:id" element={<LegacyInvoiceRedirect />} />
          <Route path="/clients" element={<Navigate to="/parties" replace />} />
          <Route path="/products" element={<Navigate to="/items" replace />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}
