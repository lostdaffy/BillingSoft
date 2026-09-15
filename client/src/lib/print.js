// Applied to every element (not just body) so coloured table headers and totals
// print even when the browser's "Background graphics" option is turned off.
export const PRINT_PAGE_STYLE = `
  @page { size: A4; margin: 10mm; }
  @media print {
    html, body { background: #fff !important; }
    *, *::before, *::after { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  }
`;

export const safeFileName = (value) => String(value || 'document').replace(/[\\/:*?"<>|]+/g, '-');
