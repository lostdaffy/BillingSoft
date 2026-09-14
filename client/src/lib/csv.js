const BOM = '﻿';

const escapeCell = (value) => {
  const text = value === null || value === undefined ? '' : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

const saveBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

/**
 * columns: [{ label, key } | { label, value: (row) => any }]
 * Excel-friendly: UTF-8 BOM and CRLF line endings.
 */
export const downloadCsv = (filename, columns, rows) => {
  const header = columns.map((column) => escapeCell(column.label)).join(',');
  const body = rows.map((row) =>
    columns.map((column) => escapeCell(typeof column.value === 'function' ? column.value(row) : row[column.key])).join(',')
  );
  const blob = new Blob([BOM + [header, ...body].join('\r\n')], { type: 'text/csv;charset=utf-8' });
  saveBlob(blob, filename.endsWith('.csv') ? filename : `${filename}.csv`);
};

export const downloadJson = (filename, data) => {
  saveBlob(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }), filename);
};
