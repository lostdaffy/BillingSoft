import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { format } from "date-fns";

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalInvoices: 0,
    totalAmount: 0,
    paidAmount: 0,
    pendingAmount: 0,
    recentInvoices: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await axios.get("/api/invoices/stats");
      setStats(response.data);
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setLoading(false);
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
    <div className="bg-gray-50 min-h-screen">
      <div className="">
        {/* Header - Matches Navbar style */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
              Dashboard
            </h1>
            <p className="text-sm text-gray-500 mt-1 font-medium">
              Overview of your business
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
            <span>New Invoice</span>
          </Link>
        </div>

        {/* Stats Cards - Matches Sidebar clean design */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-all duration-150">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg
                  className="w-6 h-6 text-indigo-600"
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
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Total Invoices
                </p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {stats.totalInvoices.toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-all duration-150">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg
                  className="w-6 h-6 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
                  />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Paid Amount
                </p>
                <p className="text-2xl font-bold text-green-600 mt-1">
                  ₹{stats.paidAmount.toLocaleString("en-IN")}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-all duration-150">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg
                  className="w-6 h-6 text-orange-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Pending Amount
                </p>
                <p className="text-2xl font-bold text-orange-600 mt-1">
                  ₹{stats.pendingAmount.toLocaleString("en-IN")}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-all duration-150">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg
                  className="w-6 h-6 text-indigo-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 12h14M12 5l7 7-7 7"
                  />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Total Amount
                </p>
                <p className="text-2xl font-bold text-indigo-600 mt-1">
                  ₹{stats.totalAmount.toLocaleString("en-IN")}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Invoices Table - Matches Sidebar style */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
              <svg
                className="w-5 h-5 text-gray-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 4h3m-3 4h3m-6 0h.01"
                />
              </svg>
              <span>Recent Invoices</span>
            </h2>
            <Link
              to="/invoices"
              className="text-indigo-600 hover:text-indigo-700 text-sm font-medium mt-1 inline-block"
            >
              View All →
            </Link>
          </div>

          {stats.recentInvoices.length === 0 ? (
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
                No recent invoices
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
                <span>Create first invoice</span>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-medium text-gray-700 text-sm">
                      #
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700 text-sm">
                      Client
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700 text-sm">
                      Date
                    </th>
                    <th className="text-right py-3 px-4 font-medium text-gray-700 text-sm">
                      Amount
                    </th>
                    <th className="text-center py-3 px-4 font-medium text-gray-700 text-sm">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {stats.recentInvoices.map((invoice, index) => (
                    <tr
                      key={invoice._id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="py-4 px-4 font-medium text-gray-900 text-sm">
                        {invoice.invoiceNumber}
                      </td>
                      <td className="py-4 px-4 text-gray-700 text-sm font-medium">
                        {invoice.client.name}
                      </td>
                      <td className="py-4 px-4 text-gray-600 text-sm">
                        {format(new Date(invoice.invoiceDate), "dd MMM")}
                      </td>
                      <td className="py-4 px-4 text-right font-semibold text-indigo-600 text-sm">
                        ₹{invoice.totalAmount.toLocaleString("en-IN")}
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(invoice.status)}`}
                        >
                          {invoice.status}
                        </span>
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

export default Dashboard;
