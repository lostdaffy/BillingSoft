import { Link } from 'react-router-dom';
import { CheckCircleIcon } from '@heroicons/react/24/outline';
import { APP_NAME } from '../config';

const POINTS = [
  'GST invoices with automatic CGST, SGST and IGST',
  'Quotations, purchases, expenses and stock in one place',
  'Share invoices on WhatsApp and collect payments by UPI',
  'GST summary, party ledgers and profit & loss reports'
];

export default function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <div className="flex min-h-screen bg-white">
      <div className="relative hidden w-[46%] flex-col justify-between overflow-hidden bg-brand-700 p-12 text-white lg:flex">
        <div className="absolute -top-24 -right-24 size-96 rounded-full bg-brand-500/40 blur-3xl" />
        <div className="absolute -bottom-32 -left-20 size-96 rounded-full bg-violet-500/30 blur-3xl" />
        <Link to="/" className="relative flex items-center gap-2.5">
          <img src="/favicon.svg" alt="" className="size-9 rounded-lg ring-2 ring-white/20" />
          <span className="text-xl font-bold">{APP_NAME}</span>
        </Link>
        <div className="relative">
          <h2 className="max-w-md text-3xl leading-tight font-bold">Billing software that keeps your business moving.</h2>
          <ul className="mt-8 space-y-4 text-brand-100">
            {POINTS.map((point) => (
              <li key={point} className="flex items-start gap-3">
                <CheckCircleIcon className="mt-0.5 size-5 shrink-0 text-emerald-300" />
                {point}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-sm text-brand-200">Built for shops, traders, distributors, manufacturers and service businesses.</p>
      </div>

      <div className="flex flex-1 flex-col justify-center px-5 py-10 sm:px-12">
        <div className="mx-auto w-full max-w-sm">
          <Link to="/" className="mb-8 flex items-center gap-2 lg:hidden">
            <img src="/favicon.svg" alt="" className="size-8" />
            <span className="text-lg font-bold text-slate-900">{APP_NAME}</span>
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
          <div className="mt-8">{children}</div>
          {footer && <div className="mt-6 text-center text-sm text-slate-600">{footer}</div>}
        </div>
      </div>
    </div>
  );
}
