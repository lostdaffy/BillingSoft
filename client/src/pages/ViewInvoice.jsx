import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import axios from "axios";
import toast from "react-hot-toast";

const ones = [
  "",
  "One",
  "Two",
  "Three",
  "Four",
  "Five",
  "Six",
  "Seven",
  "Eight",
  "Nine",
  "Ten",
  "Eleven",
  "Twelve",
  "Thirteen",
  "Fourteen",
  "Fifteen",
  "Sixteen",
  "Seventeen",
  "Eighteen",
  "Nineteen",
];
const tens = [
  "",
  "",
  "Twenty",
  "Thirty",
  "Forty",
  "Fifty",
  "Sixty",
  "Seventy",
  "Eighty",
  "Ninety",
];

function numToWords(n) {
  if (n === 0) return "Zero";
  let w = "";
  if (n >= 10000000) {
    w += numToWords(Math.floor(n / 10000000)) + " Crore ";
    n %= 10000000;
  }
  if (n >= 100000) {
    w += numToWords(Math.floor(n / 100000)) + " Lakh ";
    n %= 100000;
  }
  if (n >= 1000) {
    w += numToWords(Math.floor(n / 1000)) + " Thousand ";
    n %= 1000;
  }
  if (n >= 100) {
    w += numToWords(Math.floor(n / 100)) + " Hundred ";
    n %= 100;
  }
  if (n > 0) {
    if (n < 20) w += ones[n] + " ";
    else
      w += tens[Math.floor(n / 10)] + (n % 10 ? " " + ones[n % 10] : "") + " ";
  }
  return w.trim();
}

function amountToWords(amount) {
  if (!amount && amount !== 0) return "";
  const num = Math.floor(amount);
  return "Rupees " + numToWords(num) + " Only";
}

function formatDate(s) {
  if (!s) return "";
  const d = new Date(s);
  if (isNaN(d)) return s;
  return `${String(d.getDate()).padStart(2, "0")}-${String(d.getMonth() + 1).padStart(2, "0")}-${d.getFullYear()}`;
}

