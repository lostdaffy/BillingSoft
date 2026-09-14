import { Link } from 'react-router-dom';
import {
  ArrowRightIcon,
  BanknotesIcon,
  ChartBarIcon,
  CheckCircleIcon,
  CloudIcon,
  CubeIcon,
  DevicePhoneMobileIcon,
  DocumentDuplicateIcon,
  DocumentTextIcon,
  ReceiptPercentIcon,
  ShareIcon,
  ShieldCheckIcon,
  ShoppingCartIcon,
  UsersIcon
} from '@heroicons/react/24/outline';
import { APP_NAME } from '../config';
import { useAuth } from '../context/AuthContext';
import { useDocumentTitle } from '../lib/hooks';
import { Button } from '../components/ui';

const FEATURES = [
  { icon: DocumentTextIcon, title: 'GST Invoices in Seconds', text: 'Professional tax invoices with automatic CGST, SGST and IGST, HSN summary, amount in words and your logo.' },
  { icon: DocumentDuplicateIcon, title: 'Quotations & Estimates', text: 'Send quotations, estimates and proforma invoices, then convert them into invoices with one click.' },
  { icon: CubeIcon, title: 'Inventory & Stock', text: 'Stock updates automatically with every sale and purchase, with low-stock alerts on your dashboard.' },
  { icon: ShoppingCartIcon, title: 'Purchases & Expenses', text: 'Record supplier bills and day-to-day expenses to track costs and input GST credit.' },
  { icon: BanknotesIcon, title: 'Payments & Reminders', text: 'Record full or part payments, see exactly who owes you and send WhatsApp reminders instantly.' },
  { icon: ReceiptPercentIcon, title: 'GST Reports', text: 'GSTR-1 style B2B, B2C and HSN summaries with input tax credit and net GST payable.' },
  { icon: UsersIcon, title: 'Party Ledgers', text: 'A complete account statement for every customer and supplier with running balances.' },
  { icon: ChartBarIcon, title: 'Business Insights', text: 'Sales trends, profit & loss, receivables ageing and stock valuation at a glance.' },
  { icon: ShareIcon, title: 'Share, Print & Get Paid', text: 'Share a secure invoice link, print crisp A4 PDFs and collect money with a UPI QR code.' }
];

const STEPS = [
  { title: 'Set up your business', text: 'Add your GSTIN, logo, bank and UPI details once. They appear on every document automatically.' },
  { title: 'Add parties and items', text: 'Save customers, suppliers and products with HSN codes, prices and GST rates.' },
  { title: 'Bill, share and get paid', text: 'Create invoices in seconds, share them on WhatsApp and track every rupee received.' }
];

