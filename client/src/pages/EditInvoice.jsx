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
      
      // ✅ Ensure client has gstin field (backward compatibility)
      const clientWithGstin = {
        ...invoice.client,
        gstin: invoice.client?.gstin || invoice.client?.gst || ''
      };
      
      setFormData({
        ...invoice,
        client: clientWithGstin,
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

  // ✅ UPDATED: handleClientSelect with GSTIN support
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
          gstin: '',        // ✅ RESET GSTIN
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
          gstin: selectedClient.gst || selectedClient.gstin || '',  // ✅ LOAD GST/GSTIN
          stateCode: selectedClient.stateCode || ''
        }
      });
    }
  };

  // ✅ UPDATED: handleClientChange with GSTIN uppercase
  const handleClientChange = (field, value) => {
    setFormData({
      ...formData,
      client: {
        ...formData.client,
        [field]: field === 'gstin' ? value.toUpperCase() : value
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

        // Auto-fill product details
        if (field === 'description') {
          const product = products.find(p => p.name === value);
          if (product) {
            updated.hsnCode = product.hsnCode;
            updated.rate = product.defaultRate;
            updated.amount = parseFloat(updated.quantity || 0) * product.defaultRate;
          }
        }

        // Auto-calculate amount
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
      <div className="flex items-center justify-center min-h-screen bg-gray-50 ml-64 pt-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="p-8 bg-gray-50 min-h-screen pt-20">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Edit Invoice</h1>
            <p className="text-gray-600 mt-1">#{formData.invoiceNumber} - {formData.client?.name}</p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={() => navigate(`/invoices/view/${id}`)}
              className="px-6 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 font-semibold text-sm shadow-sm transition-all"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => navigate(`/invoices/view/${id}`)}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold text-sm shadow-sm hover:shadow-md transition-all"
            >
              View Invoice
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Invoice Details Card */}
          <div className="bg-white p-8 rounded-xl border border-gray-200 shadow-sm">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Invoice Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Invoice Type</label>
                <select
                  value={formData.invoiceType}
                  onChange={(e) => setFormData({ ...formData, invoiceType: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
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
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Due Date</label>
                <input
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  required
                />
              </div>
            </div>
          </div>

          {/* ✅ UPDATED Client Details Card WITH GSTIN */}
          <div className="bg-white p-8 rounded-xl border border-gray-200 shadow-sm">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Client Details</h2>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Select Existing Client (Optional)
              </label>
              <select
                onChange={handleClientSelect}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              >
                <option value="new">-- Keep Current or Select Existing --</option>
                {clients.map(client => (
                  <option key={client._id} value={client._id}>
                    {client.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Client Name *</label>
                <input
                  type="text"
                  value={formData.client.name}
                  onChange={(e) => handleClientChange('name', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Mobile Number</label>
                <input
                  type="text"
                  value={formData.client.mobile || ''}
                  onChange={(e) => handleClientChange('mobile', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                />
              </div>

              {/* ✅ GSTIN FIELD ADDED */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">GSTIN / UIN</label>
                <input
                  type="text"
                  value={formData.client.gstin || ''}
                  onChange={(e) => handleClientChange('gstin', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all font-mono tracking-wider uppercase"
                  placeholder="09ABCDE1234F1Z5"
                />
              </div>

              <div className="md:col-span-2 lg:col-span-3">
                <label className="block text-sm font-medium text-gray-700 mb-2">Address *</label>
                <textarea
                  value={formData.client.address}
                  onChange={(e) => handleClientChange('address', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all resize-vertical"
                  rows="3"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Aadhaar Number</label>
                <input
                  type="text"
                  value={formData.client.aadhaar || ''}
                  onChange={(e) => handleClientChange('aadhaar', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">PAN / UID</label>
                <input
                  type="text"
                  value={formData.client.panUid || ''}
                  onChange={(e) => handleClientChange('panUid', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">State Code</label>
                <input
                  type="text"
                  value={formData.client.stateCode || ''}
                  onChange={(e) => handleClientChange('stateCode', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  maxLength={2}
                />
              </div>
            </div>
          </div>

          {/* Items Table Card */}
          <div className="bg-white p-8 rounded-xl border border-gray-200 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900">Line Items ({formData.items.length})</h2>
              <button
                type="button"
                onClick={addLineItem}
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-2.5 rounded-lg font-semibold text-sm shadow-sm hover:shadow-md transition-all"
              >
                + Add Item
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border border-gray-200 px-4 py-3 text-left text-sm font-semibold text-gray-700">Sr. No.</th>
                    <th className="border border-gray-200 px-4 py-3 text-left text-sm font-semibold text-gray-700 w-2/5">Description</th>
                    <th className="border border-gray-200 px-4 py-3 text-left text-sm font-semibold text-gray-700">HSN Code</th>
                    <th className="border border-gray-200 px-4 py-3 text-center text-sm font-semibold text-gray-700">QTY</th>
                    <th className="border border-gray-200 px-4 py-3 text-right text-sm font-semibold text-gray-700">Rate</th>
                    <th className="border border-gray-200 px-4 py-3 text-right text-sm font-semibold text-gray-700">Amount</th>
                    <th className="border border-gray-200 px-4 py-3 text-center text-sm font-semibold text-gray-700">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {formData.items.map((item, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="border border-gray-200 px-4 py-4 text-center font-medium text-gray-900">
                        {item.srNo}
                      </td>
                      <td className="border border-gray-200 px-4 py-4">
                        <input
                          type="text"
                          list={`product-list-${index}`}
                          value={item.description}
                          onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-sm"
                          placeholder="Enter or select product"
                        />
                        <datalist id={`product-list-${index}`}>
                          {products.map(p => (
                            <option key={p._id} value={p.name} />
                          ))}
                        </datalist>
                      </td>
                      <td className="border border-gray-200 px-4 py-4">
                        <input
                          type="text"
                          value={item.hsnCode || ''}
                          onChange={(e) => handleItemChange(index, 'hsnCode', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-sm"
                        />
                      </td>
                      <td className="border border-gray-200 px-4 py-4 text-center">
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                          className="w-20 px-2 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-sm"
                          min="1"
                        />
                      </td>
                      <td className="border border-gray-200 px-4 py-4 text-right">
                        <input
                          type="number"
                          value={item.rate}
                          onChange={(e) => handleItemChange(index, 'rate', e.target.value)}
                          className="w-24 px-2 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-sm text-right"
                          min="0"
                          step="0.01"
                        />
                      </td>
                      <td className="border border-gray-200 px-4 py-4 text-right font-semibold text-indigo-600 text-sm">
                        ₹{parseFloat(item.amount || 0).toLocaleString('en-IN')}
                      </td>
                      <td className="border border-gray-200 px-4 py-4 text-center">
                        <button
                          type="button"
                          onClick={() => removeLineItem(index)}
                          className="text-red-600 hover:text-red-800 hover:bg-red-50 px-3 py-1 rounded-md font-medium text-xs transition-all"
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

          {/* Calculations Card */}
          <div className="bg-white p-8 rounded-xl border border-gray-200 shadow-sm">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Amount Summary</h2>
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
                  value={formData.discount || 0}
                  onChange={(e) => setFormData({ ...formData, discount: parseFloat(e.target.value) || 0 })}
                  className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-right"
                  min="0"
                  step="0.01"
                />
              </div>
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium text-gray-700">Tax/GST:</label>
                <input
                  type="number"
                  value={formData.tax || 0}
                  onChange={(e) => setFormData({ ...formData, tax: parseFloat(e.target.value) || 0 })}
                  className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-right"
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
          <div className="bg-white p-8 rounded-xl border border-gray-200 shadow-sm">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Additional Details</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Invoice Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
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
                  value={formData.termsAndConditions || ''}
                  onChange={(e) => setFormData({ ...formData, termsAndConditions: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all resize-vertical"
                  rows="6"
                />
              </div>
              {formData.notes && (
                <div className="lg:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all resize-vertical"
                    rows="3"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="flex justify-end space-x-4 pt-8">
            <button
              type="button"
              onClick={() => navigate(`/invoices/view/${id}`)}
              className="px-8 py-3 border border-gray-300 rounded-xl hover:bg-gray-50 font-semibold text-sm shadow-sm hover:shadow-md transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-xl font-semibold text-sm shadow-sm hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Updating...' : 'Update Invoice'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditInvoice;
