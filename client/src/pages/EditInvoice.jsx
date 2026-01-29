import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const EditInvoice = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [clients, setClients] = useState([]);
  const [products, setProducts] = useState([]);
  const [formData, setFormData] = useState(null);

  useEffect(() => {
    fetchInvoice();
    fetchClients();
    fetchProducts();
  }, [id]);

  const fetchInvoice = async () => {
    try {
      const response = await axios.get(`/api/invoices/${id}`);
      const invoice = response.data;
      setFormData({
        ...invoice,
        invoiceDate: format(new Date(invoice.invoiceDate), 'yyyy-MM-dd'),
        dueDate: format(new Date(invoice.dueDate), 'yyyy-MM-dd')
      });
    } catch (error) {
      toast.error('Failed to fetch invoice');
      navigate('/invoices');
    } finally {
      setLoading(false);
    }
  };

  const fetchClients = async () => {
    try {
      const response = await axios.get('/api/clients');
      setClients(response.data);
    } catch (error) {
      console.error('Error fetching clients:', error);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await axios.get('/api/products');
      setProducts(response.data);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const handleClientSelect = (e) => {
    const clientId = e.target.value;
    if (clientId === 'new') {
      setFormData({
        ...formData,
        client: {
          name: '',
          address: '',
          aadhaar: '',
          panUid: '',
          mobile: '',
          stateCode: ''
        }
      });
      return;
    }

    const selectedClient = clients.find(c => c._id === clientId);
    if (selectedClient) {
      setFormData({
        ...formData,
        client: {
          name: selectedClient.name,
          address: selectedClient.address,
          aadhaar: selectedClient.aadhaar || '',
          panUid: selectedClient.panUid || '',
          mobile: selectedClient.mobile || '',
          stateCode: selectedClient.stateCode || ''
        }
      });
    }
  };

  const handleClientChange = (field, value) => {
    setFormData({
      ...formData,
      client: {
        ...formData.client,
        [field]: value
      }
    });
  };

  const addLineItem = () => {
    setFormData({
      ...formData,
      items: [
        ...formData.items,
        {
          srNo: formData.items.length + 1,
          description: '',
          hsnCode: '',
          quantity: 1,
          rate: 0,
          amount: 0
        }
      ]
    });
  };

  const removeLineItem = (index) => {
    if (formData.items.length === 1) {
      toast.error('At least one item is required');
      return;
    }

    const updatedItems = formData.items.filter((_, i) => i !== index);
    const renumberedItems = updatedItems.map((item, i) => ({
      ...item,
      srNo: i + 1
    }));

    setFormData({
      ...formData,
      items: renumberedItems
    });
  };

  const handleItemChange = (index, field, value) => {
    const updatedItems = formData.items.map((item, i) => {
      if (i === index) {
        const updated = { ...item, [field]: value };

        if (field === 'description') {
          const product = products.find(p => p.name === value);
          if (product) {
            updated.hsnCode = product.hsnCode;
            updated.rate = product.defaultRate;
            updated.amount = parseFloat(updated.quantity || 1) * product.defaultRate;
          }
        }

        if (field === 'quantity' || field === 'rate') {
          updated.amount = parseFloat(updated.quantity || 0) * parseFloat(updated.rate || 0);
        }

        return updated;
      }
      return item;
    });

    setFormData({
      ...formData,
      items: updatedItems
    });
  };

  const calculateSubtotal = () => {
    return formData.items.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0);
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    const discount = parseFloat(formData.discount || 0);
    const tax = parseFloat(formData.tax || 0);
    return subtotal - discount + tax;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.client.name || !formData.client.address) {
      toast.error('Client name and address are required');
      return;
    }

    if (formData.items.some(item => !item.description || item.quantity <= 0 || item.rate <= 0)) {
      toast.error('All items must have description, quantity, and rate');
      return;
    }

    setSaving(true);

    try {
      await axios.put(`/api/invoices/${id}`, formData);
      toast.success('Invoice updated successfully!');
      navigate(`/invoices/view/${id}`);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update invoice');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !formData) {
    return (
      <div className="lg:ml-64 pt-20 bg-gray-50 min-h-screen flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
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
              Edit Invoice #{formData.invoiceNumber}
            </h1>
            <p className="text-sm text-gray-500 mt-1 font-medium">
              Update invoice details and items
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => navigate(`/invoices/view/${id}`)}
              className="px-5 py-2.5 border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm font-semibold rounded-lg shadow-sm hover:shadow-md transition-all duration-150"
            >
              Cancel
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Invoice Details Card */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm mb-8 px-6 py-8">
            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center space-x-2">
              <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 4h3m-3 4h3m-6 0h.01" />
              </svg>
              <span>Invoice Details</span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Invoice Type</label>
                <select
                  value={formData.invoiceType}
                  onChange={(e) => setFormData({ ...formData, invoiceType: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="INVOICE">Invoice</option>
                  <option value="QUOTATION">Quotation</option>
                  <option value="ESTIMATE">Estimate</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Invoice Date</label>
                <input
                  type="date"
                  value={formData.invoiceDate}
                  onChange={(e) => setFormData({ ...formData, invoiceDate: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Due Date</label>
                <input
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  required
                />
              </div>
            </div>
          </div>

          {/* Client Details Card */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm mb-8 px-6 py-8">
            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center space-x-2">
              <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span>Client Details</span>
            </h2>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">Select Existing Client or Edit Current</label>
              <select
                onChange={handleClientSelect}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="new">Edit Current Client</option>
                {clients.map(client => (
                  <option key={client._id} value={client._id}>
                    {client.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Client Name *</label>
                <input
                  type="text"
                  value={formData.client.name}
                  onChange={(e) => handleClientChange('name', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Mobile Number</label>
                <input
                  type="tel"
                  value={formData.client.mobile}
                  onChange={(e) => handleClientChange('mobile', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Address *</label>
                <textarea
                  value={formData.client.address}
                  onChange={(e) => handleClientChange('address', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  rows="2"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Aadhaar Number</label>
                <input
                  type="text"
                  value={formData.client.aadhaar}
                  onChange={(e) => handleClientChange('aadhaar', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">PAN / UID</label>
                <input
                  type="text"
                  value={formData.client.panUid}
                  onChange={(e) => handleClientChange('panUid', e.target.value.toUpperCase())}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 uppercase"
                />
              </div>
            </div>
          </div>

          {/* Items Table Card */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm mb-8 px-6 py-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900 flex items-center space-x-2">
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
                <span>Items</span>
              </h2>
              <button
                type="button"
                onClick={addLineItem}
                className="px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg border border-green-600 shadow-sm hover:shadow-md transition-all duration-150 flex items-center space-x-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                <span>Add Item</span>
              </button>
            </div>

            <div className="overflow-x-auto mb-6">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Sr. No.</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider w-1/3">Description</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">HSN Code</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">QTY</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">Rate</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">Amount</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {formData.items.map((item, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-4 py-4 text-sm font-medium text-gray-900 text-center">{item.srNo}</td>
                      <td className="px-4 py-4">
                        <input
                          type="text"
                          list="product-list"
                          value={item.description}
                          onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                          placeholder="Enter or select product"
                        />
                        <datalist id="product-list">
                          {products.map(p => (
                            <option key={p._id} value={p.name} />
                          ))}
                        </datalist>
                      </td>
                      <td className="px-4 py-4">
                        <input
                          type="text"
                          value={item.hsnCode}
                          onChange={(e) => handleItemChange(index, 'hsnCode', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                      </td>
                      <td className="px-4 py-4">
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-right"
                          min="1"
                        />
                      </td>
                      <td className="px-4 py-4 text-right">
                        <input
                          type="number"
                          value={item.rate}
                          onChange={(e) => handleItemChange(index, 'rate', e.target.value)}
                          className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-right mx-auto"
                          min="0"
                          step="0.01"
                        />
                      </td>
                      <td className="px-4 py-4 text-right font-semibold text-indigo-600 text-sm">
                        ₹{Number(item.amount || 0).toLocaleString('en-IN')}
                      </td>
                      <td className="px-4 py-4 text-center">
                        <button
                          type="button"
                          onClick={() => removeLineItem(index)}
                          className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-medium rounded-md shadow-sm hover:shadow-md transition-all duration-150"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Amount Details Card */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm mb-8 px-6 py-8">
            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center space-x-2">
              <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
              <span>Amount Details</span>
            </h2>
            <div className="max-w-md ml-auto space-y-4">
              <div className="flex justify-between items-center py-2">
                <span className="text-sm font-medium text-gray-700">Subtotal:</span>
                <span className="text-lg font-semibold text-gray-900">
                  ₹{calculateSubtotal().toLocaleString('en-IN')}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium text-gray-700">Discount:</label>
                <input
                  type="number"
                  value={formData.discount}
                  onChange={(e) => setFormData({ ...formData, discount: parseFloat(e.target.value) || 0 })}
                  className="w-28 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-right"
                  min="0"
                  step="0.01"
                />
              </div>
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium text-gray-700">Tax/GST:</label>
                <input
                  type="number"
                  value={formData.tax}
                  onChange={(e) => setFormData({ ...formData, tax: parseFloat(e.target.value) || 0 })}
                  className="w-28 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-right"
                  min="0"
                  step="0.01"
                />
              </div>
              <div className="border-t-2 pt-4 flex justify-between items-center">
                <span className="text-xl font-bold text-gray-900">Total Amount:</span>
                <span className="text-2xl font-bold text-indigo-600">
                  ₹{calculateTotal().toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          </div>

          {/* Additional Details Card */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm mb-8 px-6 py-8">
            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center space-x-2">
              <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>Additional Details</span>
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Invoice Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="DRAFT">Draft</option>
                  <option value="SENT">Sent</option>
                  <option value="PAID">Paid</option>
                  <option value="OVERDUE">Overdue</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>
              <div></div>
              <div className="lg:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Terms & Conditions</label>
                <textarea
                  value={formData.termsAndConditions}
                  onChange={(e) => setFormData({ ...formData, termsAndConditions: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  rows="6"
                />
              </div>
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm px-6 py-8">
            <div className="flex justify-end space-x-4">
              <button
                type="button"
                onClick={() => navigate(`/invoices/view/${id}`)}
                className="px-6 py-3 border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm font-semibold rounded-lg shadow-sm hover:shadow-md transition-all duration-150"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg border border-indigo-600 shadow-sm hover:shadow-md transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>{saving ? 'Updating...' : 'Update Invoice'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditInvoice;
