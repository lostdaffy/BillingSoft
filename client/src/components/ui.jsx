import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import {
  ArrowPathIcon,
  CalendarDaysIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ExclamationCircleIcon,
  MagnifyingGlassIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { cx } from '../lib/cx';
import { STATUS_META } from '../lib/constants';
import { DATE_PRESETS, rangeForPreset } from '../lib/dates';

/* ------------------------------------------------------------------ Buttons */

const BUTTON_VARIANTS = {
  primary: 'bg-brand-600 text-white shadow-xs hover:bg-brand-700',
  secondary: 'bg-white text-slate-700 shadow-xs ring-1 ring-slate-300 ring-inset hover:bg-slate-50',
  ghost: 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
  danger: 'bg-rose-600 text-white shadow-xs hover:bg-rose-700',
  success: 'bg-emerald-600 text-white shadow-xs hover:bg-emerald-700',
  whatsapp: 'bg-[#25D366] text-white shadow-xs hover:bg-[#1ebe5b]',
  soft: 'bg-brand-50 text-brand-700 hover:bg-brand-100'
};

const BUTTON_SIZES = {
  sm: 'h-8 gap-1.5 px-2.5 text-xs',
  md: 'h-9 gap-2 px-3.5 text-sm',
  lg: 'h-11 gap-2 px-5 text-sm'
};

export function Spinner({ className = 'size-5' }) {
  return (
    <svg className={cx('animate-spin', className)} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  );
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon: Icon,
  iconRight: IconRight,
  to,
  href,
  className,
  children,
  disabled,
  type = 'button',
  ...props
}) {
  const classes = cx(
    'inline-flex shrink-0 items-center justify-center rounded-lg font-medium whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 disabled:pointer-events-none disabled:opacity-50',
    BUTTON_VARIANTS[variant],
    BUTTON_SIZES[size],
    className
  );
  const iconClass = size === 'sm' ? 'size-3.5' : 'size-4';
  const content = (
    <>
      {loading ? <Spinner className={iconClass} /> : Icon ? <Icon className={iconClass} /> : null}
      {children}
      {IconRight && <IconRight className={iconClass} />}
    </>
  );

  if (to) {
    return (
      <Link to={to} className={classes} {...props}>
        {content}
      </Link>
    );
  }
  if (href) {
    return (
      <a href={href} className={classes} {...props}>
        {content}
      </a>
    );
  }
  return (
    <button type={type} className={classes} disabled={disabled || loading} {...props}>
      {content}
    </button>
  );
}

export function IconButton({ icon: Icon, label, to, onClick, tone = 'default', className, disabled, ...props }) {
  const classes = cx(
    'inline-flex size-8 shrink-0 items-center justify-center rounded-lg transition-colors disabled:pointer-events-none disabled:opacity-40',
    tone === 'danger' ? 'text-slate-400 hover:bg-rose-50 hover:text-rose-600' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900',
    className
  );
  if (to) {
    return (
      <Link to={to} className={classes} title={label} aria-label={label} {...props}>
        <Icon className="size-[18px]" />
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} className={classes} title={label} aria-label={label} disabled={disabled} {...props}>
      <Icon className="size-[18px]" />
    </button>
  );
}

/* ------------------------------------------------------------------- Forms */

export function Field({ label, htmlFor, error, hint, required, className, children }) {
  return (
    <div className={className}>
      {label && (
        <label htmlFor={htmlFor} className="label">
          {label}
          {required && <span className="text-rose-500"> *</span>}
        </label>
      )}
      {children}
      {error ? (
        <p className="mt-1 text-xs text-rose-600">{error}</p>
      ) : hint ? (
        <p className="mt-1 text-xs text-slate-500">{hint}</p>
      ) : null}
    </div>
  );
}

export function TextInput({ label, error, hint, required, className, inputClassName, id, ...props }) {
  const autoId = useId();
  const inputId = id || autoId;
  return (
    <Field label={label} htmlFor={inputId} error={error} hint={hint} required={required} className={className}>
      <input id={inputId} className={cx('input', error && 'input-error', inputClassName)} required={required} {...props} />
    </Field>
  );
}

