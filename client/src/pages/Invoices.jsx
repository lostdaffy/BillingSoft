import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { format } from "date-fns";
import toast from "react-hot-toast";

const Invoices = () => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    fetchInvoices();
  }, [filter]);

  const fetchInvoices = async () => {
    try {
      const url = filter ? `/api/invoices?status=${filter}` : "/api/invoices";
      const response = await axios.get(url);
      setInvoices(response.data.invoices || []);
    } catch (error) {
      toast.error("Failed to fetch invoices");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this invoice?")) {
      return;
    }

    try {
      await axios.delete(`/api/invoices/${id}`);
      toast.success("Invoice deleted successfully");
      fetchInvoices();
    } catch (error) {
      toast.error("Failed to delete invoice");
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      PAID: "bg-green-100 text-green-800",
      SENT: "bg-blue-100 text-blue-800",
      DRAFT: "bg-gray-100 text-gray-800",
      OVERDUE: "bg-red-100 text-red-800",
      CANCELLED: "bg-yellow-100 text-yellow-800",
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 lg:ml-64 pt-20">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-gray-200 border-t-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className=" bg-gray-50 min-h-screen">
      <div>
        {/* Header - EXACT Dashboard Style */}
        <div className="flex items-center justify-between mb-8 px-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
              All Invoices
            </h1>
            <p className="text-sm text-gray-500 mt-1 font-medium">
              Manage your invoices
            </p>
          </div>
          <Link
            to="/invoices/create"
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg border border-indigo-600 transition-colors shadow-sm hover:shadow-md flex items-center space-x-2"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6v6m0 0v6m0-6h6m-6 0H6"
              />
            </svg>
            <span>Create Invoice</span>
          </Link>
        </div>

        {/* Filters - Dashboard Card Style */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm mb-8 px-6 py-4">
          <div className="flex items-center space-x-4">
            <label className="text-sm font-semibold text-gray-700">
              Filter by Status:
            </label>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">All Invoices</option>
              <option value="DRAFT">Draft</option>
              <option value="SENT">Sent</option>
              <option value="PAID">Paid</option>
              <option value="OVERDUE">Overdue</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
        </div>

        {/* Invoices Table - EXACT Dashboard Style */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          {invoices.length === 0 ? (
            <div className="text-center py-12 px-6">
              <div className="w-16 h-16 bg-gray-100 rounded-lg mx-auto mb-4 flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                  />
                </svg>
              </div>
              <p className="text-gray-600 text-sm font-medium mb-3">
                No invoices found
              </p>
              <Link
                to="/invoices/create"
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg border border-indigo-600 shadow-sm hover:shadow-md transition-all duration-150 inline-flex items-center space-x-2"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                  />
                </svg>
                <span>Create Your First Invoice</span>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-medium text-gray-700 text-sm">
                      Invoice No.
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700 text-sm">
                      Type
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700 text-sm">
                      Client
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700 text-sm">
                      Date
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700 text-sm">
                      Due Date
                    </th>
                    <th className="text-right py-3 px-4 font-medium text-gray-700 text-sm">
                      Amount
                    </th>
                    <th className="text-center py-3 px-4 font-medium text-gray-700 text-sm">
                      Status
                    </th>
                    <th className="text-center py-3 px-4 font-medium text-gray-700 text-sm">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {invoices.map((invoice) => (
                    <tr
                      key={invoice._id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="py-4 px-4 font-medium text-gray-900 text-sm">
                        {invoice.invoiceNumber}
                      </td>
                      <td className="py-4 px-4 text-gray-700 text-sm font-medium">
                        {invoice.invoiceType}
                      </td>
                      <td className="py-4 px-4 text-gray-700 text-sm font-medium">
                        {invoice.client?.name}
                      </td>
                      <td className="py-4 px-4 text-gray-600 text-sm">
                        {format(new Date(invoice.invoiceDate), "dd MMM")}
                      </td>
                      <td className="py-4 px-4 text-gray-600 text-sm">
                        {format(new Date(invoice.dueDate), "dd MMM")}
                      </td>
                      <td className="py-4 px-4 text-right font-semibold text-indigo-600 text-sm">
                        ₹
                        {Number(invoice.totalAmount || 0).toLocaleString(
                          "en-IN",
                        )}
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(invoice.status)}`}
                        >
                          {invoice.status}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <div className="flex justify-center space-x-2">
                          <Link
                            to={`/invoices/view/${invoice._id}`}
                            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded-md shadow-sm hover:shadow-md transition-all duration-150"
                          >
                            View
                          </Link>
                          <Link
                            to={`/invoices/edit/${invoice._id}`}
                            className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded-md shadow-sm hover:shadow-md transition-all duration-150"
                          >
                            Edit
                          </Link>
                          <button
                            onClick={() => handleDelete(invoice._id)}
                            className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-medium rounded-md shadow-sm hover:shadow-md transition-all duration-150"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Invoices;
