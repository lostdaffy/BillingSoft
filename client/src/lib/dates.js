import { todayInput } from './format';

const pad = (n) => String(n).padStart(2, '0');
const ymd = (year, monthIndex, day) => {
  const d = new Date(Date.UTC(year, monthIndex, day));
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
};

export const DATE_PRESETS = [
  { value: 'today', label: 'Today' },
  { value: 'this_week', label: 'Last 7 Days' },
  { value: 'this_month', label: 'This Month' },
  { value: 'last_month', label: 'Last Month' },
  { value: 'this_quarter', label: 'This Quarter' },
  { value: 'this_fy', label: 'This Financial Year' },
  { value: 'last_fy', label: 'Last Financial Year' },
  { value: 'all', label: 'All Time' },
  { value: 'custom', label: 'Custom Range' }
];

export const financialYearStart = (reference = todayInput()) => {
  const [y, m] = reference.split('-').map(Number);
  return m >= 4 ? y : y - 1;
};

export const rangeForPreset = (preset) => {
  const today = todayInput();
  const [y, m, d] = today.split('-').map(Number);
  const month = m - 1;

  switch (preset) {
    case 'today':
      return { from: today, to: today };
    case 'this_week':
      return { from: ymd(y, month, d - 6), to: today };
    case 'this_month':
      return { from: ymd(y, month, 1), to: ymd(y, month + 1, 0) };
    case 'last_month':
      return { from: ymd(y, month - 1, 1), to: ymd(y, month, 0) };
    case 'this_quarter': {
      // Indian FY quarters: Apr-Jun, Jul-Sep, Oct-Dec, Jan-Mar
      const q = Math.floor((((month - 3) % 12) + 12) % 12 / 3);
      const startMonth = 3 + q * 3;
      const startYear = month < 3 ? y - 1 : y;
      return { from: ymd(startYear, startMonth, 1), to: ymd(startYear, startMonth + 3, 0) };
    }
    case 'this_fy': {
      const start = financialYearStart(today);
      return { from: ymd(start, 3, 1), to: ymd(start + 1, 2, 31) };
    }
    case 'last_fy': {
      const start = financialYearStart(today) - 1;
      return { from: ymd(start, 3, 1), to: ymd(start + 1, 2, 31) };
    }
    case 'all':
      return { from: '', to: '' };
    default:
      return null;
  }
};

export const makeRange = (preset) => ({ preset, ...(rangeForPreset(preset) || { from: '', to: '' }) });

export const rangeParams = (range) => {
  if (!range) return {};
  const params = {};
  if (range.from) params.from = range.from;
  if (range.to) params.to = range.to;
  // "All time" must be explicit, otherwise report endpoints default to the current FY.
  if (!range.from && !range.to) params.from = '2000-01-01';
  return params;
};

export const rangeLabel = (range) => {
  if (!range) return '';
  const preset = DATE_PRESETS.find((p) => p.value === range.preset);
  if (preset && range.preset !== 'custom') return preset.label;
  return [range.from, range.to].filter(Boolean).join(' to ') || 'All Time';
};
