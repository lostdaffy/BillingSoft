// Documents store calendar dates as UTC midnight (what new Date("yyyy-MM-dd") yields),
// so all range maths here works on UTC day boundaries.
const TIMEZONE = process.env.APP_TIMEZONE || 'Asia/Kolkata';

const toDateOnly = (value) => {
  if (!value) return null;
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return new Date(`${value}T00:00:00.000Z`);
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
};

// Current calendar date in the business timezone, expressed as UTC midnight.
const today = () => {
  const ymd = new Intl.DateTimeFormat('en-CA', { timeZone: TIMEZONE }).format(new Date());
  return new Date(`${ymd}T00:00:00.000Z`);
};

const addDays = (date, days) => new Date(date.getTime() + days * 86400000);

// Indian financial year runs April to March. Returns e.g. "26-27".
const financialYearLabel = (value) => {
  const d = toDateOnly(value) || today();
  const startYear = d.getUTCMonth() >= 3 ? d.getUTCFullYear() : d.getUTCFullYear() - 1;
  return `${String(startYear).slice(-2)}-${String(startYear + 1).slice(-2)}`;
};

const financialYearRange = (value) => {
  const d = toDateOnly(value) || today();
  const startYear = d.getUTCMonth() >= 3 ? d.getUTCFullYear() : d.getUTCFullYear() - 1;
  return {
    from: new Date(Date.UTC(startYear, 3, 1)),
    to: new Date(Date.UTC(startYear + 1, 3, 1))
  };
};

// Parses ?from=yyyy-MM-dd&to=yyyy-MM-dd into a range with an exclusive upper bound.
// With no dates supplied, defaults to the current financial year.
const rangeFromQuery = (query = {}, fallback = 'fy') => {
  const from = toDateOnly(query.from);
  const to = toDateOnly(query.to);
  if (!from && !to && fallback === 'fy') {
    const fy = financialYearRange();
    return { from: fy.from, toExclusive: fy.to };
  }
  return { from, toExclusive: to ? addDays(to, 1) : null };
};

const dateFilter = ({ from, toExclusive }) => {
  if (!from && !toExclusive) return undefined;
  const filter = {};
  if (from) filter.$gte = from;
  if (toExclusive) filter.$lt = toExclusive;
  return filter;
};

module.exports = {
  TIMEZONE,
  toDateOnly,
  today,
  addDays,
  financialYearLabel,
  financialYearRange,
  rangeFromQuery,
  dateFilter
};
