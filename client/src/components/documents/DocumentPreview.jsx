import { useLayoutEffect, useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { SALES_TYPES, stateLabel, stateName } from '../../lib/constants';
import { amountToWords, formatAmount, formatDateNumeric, formatNumber, toNumber } from '../../lib/format';
import { taxSummary } from '../../lib/gst';
import { APP_NAME } from '../../config';

const PAGE_WIDTH = 794; // A4 width at 96 dpi

/** Scales the fixed-width A4 page down to fit narrow screens without affecting print. */
export function PreviewFrame({ children }) {
  const ref = useRef(null);
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return undefined;
    const observer = new ResizeObserver(([entry]) => setScale(Math.min(1, entry.contentRect.width / PAGE_WIDTH)));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className="w-full min-w-0">
      <div style={{ zoom: scale }} className="mx-auto w-fit shadow-[0_1px_3px_rgba(15,23,42,0.08),0_12px_32px_rgba(15,23,42,0.10)]">
        {children}
      </div>
    </div>
  );
}

function MetaRow({ label, value, strong }) {
  if (!value) return null;
  return (
    <tr>
      <td className="py-0.5 pr-3 align-top whitespace-nowrap text-slate-500">{label}</td>
      <td className={strong ? 'py-0.5 font-bold text-slate-900' : 'py-0.5 font-medium text-slate-800'}>{value}</td>
    </tr>
  );
}

function TotalRow({ label, value, strong, negative }) {
  return (
    <tr className={strong ? 'font-semibold text-slate-900' : ''}>
      <td className="px-2 py-1 text-slate-600">{label}</td>
      <td className="px-2 py-1 text-right tabular-nums">
        {negative ? '- ' : ''}
        {formatAmount(Math.abs(toNumber(value)))}
      </td>
    </tr>
  );
}

