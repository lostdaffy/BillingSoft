import { useState, useEffect } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";
import { format } from "date-fns";
import { useAuth } from "../context/AuthContext";

const ViewInvoice = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInvoice();
  }, [id]);

  const fetchInvoice = async () => {
    try {
      const response = await axios.get(`/api/invoices/${id}`);
      setInvoice(response.data);
    } catch (error) {
      toast.error("Failed to fetch invoice");
      navigate("/invoices");
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this invoice?")) {
      return;
    }
    try {
      await axios.delete(`/api/invoices/${id}`);
      toast.success("Invoice deleted successfully");
      navigate("/invoices");
    } catch (error) {
      toast.error("Failed to delete invoice");
    }
  };

  const handleStatusChange = async (newStatus) => {
    try {
      await axios.put(`/api/invoices/${id}`, { status: newStatus });
      setInvoice({ ...invoice, status: newStatus });
      toast.success("Status updated successfully");
    } catch (error) {
      toast.error("Failed to update status");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="text-center py-12 text-xl text-gray-500">
        Invoice not found
      </div>
    );
  }

  return (
    <div>
      {/* Action Buttons */}
      <div className="flex justify-between items-center mb-8 pb-8 border-b print:hidden">
        <h1 className="text-3xl font-bold text-gray-900">Invoice Details</h1>
        <div className="flex gap-3">
          <button
            onClick={() => navigate("/invoices")}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all font-medium"
          >
            ← Back to Invoices
          </button>
          <Link
            to={`/invoices/edit/${id}`}
            className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-all font-medium"
          >
            Edit Invoice
          </Link>
          <button
            onClick={handlePrint}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all font-medium flex items-center gap-2"
          >
            🖨️ Print / PDF
          </button>
          <button
            onClick={handleDelete}
            className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all font-medium"
          >
            Delete
          </button>
        </div>
      </div>



      {/* ✅ PERFECT A4 - BLACK PRINT OPTIMIZED */}
      <div className="print-container">
        <div
          className="mx-auto bg-white shadow-2xl print:shadow-none print:border-4 print:border-black print:text-black"
          style={{
            width: "210mm",
            height: "305mm",
            maxWidth: "210mm",
            maxHeight: "305mm",
            padding: "5mm",
            margin: "0 auto",
            marginBottom: "0",
            boxSizing: "border-box",
            fontFamily: "Arial, Helvetica, sans-serif",
            fontSize: "11px",
            lineHeight: 1.3,
            color: "#000000", // ✅ BLACK TEXT FOR PRINT
          }}
        >
          {/* HEADER */}
          <div className="border-b-[3px] border-black pb-3 mb-4">
            <div className="flex justify-between items-center text-[11px] font-bold text-black mb-2">
              <span>GSTIN: {user?.company?.gstin || "XXXXXXXXXX"}</span>
              <span className="text-red-900 underline text-[12px] mx-auto min-w-17.5 text-center font-bold">
                {invoice.invoiceType || "INVOICE"}
              </span>
              <span>Mobile: {user?.company?.mobile || "XXXXXXXXXX"}</span>
            </div>

            <div className="text-center">
              <div
                className="font-black text-red-900 tracking-[2px] mt-8"
                style={{ fontSize: "32px", letterSpacing: "2px" }}
              >
                {user?.company?.name || "YOUR COMPANY NAME"}
              </div>
              <div className="text-black font-bold text-xs mb-1">
                {user?.company?.dealsIn || "Authorized Dealer of"}
              </div>
              <div className="text-black font-bold text-xs px-2 py-1 border border-black inline-block">
                {user?.company?.address || "REGISTERED OFFICE ADDRESS"}
              </div>
            </div>
          </div>

          {/* 🔥 PROFESSIONAL CLIENT & INVOICE INFO */}
          <div className="grid grid-cols-2 gap-6 border-b-[3px] border-black pb-4 mb-4">
            {/* LEFT: BILL TO */}
            <div className="p-0">
              <div className="flex items-center gap-2 mb-3 pb-2 border-b border-black">
                <h4 className="text-sm font-black text-black uppercase">
                  BILL TO
                </h4>
              </div>

              <div className="space-y-2 text-sm font-semibold text-black">
                <div className="flex items-start gap-3">
                  <span className="w-16 font-bold text-black text-xs uppercase">
                    Name:
                  </span>
                  <span className="text-xs">{invoice.client.name}</span>
                </div>
                {invoice.client.mobile && (
                  <div className="flex items-start gap-3">
                    <span className="w-16 font-bold text-black text-xs uppercase">
                      Mobile:
                    </span>
                    <span className="text-xs">{invoice.client.mobile}</span>
                  </div>
                )}

                {invoice.client.aadhaar && (
                  <div className="flex items-start gap-3">
                    <span className="w-16 font-bold text-black text-xs uppercase">
                      Aadhaar:
                    </span>
                    <span className="text-xs">{invoice.client.aadhaar}</span>
                  </div>
                )}
                <div className="flex items-start gap-3">
                  <span className="w-16 font-bold text-black text-xs uppercase">
                    Address:
                  </span>
                  <span className="text-xs">{invoice.client.address}</span>
                </div>
              </div>
            </div>

            {/* RIGHT: INVOICE DETAILS */}
            <div className="p-0">
              <div className="flex items-center gap-2 mb-3 pb-2 border-b border-black">
                <div className="w-2 h-6 bg-red-900"></div>
                <h4 className="text-sm font-black text-red-900 uppercase">
                  INVOICE DETAILS
                </h4>
              </div>

              <div className="space-y-2 text-sm font-semibold text-black">
                <div className="flex justify-between">
                  <span className="font-bold text-black text-xs uppercase">
                    Invoice No:
                  </span>
                  <span className="text-xs">{invoice.invoiceNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-bold text-black text-xs uppercase">
                    Date:
                  </span>
                  <span className="text-xs">
                    {format(new Date(invoice.invoiceDate), "dd-MM-yyyy")}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="font-bold text-black text-xs uppercase">
                    Due Date:
                  </span>
                  <span className="text-xs">
                    {format(new Date(invoice.dueDate), "dd-MM-yyyy")}
                  </span>
                </div>
                {invoice.client.panUid && (
                  <div className="flex justify-between">
                    <span className="font-bold text-black text-xs uppercase">
                      PAN/UID:
                    </span>
                    <span className="text-xs">{invoice.client.panUid}</span>
                  </div>
                )}
                {invoice.client.stateCode && (
                  <div className="flex justify-between">
                    <span className="font-bold text-black text-xs uppercase">
                      State Code:
                    </span>
                    <span className="text-xs">{invoice.client.stateCode}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ITEMS TABLE */}
          <div className="border-t-[3px] border-black mt-2 flex-1">
            <table className="w-full border-collapse text-[10px] h-full">
              <thead>
                <tr className="h-7 bg-gray-50">
                  <th className="w-[7%] border-2 border-black p-[3px_2px] font-black text-center text-black">
                    Sr
                  </th>
                  <th className="w-[53%] border-2 border-black p-[3px_2px] font-black text-center text-black">
                    Description of Goods
                  </th>
                  <th className="w-[11%] border-2 border-black p-[3px_2px] font-black text-center text-black">
                    HSN
                  </th>
                  <th className="w-[9%] border-2 border-black p-[3px_2px] font-black text-center text-black">
                    QTY
                  </th>
                  <th className="w-[10%] border-2 border-black p-[3px_2px] font-black text-center text-black">
                    Rate
                  </th>
                  <th className="w-[10%] border-2 border-black p-[3px_2px] font-black text-center text-black">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody className="h-full">
                {invoice.items.map((item, index) => (
                  <tr key={index} className="h-7">
                    <td className="border border-black p-[3px_2px] text-center font-semibold text-black">
                      {item.srNo}
                    </td>
                    <td className="border border-black p-[3px_2px] text-left px-1 text-black">
                      {item.description}
                    </td>
                    <td className="border border-black p-[3px_2px] text-center text-black">
                      {item.hsnCode}
                    </td>
                    <td className="border border-black p-[3px_2px] text-center text-black">
                      {item.quantity}
                    </td>
                    <td className="border border-black p-[3px_2px] text-right pr-1 text-black">
                      {item.rate}
                    </td>
                    <td className="border border-black p-[3px_2px] text-center font-semibold text-black">
                      {item.amount.toLocaleString("en-IN")}
                    </td>
                  </tr>
                ))}
                {/* Dynamic empty rows */}
                {Array.from({
                  length: Math.max(0, 15 - invoice.items.length),
                }).map((_, i) => (
                  <tr key={`empty-${i}`} className="h-7">
                    <td className="border border-black p-[3px_2px]"></td>
                    <td className="border border-black p-[3px_2px]"></td>
                    <td className="border border-black p-[3px_2px]"></td>
                    <td className="border border-black p-[3px_2px]"></td>
                    <td className="border border-black p-[3px_2px]"></td>
                    <td className="border border-black p-[3px_2px]"></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* FOOTER */}
          <div className="border-t-[3px] border-black pt-2 mt-2">
            <div className="flex h-[65mm]">
              <div className="flex-1 pr-4 border-r-[3px] border-black pt-2">
                <div className="pb-2 border-b border-black text-xs font-semibold mb-3 leading-tight">
                  Rupees in Words:{" "}
                  <span className="font-bold text-red-900">
                    {invoice.amountInWords || "ZERO ONLY"}
                  </span>
                </div>

                <div className="text-sm space-y-1 mb-4 leading-tight text-black">
                  <div>
                    <strong>Bank:</strong>{" "}
                    {user?.company?.bankDetails?.bankName || "N/A"}
                  </div>
                  <div>
                    <strong>Branch:</strong>{" "}
                    {user?.company?.bankDetails?.branch || "N/A"}
                  </div>
                  <div>
                    <strong>A/c No:</strong>{" "}
                    {user?.company?.bankDetails?.accountNumber || "N/A"}
                  </div>
                  <div>
                    <strong>IFSC:</strong>{" "}
                    {user?.company?.bankDetails?.ifscCode || "N/A"}
                  </div>
                </div>

                <div className="text-sm text-black">
                  <strong className="block mb-2 text-base font-bold">
                    TERMS & CONDITIONS
                  </strong>
                  <ol className="text-xs list-decimal ml-4 space-y-0.5 text-black">
                    {invoice.termsAndConditions
                      .split("\n")
                      .filter(Boolean)
                      .slice(0, 6)
                      .map((term, i) => (
                        <li key={i}>{term.replace(/^\d+\.\s*/, "")}</li>
                      ))}
                  </ol>
                </div>
              </div>
              <div className="w-[260px] pl-4">
                <div className="space-y-1 mb-3">
                  <div className="flex justify-between px-2 py-1.5 border-b border-black text-xs font-bold text-black">
                    <span>Sub Total</span>
                    <span>₹{invoice.subtotal.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex justify-between px-2 py-1.5 border-b border-black text-xs font-bold text-black">
                    <span>Discount (-)</span>
                    <span>₹{invoice.discount.toLocaleString("en-IN")}</span>
                  </div>
                  {invoice.tax > 0 && (
                    <div className="flex justify-between px-2 py-1.5 border-b border-black text-xs font-bold text-black">
                      <span>Tax/GST (+)</span>
                      <span>₹{invoice.tax.toLocaleString("en-IN")}</span>
                    </div>
                  )}
                  <div className="flex justify-between px-2 py-2 border-t-2 border-black text-sm font-black text-black bg-gray-100">
                    <span>Total Amount</span>
                    <span>₹{invoice.totalAmount.toLocaleString("en-IN")}</span>
                  </div>
                </div>
                <div className="text-center py-2 font-bold text-xs border-b border-black text-black">
                  For {user?.company?.name || "Company Name"}
                </div>
                <div className="text-right pt-8 pb-1 font-bold text-xs text-black">
                  <div>Authorised Signatory</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

            {/* Status Update - RIGHT ALIGNED */}
      <div className="bg-white rounded-2xl shadow-xl border border-gray-200 mb-12 p-8 print:hidden">
        <div className="flex flex-col lg:flex-row items-center justify-end lg:justify-between gap-6">
          <div className="text-right lg:text-left order-2 lg:order-1">
            <h3 className="text-2xl font-bold text-gray-900 mb-2">
              Update Status
            </h3>
            <p className="text-lg text-gray-600">
              Current:{" "}
              <span
                className={`px-3 py-1 rounded-full text-sm font-bold capitalize ${
                  invoice.status === "PAID"
                    ? "bg-green-100 text-green-800"
                    : invoice.status === "SENT"
                      ? "bg-blue-100 text-blue-800"
                      : invoice.status === "OVERDUE"
                        ? "bg-red-100 text-red-800"
                        : "bg-gray-100 text-gray-800"
                }`}
              >
                {invoice.status}
              </span>
            </p>
          </div>
          <div className="flex flex-wrap gap-3 order-1 lg:order-2 justify-end">
            <button
              onClick={() => handleStatusChange("DRAFT")}
              className="px-4 py-2 bg-gray-500 text-white rounded-xl hover:bg-gray-600 text-sm font-semibold transition-all"
            >
              Draft
            </button>
            <button
              onClick={() => handleStatusChange("SENT")}
              className="px-4 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 text-sm font-semibold transition-all"
            >
              Sent
            </button>
            <button
              onClick={() => handleStatusChange("PAID")}
              className="px-4 py-2 bg-green-500 text-white rounded-xl hover:bg-green-600 text-sm font-semibold transition-all"
            >
              Paid
            </button>
            <button
              onClick={() => handleStatusChange("OVERDUE")}
              className="px-4 py-2 bg-red-500 text-white rounded-xl hover:bg-red-600 text-sm font-semibold transition-all"
            >
              Overdue
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ViewInvoice;
