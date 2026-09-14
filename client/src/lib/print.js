export const PRINT_PAGE_STYLE = `
  @page { size: A4; margin: 10mm; }
  @media print {
    html, body { background: #fff !important; }
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
`;

export const safeFileName = (value) => String(value || 'document').replace(/[\\/:*?"<>|]+/g, '-');