export default function DocumentPreview({ doc, kind = 'SALE', company = {}, settings = {}, printRef }) {
  const theme = settings.themeColor || '#4f46e5';
  const isSale = kind === 'SALE';
  const type = isSale ? doc.invoiceType || 'INVOICE' : 'PURCHASE';
  const party = (isSale ? doc.client : doc.supplier) || {};
  const number = isSale ? doc.invoiceNumber : doc.purchaseNumber;
  const date = isSale ? doc.invoiceDate : doc.billDate;
  const items = doc.items || [];
  const bank = company.bankDetails || {};

  let title = 'PURCHASE BILL';
  if (isSale) title = type === 'INVOICE' ? (company.gstin ? 'TAX INVOICE' : 'INVOICE') : SALES_TYPES[type]?.printTitle || 'INVOICE';

  const hasDiscount = items.some((item) => toNumber(item.discountPercent) > 0);
  const hasTax = toNumber(doc.totalTax) > 0 || items.some((item) => toNumber(item.taxRate) > 0);
  const summary = hasTax ? taxSummary(items) : [];
  const interState = Boolean(doc.isInterState);

  const companyState = company.state || stateName(company.stateCode);
  const companyAddress = [company.address, company.city, [companyState, company.pincode].filter(Boolean).join(' - ')].filter(Boolean).join(', ');
  const partyAddress = [party.address, party.city, party.pincode].filter(Boolean).join(', ');

  const payable = toNumber(doc.balanceDue) > 0 ? toNumber(doc.balanceDue) : toNumber(doc.totalAmount);
  const showUpi =
    isSale &&
    ['INVOICE', 'PROFORMA'].includes(type) &&
    settings.showUpiQr !== false &&
    bank.upiId &&
    !['PAID', 'CANCELLED', 'DRAFT'].includes(doc.status) &&
    payable > 0;
  const upiUrl = showUpi
    ? `upi://pay?pa=${encodeURIComponent(bank.upiId)}&pn=${encodeURIComponent(company.name || '')}&am=${payable.toFixed(2)}&cu=INR&tn=${encodeURIComponent(number || '')}`
    : '';
  const showBank = isSale && settings.showBankDetails !== false && (bank.accountNumber || bank.bankName);
  const dueLabel = ['QUOTATION', 'ESTIMATE'].includes(type) ? 'Valid Till' : 'Due Date';
  const cell = 'px-2 py-1.5';

  return (
    <div ref={printRef} className="w-[794px] bg-white p-9 text-[11px] leading-[1.45] text-slate-700 print:w-full print:p-0">
      {doc.status === 'CANCELLED' && (
        <div className="mb-3 rounded border border-rose-300 bg-rose-50 py-1 text-center text-[11px] font-bold tracking-[0.2em] text-rose-700">CANCELLED</div>
      )}
      {doc.status === 'DRAFT' && (
        <div className="mb-3 rounded border border-slate-300 bg-slate-50 py-1 text-center text-[11px] font-bold tracking-[0.2em] text-slate-500">DRAFT</div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-6 border-b-2 pb-4" style={{ borderColor: theme }}>
        <div className="flex min-w-0 items-start gap-4">
          {company.logo && <img src={company.logo} alt="" className="max-h-16 max-w-[130px] object-contain" />}
          <div className="min-w-0">
            <h1 className="text-[20px] leading-tight font-bold text-slate-900">{company.name}</h1>
            {(company.tagline || company.dealsIn) && <p className="text-[10px] text-slate-500">{company.tagline || company.dealsIn}</p>}
            {companyAddress && <p className="mt-1 max-w-[380px]">{companyAddress}</p>}
            {(company.mobile || company.email || company.website) && (
              <p className="mt-0.5">{[company.mobile && `Ph: ${company.mobile}`, company.email, company.website].filter(Boolean).join('  |  ')}</p>
            )}
            {company.gstin && (
              <p className="mt-0.5 font-semibold text-slate-900">
                GSTIN: {company.gstin}
                {company.pan ? <span className="ml-3 font-normal text-slate-600">PAN: {company.pan}</span> : null}
              </p>
            )}
          </div>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-[17px] font-bold tracking-wide" style={{ color: theme }}>
            {title}
          </p>
          {isSale && type === 'INVOICE' && <p className="text-[9px] tracking-wider text-slate-500 uppercase">Original for Recipient</p>}
        </div>
      </div>

      {/* Party + document details */}
      <div className="grid grid-cols-2 border-b border-slate-300">
        <div className="border-r border-slate-300 py-3 pr-4">
          <p className="mb-1 text-[9px] font-semibold tracking-wider text-slate-500 uppercase">{isSale ? 'Bill To' : 'Supplier'}</p>
          <p className="text-[13px] font-semibold text-slate-900">{party.name}</p>
          {partyAddress && <p>{partyAddress}</p>}
          {party.stateCode && <p>State: {stateLabel(party.stateCode)}</p>}
          {party.gst && (
            <p>
              <span className="font-semibold text-slate-900">GSTIN:</span> {party.gst}
            </p>
          )}
          {party.mobile && <p>Ph: {party.mobile}</p>}
        </div>
        <div className="py-3 pl-4">
          <table className="w-full">
            <tbody>
              <MetaRow label={isSale ? `${SALES_TYPES[type]?.label || 'Invoice'} No.` : 'Purchase Ref.'} value={number} strong />
              {!isSale && <MetaRow label="Supplier Bill No." value={doc.billNumber} strong />}
              <MetaRow label="Date" value={formatDateNumeric(date)} />
              <MetaRow label={dueLabel} value={formatDateNumeric(doc.dueDate)} />
              {isSale && <MetaRow label="Place of Supply" value={stateLabel(doc.placeOfSupply)} />}
              <MetaRow label="PO Number" value={doc.poNumber} />
              <MetaRow label="E-Way Bill No." value={doc.ewayBillNo} />
              <MetaRow label="Vehicle No." value={doc.vehicleNo} />
            </tbody>
          </table>
        </div>
      </div>
      {doc.shippingAddress && (
        <div className="border-b border-slate-300 py-2">
          <span className="text-[9px] font-semibold tracking-wider text-slate-500 uppercase">Ship To: </span>
          {doc.shippingAddress}
        </div>
      )}

      {/* Items */}
      <table className="mt-3 w-full border-collapse">
        <thead>
          <tr className="text-left text-[10px] text-white" style={{ backgroundColor: theme }}>
            <th className={`${cell} w-7 font-semibold`}>#</th>
            <th className={`${cell} font-semibold`}>Item & Description</th>
            <th className={`${cell} font-semibold`}>HSN/SAC</th>
            <th className={`${cell} text-right font-semibold`}>Qty</th>
            <th className={`${cell} text-right font-semibold`}>Rate</th>
            {hasDiscount && <th className={`${cell} text-right font-semibold`}>Disc.</th>}
            {hasTax && <th className={`${cell} text-right font-semibold`}>Taxable</th>}
            {hasTax && <th className={`${cell} text-right font-semibold`}>GST</th>}
            <th className={`${cell} text-right font-semibold`}>Amount</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => {
            const lineTax = toNumber(item.cgst) + toNumber(item.sgst) + toNumber(item.igst);
            return (
              <tr key={`${item.description}-${index}`} className="border-b border-slate-200 align-top">
                <td className={cell}>{index + 1}</td>
                <td className={`${cell} font-medium text-slate-900`}>{item.description}</td>
                <td className={cell}>{item.hsnCode}</td>
                <td className={`${cell} text-right whitespace-nowrap`}>
                  {formatNumber(item.quantity)} {item.unit}
                </td>
                <td className={`${cell} text-right tabular-nums`}>{formatAmount(item.rate)}</td>
                {hasDiscount && <td className={`${cell} text-right`}>{toNumber(item.discountPercent) ? `${item.discountPercent}%` : '-'}</td>}
                {hasTax && <td className={`${cell} text-right tabular-nums`}>{formatAmount(item.taxableValue ?? item.amount)}</td>}
                {hasTax && (
                  <td className={`${cell} text-right whitespace-nowrap tabular-nums`}>
                    {toNumber(item.taxRate)}%<div className="text-[9px] text-slate-500">{formatAmount(lineTax)}</div>
                  </td>
                )}
                <td className={`${cell} text-right font-medium text-slate-900 tabular-nums`}>{formatAmount(item.amount)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Tax summary + totals */}
      <div className="mt-3 grid grid-cols-[1fr_250px] gap-6">
        <div className="min-w-0">
          {hasTax && summary.length > 0 && (
            <table className="w-full border border-slate-200 text-[10px]">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-2 py-1 text-left font-semibold">HSN/SAC</th>
                  <th className="px-2 py-1 text-right font-semibold">Taxable</th>
                  {interState ? (
                    <th className="px-2 py-1 text-right font-semibold">IGST</th>
                  ) : (
                    <>
                      <th className="px-2 py-1 text-right font-semibold">CGST</th>
                      <th className="px-2 py-1 text-right font-semibold">SGST</th>
                    </>
                  )}
                  <th className="px-2 py-1 text-right font-semibold">Total Tax</th>
                </tr>
              </thead>
              <tbody>
                {summary.map((row) => (
                  <tr key={`${row.hsnCode}-${row.rate}`} className="border-t border-slate-200">
                    <td className="px-2 py-1">
                      {row.hsnCode} <span className="text-slate-400">@{row.rate}%</span>
                    </td>
                    <td className="px-2 py-1 text-right tabular-nums">{formatAmount(row.taxable)}</td>
                    {interState ? (
                      <td className="px-2 py-1 text-right tabular-nums">{formatAmount(row.igst)}</td>
                    ) : (
                      <>
                        <td className="px-2 py-1 text-right tabular-nums">{formatAmount(row.cgst)}</td>
                        <td className="px-2 py-1 text-right tabular-nums">{formatAmount(row.sgst)}</td>
                      </>
                    )}
                    <td className="px-2 py-1 text-right tabular-nums">{formatAmount(row.cgst + row.sgst + row.igst)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <p className="mt-3">
            <span className="font-semibold text-slate-900">Amount in words: </span>
            {doc.amountInWords || amountToWords(doc.totalAmount)}
          </p>
        </div>

        <table className="w-full self-start">
          <tbody>
            <TotalRow label={hasTax ? 'Taxable Amount' : 'Subtotal'} value={doc.subtotal} />
            {toNumber(doc.cgst) > 0 && <TotalRow label="CGST" value={doc.cgst} />}
            {toNumber(doc.sgst) > 0 && <TotalRow label="SGST" value={doc.sgst} />}
            {toNumber(doc.igst) > 0 && <TotalRow label="IGST" value={doc.igst} />}
            {toNumber(doc.otherCharges) > 0 && <TotalRow label={doc.otherChargesLabel || 'Other Charges'} value={doc.otherCharges} />}
            {toNumber(doc.discount) > 0 && <TotalRow label="Discount" value={doc.discount} negative />}
            {toNumber(doc.roundOff) !== 0 && <TotalRow label="Round Off" value={doc.roundOff} negative={toNumber(doc.roundOff) < 0} />}
            <tr className="text-white" style={{ backgroundColor: theme }}>
              <td className="px-2 py-2 text-[12px] font-bold">Total</td>
              <td className="px-2 py-2 text-right text-[12px] font-bold tabular-nums">₹ {formatAmount(doc.totalAmount)}</td>
            </tr>
            {toNumber(doc.amountPaid) > 0 && (
              <>
                <TotalRow label={isSale ? 'Received' : 'Paid'} value={doc.amountPaid} />
                <TotalRow label="Balance Due" value={doc.balanceDue} strong />
              </>
            )}
          </tbody>
        </table>
      </div>

      {/* Payment details, terms and signature */}
      <div className="mt-5 grid grid-cols-[1fr_210px] gap-6 border-t border-slate-300 pt-3">
        <div className="space-y-3">
          {(showBank || showUpi) && (
            <div className="flex items-start gap-5">
              {showBank && (
                <div>
                  <p className="mb-1 text-[9px] font-semibold tracking-wider text-slate-500 uppercase">Bank Details</p>
                  <table>
                    <tbody>
                      <MetaRow label="Account Name" value={bank.accountHolder || company.name} />
                      <MetaRow label="Bank" value={[bank.bankName, bank.branch].filter(Boolean).join(', ')} />
                      <MetaRow label="A/c No." value={bank.accountNumber} />
                      <MetaRow label="IFSC" value={bank.ifscCode} />
                      <MetaRow label="UPI" value={bank.upiId} />
                    </tbody>
                  </table>
                </div>
              )}
              {showUpi && (
                <div className="text-center">
                  <QRCodeSVG value={upiUrl} size={86} level="M" />
                  <p className="mt-1 text-[9px] text-slate-500">Scan to pay ₹{formatAmount(payable)}</p>
                </div>
              )}
            </div>
          )}
          {doc.termsAndConditions && (
            <div>
              <p className="mb-0.5 text-[9px] font-semibold tracking-wider text-slate-500 uppercase">Terms & Conditions</p>
              <p className="text-[10px] whitespace-pre-line text-slate-600">{doc.termsAndConditions}</p>
            </div>
          )}
          {doc.notes && (
            <div>
              <p className="mb-0.5 text-[9px] font-semibold tracking-wider text-slate-500 uppercase">Notes</p>
              <p className="text-[10px] whitespace-pre-line">{doc.notes}</p>
            </div>
          )}
        </div>
        {isSale && (
          <div className="flex flex-col items-end justify-between text-right">
            <p className="font-semibold text-slate-900">For {company.name}</p>
            {settings.showSignature !== false && company.signature ? (
              <img src={company.signature} alt="" className="my-2 max-h-14 max-w-[180px] object-contain" />
            ) : (
              <div className="h-14" />
            )}
            <p className="w-full border-t border-slate-400 pt-1 text-[10px] text-slate-600">Authorised Signatory</p>
          </div>
        )}
      </div>

      <p className="mt-6 text-center text-[9px] text-slate-400">This is a computer generated document · Created with {APP_NAME}</p>
    </div>
  );
}