export function SelectInput({ label, options = [], placeholder, error, hint, required, className, inputClassName, id, ...props }) {
  const autoId = useId();
  const inputId = id || autoId;
  return (
    <Field label={label} htmlFor={inputId} error={error} hint={hint} required={required} className={className}>
      <select id={inputId} className={cx('input pr-8', error && 'input-error', inputClassName)} required={required} {...props}>
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </Field>
  );
}

export function TextArea({ label, error, hint, required, className, inputClassName, id, rows = 3, ...props }) {
  const autoId = useId();
  const inputId = id || autoId;
  return (
    <Field label={label} htmlFor={inputId} error={error} hint={hint} required={required} className={className}>
      <textarea id={inputId} rows={rows} className={cx('input resize-y', error && 'input-error', inputClassName)} required={required} {...props} />
    </Field>
  );
}

export function Toggle({ checked, onChange, label, description, disabled, className }) {
  return (
    <label className={cx('flex cursor-pointer items-start justify-between gap-4', disabled && 'cursor-not-allowed opacity-60', className)}>
      <span className="min-w-0">
        {label && <span className="block text-sm font-medium text-slate-800">{label}</span>}
        {description && <span className="mt-0.5 block text-xs text-slate-500">{description}</span>}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cx(
          'relative mt-0.5 inline-flex h-5 w-9 shrink-0 rounded-full transition-colors',
          checked ? 'bg-brand-600' : 'bg-slate-300'
        )}
      >
        <span className={cx('absolute top-0.5 left-0.5 size-4 rounded-full bg-white shadow transition-transform', checked && 'translate-x-4')} />
      </button>
    </label>
  );
}

export function Checkbox({ checked, onChange, label, className, disabled }) {
  return (
    <label className={cx('inline-flex cursor-pointer items-center gap-2 text-sm text-slate-700', className)}>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="size-4 rounded border-slate-300 accent-brand-600"
      />
      {label}
    </label>
  );
}

