import { useDocumentTitle } from '../lib/hooks';
import { Button } from '../components/ui';

export default function NotFound() {
  useDocumentTitle('Page not found');
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-6 text-center">
      <p className="text-6xl font-extrabold text-brand-600">404</p>
      <h1 className="mt-4 text-xl font-bold text-slate-900">Page not found</h1>
      <p className="mt-2 max-w-sm text-sm text-slate-500">The page you are looking for does not exist or has been moved.</p>
      <div className="mt-6 flex gap-2">
        <Button to="/dashboard">Go to Dashboard</Button>
        <Button variant="secondary" to="/">
          Home
        </Button>
      </div>
    </div>
  );
}