const ViewInvoice = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInvoice();
  }, [id]);

  const loadInvoice = async () => {
    try {
      const res = await axios.get(`/api/invoices/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      setInvoice(res.data);
    } catch (error) {
      console.error("Invoice load error:", error);
      toast.error("Failed to fetch invoice");
      navigate("/invoices");
    } finally {
      setLoading(false);
    }
  };

  if (loading)
    return (
      <div className="flex justify-center items-center min-h-100 ml-64 pt-20">
        <div className="animate-spin h-12 w-12 border-b-2 border-indigo-600 rounded-full" />
      </div>
    );

  if (!invoice)
    return (
      <div className="ml-64 pt-20 p-6 text-center text-xl text-gray-500">
        Invoice not found
      </div>
    );

  const items = invoice.items || [];
  const MIN_ROWS = 16;
  const emptyRows = Math.max(0, MIN_ROWS - items.length);

  const subTotal = items.reduce(
    (s, it) =>
      s +
      (parseFloat(it.amount) ||
        parseFloat(it.quantity) * parseFloat(it.rate) ||
        0),
    0,
  );
  const discount = parseFloat(invoice.discount) || 0;
  const totalAmt = parseFloat(invoice.totalAmount) || subTotal - discount;
  const wordsText = invoice.amountInWords || amountToWords(totalAmt);

  const invDate = formatDate(invoice.invoiceDate);
  const dueDate = formatDate(invoice.dueDate);
  const invoiceType = invoice.invoiceType || "";
  const invNum =
    invoice.invoiceNumber || invoice._id?.slice(-6).toUpperCase() || "";

  const cName = invoice.client?.name || "";
  const cAddr = invoice.client?.address || "";
  const cMobile = invoice.client?.mobile || "";
  const cGst = invoice.client?.gst || "";
  const stateCode = invoice.client?.stateCode || "";
  const cPan = invoice.client?.panUid || "";

  console.log(cGst);

  // Company Details
  const companyName = user?.company?.name || "";
  const companyGst = user?.company?.gstin || "";
  const companyMobile = user?.company?.mobile || "";
  const companyAddress = user?.company?.address || "";
  const companyDeals = user?.company?.dealsIn || "";

  // Bank Details
  const bankName = user?.company?.bankDetails?.bankName || "";
  const bankBranch = user?.company?.bankDetails?.branch || "";
  const bankAccount = user?.company?.bankDetails?.accountNumber || "";
  const bankIfsc = user?.company?.bankDetails?.ifscCode || "";

  return (
    <>
      <style>{`
  @media print {
    html, body {
      margin: 0 !important; 
      padding: 0 !important;
      width: 210mm !important; 
      height: 308mm !important; 
      overflow: hidden !important;
    }
    * { 
      visibility: hidden !important; 
      box-sizing: border-box !important; 
    }
    .no-print, .no-print * { 
      display: none !important; 
    }
    .print-area { 
      visibility: visible !important; 
      position: fixed !important; 
      top: 0 !important; 
      left: 0 !important;
      width: 210mm !important; 
      height: 308mm !important; 
      margin: 0 !important;
      /* ✅ REDUCED PADDING: 8mm 8mm 6mm 8mm → 5mm 6mm 4mm 6mm */
      padding: 5mm 6mm 6mm 6mm !important; 
      background: white !important;
      font-family: Arial, sans-serif !important; 
      font-size: 10px !important;
    }
    .print-area * { 
      visibility: visible !important; 
    }
    @page { 
      size: A4 portrait; 
      margin: 0mm; 
    }
  }
`}</style>

      <div className="pt-6 min-h-screen ">
        {/* ── Action Bar ── */}
        <div className="no-print flex justify-between items-center mb-8 bg-white rounded-xl shadow-sm p-5 border border-gray-200">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Invoice: <span className="text-red-600 font-black">{invNum}</span>
            </h1>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => navigate("/invoices")}
              className="px-5 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium transition-colors"
            >
              ← Back
            </button>
            <button
              onClick={() => window.print()}
              className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold text-sm flex items-center gap-2 shadow-md hover:shadow-lg transition-all"
            >
              🖨️ Print
            </button>
          </div>
        </div>

        {/* ═══════════════════ INVOICE A4 ═══════════════════ */}
        <div
          className="print-area mx-auto bg-white border-4 border-black font-['Arial',sans-serif] text-[10px] text-black flex flex-col overflow-hidden"
          style={{
            width: "210mm",
            height: "297mm",
            padding: "5mm 6mm 6mm 6mm",
            boxSizing: "border-box",
          }}
        >
          {/* ══ HEADER ══ */}
          <div className="shrink-0">
            {/* Top row: GSTIN | QUOTATION | Mobile */}
            <div className="flex justify-between items-center font-bold text-xs mb-0.5">
              <span>GSTIN: {companyGst}</span>

              <span className="text-sm">{invoiceType}</span>

              <span className="text-xs">Phone No: +91 {companyMobile}</span>
            </div>

            {/* Company Name */}
            <div className="text-center leading-[1.05] mt-4">
              <span className="text-black text-5xl font-bold ">
                {companyName}
              </span>
            </div>

            {/* Deals In */}
            <div className="text-center text-xs font-bold mt-2">
              Deals in: {companyDeals}
            </div>

            {/* Address bar */}
            <div className="text-center my-4">
              <span className="font-bold text-xs border-2 rounded-full p-2">
                {companyAddress}
              </span>
            </div>
          </div>

          {/* ══ CLIENT + INVOICE FIELDS ══ */}
          <div className="flex border-4 border-black shrink-0">
            {/* Left panel - SAME STYLE AS RIGHT */}
            <div className="flex-2 border-r-2 border-black p-[4px_10px] text-xs leading-5">
              {[
                { label: "M/S Name", value: cName },
                { label: "Address", value: cAddr },
                { label: "Phone", value: cMobile },
                { label: "Place of Supply", value: stateCode },
                { label: "GST Number", value: cGst },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-baseline gap-1.5 mb-1">
                  <strong className="whitespace-nowrap min-w-25 text-xs">
                    {label}
                  </strong>
                  {value}
                </div>
              ))}
            </div>

            {/* Right panel */}
            <div className="flex-1 p-[4px_12px] text-xs leading-5">
              {[
                { label: "Invoice Number", value: invNum },
                { label: "Invoice Date", value: invDate },
                { label: "Due Date", value: dueDate },
                { label: "PAN Number", value: cPan },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-baseline gap-1.5 mb-1">
                  <strong className="whitespace-nowrap min-w-25">
                    {label}
                  </strong>
                  {value}
                </div>
              ))}
            </div>
          </div>

          {/* ══ ITEMS TABLE ══ */}
          <table className="w-full border-collapse border-4 border-black border-t-0 text-[10px] table-fixed flex-shrink-0">
            <colgroup>
              <col className="w-[6%]" />
              <col className="w-[43%]" />
              <col className="w-[12%]" />
              <col className="w-[8%]" />
              <col className="w-[12%]" />
              <col className="w-[19%]" />
            </colgroup>
            <thead>
              <tr>
                {[
                  "Sr. No.",
                  "Description of Product",
                  "HSN Code",
                  "QTY",
                  "Rate",
                  "Amount (Rs.)",
                ].map((h, i) => (
                  <th
                    key={i}
                    className="border border-black py-2 text-center font-bold bg-white"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => {
                const amt =
                  parseFloat(item.amount) ||
                  parseFloat(item.quantity) * parseFloat(item.rate) ||
                  0;
                return (
                  <tr key={i} className="h-7">
                    <td className="border border-black px-1 py-0.5 text-center">
                      {i + 1}.
                    </td>
                    <td className="border border-black px-1.5 py-0.5 text-left">
                      {item.description}
                    </td>
                    <td className="border border-black px-1 py-0.5 text-center">
                      {item.hsnCode || ""}
                    </td>
                    <td className="border border-black px-1 py-0.5 text-center">
                      {item.quantity}
                    </td>
                    <td className="border border-black px-1.25 py-0.5 text-right">
                      {parseFloat(item.rate || 0).toLocaleString("en-IN")}
                    </td>
                    <td className="border border-black px-1.25 py-0.5 text-right font-bold">
                      {amt.toLocaleString("en-IN")}
                    </td>
                  </tr>
                );
              })}

              {Array.from({ length: emptyRows }).map((_, i) => (
                <tr key={`e-${i}`} className="h-7">
                  {[0, 1, 2, 3, 4, 5].map((j) => (
                    <td key={j} className="border border-black" />
                  ))}
                </tr>
              ))}
            </tbody>
          </table>

          {/* BOTTOM SECTION  */}
          <div className="flex border-4 border-black border-t-0 flex-1">
            <div className="flex-[0_0_63%] border-r-2 border-black p-[5px_10px]">
              <div className="mt-1 border-b-2 border-black text-center">
                <div className="text-sm font-bold ">
                  Total in words
                </div>

                <div className="text-sm py-1">
                  {wordsText}
                </div>
              </div>

              {/* ✅ FIXED BANK DETAILS WITH DOTLINE */}
              <div className="mt-3">
                {[
                  { label: "Bank Name", value: bankName },
                  { label: "Branch Name", value: bankBranch },
                  { label: "Bank Account Number", value: bankAccount },
                  { label: "Bank Branch IFSC", value: bankIfsc },
                ].map(({ label, value }) => (
                  <div
                    key={label}
                    className="text-xs flex items-baseline gap-1.5 mb-1"
                  >
                    <strong className="text-xs whitespace-nowrap min-w-35 font-bold">
                      {label}
                    </strong>
                    {value}
                  </div>
                ))}
              </div>

              {/* Terms & Conditions */}
              <div className="text-xs flex-1 overflow-hidden mt-2">
                <div className="font-bold text-xs mb-1">TERMS & CONDITIONS</div>
                <ol className="m-0 ml-3.25 p-0 leading-[1.6] list-decimal list-inside text-xs">
                  <li>
                    Validity of Quotation. This quotation is valid for 30 days
                    from the date of issue.
                  </li>
                  <li>
                    Prices quoted exclusive of taxes, duties, and
                    transportation.
                  </li>
                  <li>
                    Any changes in government levies will be charged at actuals.
                  </li>
                  <li>
                    Payment Terms: 50% advance, 50% on delivery. Late payments
                    @2% per month.
                  </li>
                  <li>
                    Delivery within 15 days from order confirmation & advance
                    payment.
                  </li>
                </ol>
              </div>
            </div>

            {/* Bottom-Right 37% */}
            <div className="flex-[0_0_37%] flex flex-col text-xs">
              <div className="flex justify-between px-2.5 py-1.25 border-b border-black font-bold">
                <span>Amount With Tax.</span>
                <span>
                  {subTotal > 0 ? subTotal.toLocaleString("en-IN") : "0"}
                </span>
              </div>
              <div className="flex justify-between px-2.5 py-1.25 border-b border-black font-bold">
                <span>Discount</span>
                <span>
                  {discount > 0 ? discount.toLocaleString("en-IN") : "0"}
                </span>
              </div>

              <div className="flex justify-between px-2.5 py-1.25 border-b border-black font-bold text-sm">
                <span>Total Amount With Tax.</span>
                <span>
                  {totalAmt > 0 ? totalAmt.toLocaleString("en-IN") : "0"}
                </span>
              </div>

              <div className="text-center px-2.5 py-1.25 border-b border-black font-bold">
                For. {companyName}
              </div>
              <div className="flex-1 relative">
                <span className="absolute bottom-1.5 right-2.5 text-[9px] font-bold">
                  Auth. Signatory
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ViewInvoice;