export function SegmentedControl({ options, value, onChange, className, size = 'md' }) {
  return (
    <div className={cx('inline-flex flex-wrap rounded-lg bg-slate-100 p-1', className)}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={cx(
            'rounded-md font-medium whitespace-nowrap transition-colors',
            size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-sm',
            value === option.value ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function SearchInput({ value, onChange, placeholder = 'Search...', className }) {
  return (
    <div className={cx('relative', className)}>
      <MagnifyingGlassIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
      <input type="search" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="input pl-9" />
    </div>
  );
}

export function DateRangeFilter({ value, onChange, className, allowAll = true }) {
  const presets = DATE_PRESETS.filter((preset) => allowAll || preset.value !== 'all');
  return (
    <div className={cx('flex flex-wrap items-center gap-2', className)}>
      <div className="relative">
        <CalendarDaysIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
        <select
          className="input w-auto pr-8 pl-9"
          value={value.preset}
          onChange={(e) => {
            const preset = e.target.value;
            const range = rangeForPreset(preset);
            onChange(range ? { preset, ...range } : { ...value, preset });
          }}
        >
          {presets.map((preset) => (
            <option key={preset.value} value={preset.value}>
              {preset.label}
            </option>
          ))}
        </select>
      </div>
      {value.preset === 'custom' && (
        <div className="flex items-center gap-2">
          <input type="date" className="input w-auto" value={value.from} max={value.to || undefined} onChange={(e) => onChange({ ...value, from: e.target.value })} />
          <span className="text-sm text-slate-400">to</span>
          <input type="date" className="input w-auto" value={value.to} min={value.from || undefined} onChange={(e) => onChange({ ...value, to: e.target.value })} />
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- Surfaces */

export function Card({ title, subtitle, actions, children, className, bodyClassName, padded = true }) {
  return (
    <section className={cx('card', className)}>
      {(title || actions) && (
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-5 py-3.5">
          <div className="min-w-0">
            {title && <h2 className="text-sm font-semibold text-slate-900">{title}</h2>}
            {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className={cx(padded && 'p-5', bodyClassName)}>{children}</div>
    </section>
  );
}

const BADGE_TONES = {
  gray: 'bg-slate-100 text-slate-700 ring-slate-500/15',
  green: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  amber: 'bg-amber-50 text-amber-800 ring-amber-600/20',
  red: 'bg-rose-50 text-rose-700 ring-rose-600/20',
  blue: 'bg-sky-50 text-sky-700 ring-sky-600/20',
  violet: 'bg-violet-50 text-violet-700 ring-violet-600/20',
  brand: 'bg-brand-50 text-brand-700 ring-brand-600/20'
};

const DOT_TONES = {
  gray: 'bg-slate-400',
  green: 'bg-emerald-500',
  amber: 'bg-amber-500',
  red: 'bg-rose-500',
  blue: 'bg-sky-500',
  violet: 'bg-violet-500',
  brand: 'bg-brand-500'
};

export function Badge({ tone = 'gray', dot = false, children, className }) {
  return (
    <span className={cx('inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ring-1 ring-inset', BADGE_TONES[tone], className)}>
      {dot && <span className={cx('size-1.5 rounded-full', DOT_TONES[tone])} />}
      {children}
    </span>
  );
}

export function StatusBadge({ status, overdue = false }) {
  const meta = overdue ? STATUS_META.OVERDUE : STATUS_META[status] || { label: status, tone: 'gray' };
  return (
    <Badge tone={meta.tone} dot>
      {meta.label}
    </Badge>
  );
}

const STAT_TONES = {
  brand: 'bg-brand-50 text-brand-600',
  green: 'bg-emerald-50 text-emerald-600',
  amber: 'bg-amber-50 text-amber-600',
  red: 'bg-rose-50 text-rose-600',
  blue: 'bg-sky-50 text-sky-600',
  violet: 'bg-violet-50 text-violet-600',
  gray: 'bg-slate-100 text-slate-600'
};

export function StatCard({ label, value, hint, icon: Icon, tone = 'brand', to, className }) {
  const body = (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-xs font-medium text-slate-500">{label}</p>
        <p className="mt-1 truncate text-lg font-bold text-slate-900 tabular-nums sm:text-xl">{value}</p>
        {hint && <p className="mt-0.5 truncate text-xs text-slate-500">{hint}</p>}
      </div>
      {Icon && (
        <div className={cx('flex size-9 shrink-0 items-center justify-center rounded-lg', STAT_TONES[tone])}>
          <Icon className="size-5" />
        </div>
      )}
    </div>
  );
  const classes = cx('card block p-4', to && 'transition hover:border-brand-200 hover:shadow-sm', className);
  return to ? (
    <Link to={to} className={classes}>
      {body}
    </Link>
  ) : (
    <div className={classes}>{body}</div>
  );
}

export function PageHeader({ title, subtitle, actions, backTo, badge }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-2">
        {backTo && <IconButton icon={ChevronLeftIcon} to={backTo} label="Back" className="-ml-2" />}
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="truncate text-xl font-bold text-slate-900 sm:text-2xl">{title}</h1>
            {badge}
          </div>
          {subtitle && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Tabs({ tabs, value, onChange, className }) {
  return (
    <div className={cx('flex gap-1 overflow-x-auto border-b border-slate-200', className)}>
      {tabs.map((tab) => (
        <button
          key={tab.value}
          type="button"
          onClick={() => onChange(tab.value)}
          className={cx(
            '-mb-px flex items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium whitespace-nowrap transition-colors',
            value === tab.value ? 'border-brand-600 text-brand-700' : 'border-transparent text-slate-500 hover:text-slate-800'
          )}
        >
          {tab.icon && <tab.icon className="size-4" />}
          {tab.label}
          {tab.count !== undefined && (
            <span className={cx('rounded-full px-1.5 py-0.5 text-[11px] leading-none', value === tab.value ? 'bg-brand-100 text-brand-700' : 'bg-slate-100 text-slate-500')}>
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, description, action, className }) {
  return (
    <div className={cx('flex flex-col items-center justify-center px-6 py-14 text-center', className)}>
      {Icon && (
        <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-brand-50 text-brand-600">
          <Icon className="size-6" />
        </div>
      )}
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-slate-500">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({ error, onRetry, className }) {
  return (
    <div className={cx('card flex flex-col items-center px-6 py-12 text-center', className)}>
      <div className="mb-3 flex size-11 items-center justify-center rounded-full bg-rose-50 text-rose-600">
        <ExclamationCircleIcon className="size-6" />
      </div>
      <p className="text-sm font-semibold text-slate-900">Could not load this page</p>
      <p className="mt-1 max-w-md text-sm text-slate-500">{error?.message || 'Something went wrong.'}</p>
      {onRetry && (
        <Button variant="secondary" icon={ArrowPathIcon} className="mt-4" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}

export function PageLoader({ label = 'Loading...', className }) {
  return (
    <div className={cx('flex flex-col items-center justify-center gap-3 py-24 text-slate-500', className)}>
      <Spinner className="size-7 text-brand-600" />
      <p className="text-sm">{label}</p>
    </div>
  );
}

export function Pagination({ page, pages, total, limit, onChange }) {
  if (!total) return null;
  const start = (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);
  return (
    <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-4 py-3">
      <p className="text-xs text-slate-500">
        Showing {start}-{end} of {total}
      </p>
      {pages > 1 && (
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" icon={ChevronLeftIcon} disabled={page <= 1} onClick={() => onChange(page - 1)}>
            Prev
          </Button>
          <Button size="sm" variant="secondary" iconRight={ChevronRightIcon} disabled={page >= pages} onClick={() => onChange(page + 1)}>
            Next
          </Button>
        </div>
      )}
    </div>
  );
}

/* ----------------------------------------------------------------- Overlays */

const MODAL_SIZES = { sm: 'sm:max-w-md', md: 'sm:max-w-lg', lg: 'sm:max-w-2xl', xl: 'sm:max-w-4xl' };

export function Modal({ open, onClose, title, description, size = 'md', children, footer }) {
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => {
      if (event.key === 'Escape') onCloseRef.current?.();
    };
    document.addEventListener('keydown', onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-[2px]" onClick={onClose} />
      <div role="dialog" aria-modal="true" className={cx('relative flex max-h-[92vh] w-full flex-col rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl', MODAL_SIZES[size])}>
        {title && (
          <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-slate-900">{title}</h2>
              {description && <p className="mt-0.5 text-sm text-slate-500">{description}</p>}
            </div>
            <IconButton icon={XMarkIcon} label="Close" onClick={onClose} className="-mr-2" />
          </div>
        )}
        <div className="overflow-y-auto px-5 py-5">{children}</div>
        {footer && <div className="flex flex-wrap justify-end gap-2 rounded-b-2xl border-t border-slate-100 bg-slate-50/70 px-5 py-3">{footer}</div>}
      </div>
    </div>,
    document.body
  );
}

export function Dropdown({ trigger, items, align = 'right', className }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDocument = (event) => {
      if (!ref.current?.contains(event.target)) setOpen(false);
    };
    const onKey = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDocument);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocument);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const visible = items.filter((item) => item && !item.hidden);
  const itemClass = (item) =>
    cx(
      'flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors disabled:opacity-50',
      item.danger ? 'text-rose-600 hover:bg-rose-50' : 'text-slate-700 hover:bg-slate-50'
    );

  return (
    <div ref={ref} className={cx('relative inline-block', className)}>
      {trigger({ open, toggle: () => setOpen((value) => !value) })}
      {open && (
        <div className={cx('absolute z-40 mt-1.5 min-w-52 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg', align === 'right' ? 'right-0' : 'left-0')}>
          {visible.map((item, index) => {
            if (item.divider) return <div key={`divider-${index}`} className="my-1 border-t border-slate-100" />;
            const content = (
              <>
                {item.icon && <item.icon className="size-4 shrink-0 opacity-70" />}
                <span className="truncate">{item.label}</span>
              </>
            );
            if (item.to) {
              return (
                <Link key={item.label} to={item.to} className={itemClass(item)} onClick={() => setOpen(false)}>
                  {content}
                </Link>
              );
            }
            if (item.href) {
              return (
                <a key={item.label} href={item.href} target="_blank" rel="noreferrer" className={itemClass(item)} onClick={() => setOpen(false)}>
                  {content}
                </a>
              );
            }
            return (
              <button
                key={item.label}
                type="button"
                disabled={item.disabled}
                className={itemClass(item)}
                onClick={() => {
                  setOpen(false);
                  item.onClick?.();
                }}
              >
                {content}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/**
 * Text input with a filtered suggestion list. The list is portalled with fixed
 * positioning so it is never clipped by scrolling tables or modals.
 */
export function Combobox({
  value,
  onChange,
  onSelect,
  options,
  renderOption,
  getOptionKey = (option, index) => option._id || index,
  placeholder,
  inputClassName,
  emptyMessage,
  footer,
  id,
  disabled,
  autoFocus,
  error
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [rect, setRect] = useState(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  const updateRect = useCallback(() => {
    if (inputRef.current) setRect(inputRef.current.getBoundingClientRect());
  }, []);

  useLayoutEffect(() => {
    if (!open) return undefined;
    updateRect();
    window.addEventListener('scroll', updateRect, true);
    window.addEventListener('resize', updateRect);
    return () => {
      window.removeEventListener('scroll', updateRect, true);
      window.removeEventListener('resize', updateRect);
    };
  }, [open, updateRect]);

  useEffect(() => {
    if (!open) return undefined;
    const onDocument = (event) => {
      if (!inputRef.current?.contains(event.target) && !listRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocument);
    return () => document.removeEventListener('mousedown', onDocument);
  }, [open]);

  const close = () => setOpen(false);
  const choose = (option) => {
    onSelect(option);
    setOpen(false);
  };

  const onKeyDown = (event) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setOpen(true);
      setActive((index) => Math.min(index + 1, Math.max(options.length - 1, 0)));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive((index) => Math.max(index - 1, 0));
    } else if (event.key === 'Enter' && open && options[active]) {
      event.preventDefault();
      choose(options[active]);
    } else if (event.key === 'Escape' || event.key === 'Tab') {
      setOpen(false);
    }
  };

  let listStyle = null;
  if (open && rect) {
    const width = Math.max(rect.width, 300);
    const left = Math.max(8, Math.min(rect.left, window.innerWidth - width - 8));
    const spaceBelow = window.innerHeight - rect.bottom;
    const dropUp = spaceBelow < 280 && rect.top > spaceBelow;
    listStyle = { position: 'fixed', left, width, ...(dropUp ? { bottom: window.innerHeight - rect.top + 4 } : { top: rect.bottom + 4 }) };
  }
  const hasContent = options.length > 0 || footer || emptyMessage;

  return (
    <>
      <input
        ref={inputRef}
        id={id}
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        autoFocus={autoFocus}
        autoComplete="off"
        className={cx('input', error && 'input-error', inputClassName)}
        onChange={(event) => {
          onChange(event.target.value);
          setOpen(true);
          setActive(0);
        }}
        onFocus={() => setOpen(true)}
        onClick={() => setOpen(true)}
        onKeyDown={onKeyDown}
      />
      {listStyle &&
        hasContent &&
        createPortal(
          <div ref={listRef} style={listStyle} className="z-[60] max-h-72 overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 shadow-xl">
            {options.map((option, index) => (
              <button
                type="button"
                key={getOptionKey(option, index)}
                onMouseDown={(event) => event.preventDefault()}
                onMouseEnter={() => setActive(index)}
                onClick={() => choose(option)}
                className={cx('block w-full px-3 py-2 text-left text-sm', index === active ? 'bg-brand-50' : 'hover:bg-slate-50')}
              >
                {renderOption(option)}
              </button>
            ))}
            {!options.length && emptyMessage && <p className="px-3 py-2 text-sm text-slate-500">{emptyMessage}</p>}
            {footer && (
              <div className="border-t border-slate-100" onMouseDown={(event) => event.preventDefault()}>
                {footer(close)}
              </div>
            )}
          </div>,
          document.body
        )}
    </>
  );
}

export function Avatar({ name, src, className }) {
  if (src) return <img src={src} alt="" className={cx('rounded-lg object-contain', className)} />;
  const letters = String(name || '?')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
  return <div className={cx('flex items-center justify-center rounded-lg bg-brand-100 font-semibold text-brand-700', className)}>{letters || '?'}</div>;
}