function InvoiceMockup() {
  const rows = [
    ['Steel Chair', '4', '4,720.00'],
    ['Office Table', '1', '9,440.00'],
    ['Installation', '1', '590.00']
  ];
  return (
    <div className="relative mx-auto w-full max-w-md">
      <div className="absolute -inset-4 rounded-3xl bg-linear-to-tr from-brand-200/70 via-violet-200/50 to-emerald-100/70 blur-2xl" />
      <div className="relative rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <div className="size-9 rounded-lg bg-brand-600" />
            <div>
              <p className="text-sm font-bold text-slate-900">Sharma Traders</p>
              <p className="text-[10px] text-slate-500">GSTIN 09AAACH7409R1ZZ</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs font-bold tracking-wide text-brand-600">TAX INVOICE</p>
            <p className="text-[10px] text-slate-500">INV/26-27/0042</p>
          </div>
        </div>
        <div className="mt-5 rounded-lg bg-slate-50 p-3 text-[11px]">
          <p className="text-slate-500">Bill To</p>
          <p className="font-semibold text-slate-900">Gupta Hardware Stores</p>
          <p className="text-slate-500">Lucknow, Uttar Pradesh</p>
        </div>
        <table className="mt-4 w-full text-[11px]">
          <thead>
            <tr className="border-b border-slate-100 text-left text-slate-500">
              <th className="pb-1.5 font-medium">Item</th>
              <th className="pb-1.5 text-right font-medium">Qty</th>
              <th className="pb-1.5 text-right font-medium">Amount</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([item, qty, amount]) => (
              <tr key={item} className="border-b border-slate-50">
                <td className="py-1.5 text-slate-800">{item}</td>
                <td className="py-1.5 text-right text-slate-600">{qty}</td>
                <td className="py-1.5 text-right text-slate-800">₹{amount}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-3 space-y-1 text-[11px]">
          {[
            ['Taxable Amount', '₹12,500.00'],
            ['CGST @ 9%', '₹1,125.00'],
            ['SGST @ 9%', '₹1,125.00']
          ].map(([label, value]) => (
            <div key={label} className="flex justify-between text-slate-600">
              <span>{label}</span>
              <span>{value}</span>
            </div>
          ))}
          <div className="flex justify-between border-t border-slate-100 pt-1.5 text-sm font-bold text-slate-900">
            <span>Total</span>
            <span>₹14,750.00</span>
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between rounded-lg bg-emerald-50 px-3 py-2 text-[11px]">
          <span className="flex items-center gap-1.5 font-medium text-emerald-700">
            <CheckCircleIcon className="size-4" />
            Paid via UPI
          </span>
          <span className="font-semibold text-emerald-700">₹14,750.00</span>
        </div>
      </div>
      <div className="absolute -bottom-6 -left-4 hidden rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-xl sm:block">
        <p className="text-[10px] text-slate-500">Shared on WhatsApp</p>
        <p className="text-sm font-semibold text-slate-900">Invoice viewed by customer</p>
      </div>
    </div>
  );
}

export default function Landing() {
  useDocumentTitle('GST Billing & Invoicing Software');
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-30 border-b border-slate-100 bg-white/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-2.5">
            <img src="/favicon.svg" alt="" className="size-8" />
            <span className="text-lg font-bold text-slate-900">{APP_NAME}</span>
          </Link>
          <nav className="hidden items-center gap-8 text-sm font-medium text-slate-600 md:flex">
            <a href="#features" className="hover:text-slate-900">
              Features
            </a>
            <a href="#how-it-works" className="hover:text-slate-900">
              How it works
            </a>
          </nav>
          <div className="flex items-center gap-2">
            {user ? (
              <Button to="/dashboard" iconRight={ArrowRightIcon}>
                Open Dashboard
              </Button>
            ) : (
              <>
                <Button variant="ghost" to="/login">
                  Log in
                </Button>
                <Button to="/register">Start Free</Button>
              </>
            )}
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-[480px] bg-linear-to-b from-brand-50/80 to-white" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-14 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:px-8 lg:py-24">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-semibold text-brand-700 shadow-xs ring-1 ring-brand-200">
              <ReceiptPercentIcon className="size-4" /> Made for Indian GST businesses
            </span>
            <h1 className="mt-6 text-4xl leading-[1.1] font-extrabold tracking-tight text-slate-900 sm:text-5xl">
              Billing, stock and accounts. <span className="text-brand-600">Done right.</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg text-slate-600">
              {APP_NAME} helps you create GST invoices, manage inventory, track payments and file-ready GST summaries, from your laptop or phone.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button size="lg" to={user ? '/dashboard' : '/register'} iconRight={ArrowRightIcon}>
                {user ? 'Go to Dashboard' : 'Create Free Account'}
              </Button>
              {!user && (
                <Button size="lg" variant="secondary" to="/login">
                  I already have an account
                </Button>
              )}
            </div>
            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-sm text-slate-600">
              {[
                [ShieldCheckIcon, 'Secure & private'],
                [DevicePhoneMobileIcon, 'Works on mobile'],
                [CloudIcon, 'Data backed up in the cloud']
              ].map(([Icon, label]) => (
                <span key={label} className="flex items-center gap-2">
                  <Icon className="size-5 text-brand-600" />
                  {label}
                </span>
              ))}
            </div>
          </div>
          <InvoiceMockup />
        </div>
      </section>

      <section id="features" className="scroll-mt-16 border-t border-slate-100 bg-slate-50 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold text-brand-600">Everything in one place</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">All the tools a growing business needs</h2>
            <p className="mt-4 text-slate-600">From the first quotation to the final payment and your GST summary, without juggling spreadsheets.</p>
          </div>
          <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature) => (
              <div key={feature.title} className="rounded-2xl border border-slate-200 bg-white p-6 transition hover:-translate-y-0.5 hover:shadow-md">
                <div className="flex size-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                  <feature.icon className="size-6" />
                </div>
                <h3 className="mt-4 font-semibold text-slate-900">{feature.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{feature.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="scroll-mt-16 py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-center text-3xl font-bold tracking-tight text-slate-900">Start billing in three steps</h2>
          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {STEPS.map((step, index) => (
              <div key={step.title} className="text-center">
                <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-brand-600 text-lg font-bold text-white">{index + 1}</div>
                <h3 className="mt-4 font-semibold text-slate-900">{step.title}</h3>
                <p className="mt-2 text-sm text-slate-600">{step.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 pb-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl rounded-3xl bg-brand-700 px-8 py-14 text-center text-white shadow-xl">
          <h2 className="text-3xl font-bold">Ready to simplify your billing?</h2>
          <p className="mx-auto mt-3 max-w-xl text-brand-100">Create your account and send your first GST invoice today.</p>
          <Button size="lg" variant="secondary" className="mt-8" to={user ? '/dashboard' : '/register'} iconRight={ArrowRightIcon}>
            {user ? 'Open Dashboard' : 'Get Started Free'}
          </Button>
        </div>
      </section>

      <footer className="border-t border-slate-100 py-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 text-sm text-slate-500 sm:flex-row sm:px-6 lg:px-8">
          <p>
            © {new Date().getFullYear()} {APP_NAME}. All rights reserved.
          </p>
          <div className="flex gap-6">
            <Link to="/login" className="hover:text-slate-900">
              Log in
            </Link>
            <Link to="/register" className="hover:text-slate-900">
              Sign up
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
