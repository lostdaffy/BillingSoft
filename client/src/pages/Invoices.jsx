import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const Invoices = () => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    fetchInvoices();
  }, [filter]);

  const fetchInvoices = async () => {
    try {
      const url = filter ? `/invoices?status=${filter}` : '/invoices';
      const response = await axios.get(url);
      setInvoices(response.data.invoices);
    } catch (error) {
      toast.error('Failed to fetch invoices');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this invoice?')) {
      return;
    }

    try {
      await axios.delete(`/invoices/${id}`);
      toast.success('Invoice deleted successfully');
      fetchInvoices();
    } catch (error) {
      toast.error('Failed to delete invoice');
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      PAID: 'bg-green-100 text-green-800 border-green-200',
      SENT: 'bg-blue-100 text-blue-800 border-blue-200',
      DRAFT: 'bg-gray-100 text-gray-800 border-gray-200',
      OVERDUE: 'bg-red-100 text-red-800 border-red-200',
      CANCELLED: 'bg-yellow-100 text-yellow-800 border-yellow-200'
    };
    return colors[status] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 ml-64 pt-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">All Invoices</h1>
            <p className="text-gray-600 mt-1">
              {invoices.length} invoice{invoices.length !== 1 ? 's' : ''} found
            </p>
          </div>
          <Link
            to="/invoices/create"
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-lg font-semibold text-sm shadow-sm hover:shadow-md transition-all border border-indigo-600"
          >
            + Create Invoice
          </Link>
        </div>

        {/* Filters Card */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm mb-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-4">
              <label className="font-semibold text-gray-900 text-sm">Filter by Status:</label>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-sm"
              >
                <option value="">All Invoices</option>
                <option value="DRAFT">Draft</option>
                <option value="SENT">Sent</option>
                <option value="PAID">Paid</option>
                <option value="OVERDUE">Overdue</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
            {invoices.length > 0 && (
              <div className="text-sm text-gray-600">
                Showing {invoices.length} invoice{invoices.length !== 1 ? 's' : ''}
              </div>
            )}
          </div>
        </div>

        {/* Invoices Table Card */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {invoices.length === 0 ? (
            <div className="text-center py-20 px-12">
              <svg className="w-24 h-24 text-gray-400 mx-auto mb-8 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">No invoices yet</h3>
              <p className="text-xl text-gray-600 mb-10 max-w-md mx-auto leading-relaxed">
                Create your first invoice to get started with your billing.
              </p>
              <Link
                to="/invoices/create"
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-xl font-semibold text-lg shadow-sm hover:shadow-md transition-all inline-flex items-center"
              >
                Create Your First Invoice
              </Link>
            </div>
          ) : (
            <>
              <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
                <h2 className="text-xl font-semibold text-gray-900">Invoice Directory</h2>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left py-4 px-6 font-semibold text-gray-700 text-sm border-b border-gray-200">Invoice No.</th>
                      <th className="text-left py-4 px-6 font-semibold text-gray-700 text-sm border-b border-gray-200">Type</th>
                      <th className="text-left py-4 px-6 font-semibold text-gray-700 text-sm border-b border-gray-200">Client</th>
                      <th className="text-left py-4 px-6 font-semibold text-gray-700 text-sm border-b border-gray-200">Date</th>
                      <th className="text-left py-4 px-6 font-semibold text-gray-700 text-sm border-b border-gray-200">Due Date</th>
                      <th className="text-right py-4 px-6 font-semibold text-gray-700 text-sm border-b border-gray-200">Amount</th>
                      <th className="text-center py-4 px-6 font-semibold text-gray-700 text-sm border-b border-gray-200">Status</th>
                      <th className="text-center py-4 px-6 font-semibold text-gray-700 text-sm border-b border-gray-200">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {invoices.map((invoice) => (
                      <tr key={invoice._id} className="hover:bg-gray-50 transition-colors">
                        <td className="py-4 px-6 font-semibold text-gray-900">
                          #{invoice.invoiceNumber}
                        </td>
                        <td className="py-4 px-6">
                          <span className="px-3 py-1 bg-indigo-100 text-indigo-800 text-xs font-medium rounded-full">
                            {invoice.invoiceType}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          <div className="font-medium text-gray-900">{invoice.client.name}</div>
                          <div className="text-sm text-gray-500">{invoice.client.mobile}</div>
                        </td>
                        <td className="py-4 px-6 text-sm text-gray-900">
                          {format(new Date(invoice.invoiceDate), 'dd MMM yyyy')}
                        </td>
                        <td className="py-4 px-6">
                          <div className={`text-sm font-medium px-2 py-1 rounded-full ${getStatusColor(invoice.status)}`}>
                            {format(new Date(invoice.dueDate), 'dd MMM yyyy')}
                          </div>
                        </td>
                        <td className="py-4 px-6 text-right">
                          <div className="text-lg font-bold text-gray-900">
                            ₹{parseFloat(invoice.totalAmount || 0).toLocaleString('en-IN')}
                          </div>
                        </td>
                        <td className="py-4 px-6 text-center">
                          <span className={`px-4 py-2 rounded-xl text-sm font-semibold border ${getStatusColor(invoice.status)}`}>
                            {invoice.status}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-center">
                          <div className="flex justify-center items-center space-x-2">
                            <Link
                              to={`/invoices/view/${invoice._id}`}
                              className="p-2 hover:bg-indigo-50 rounded-lg text-indigo-600 hover:text-indigo-700 transition-all"
                              title="View Invoice"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                            </Link>
                            <Link
                              to={`/invoices/edit/${invoice._id}`}
                              className="p-2 hover:bg-green-50 rounded-lg text-green-600 hover:text-green-700 transition-all"
                              title="Edit Invoice"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </Link>
                            <button
                              onClick={() => handleDelete(invoice._id)}
                              className="p-2 hover:bg-red-50 rounded-lg text-red-600 hover:text-red-700 transition-all"
                              title="Delete Invoice"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Invoices;
