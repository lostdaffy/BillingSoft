import { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

const Clients = () => {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    aadhaar: '',
    panUid: '',
    mobile: '',
    email: '',
    stateCode: '',
    gst: ''
  });

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      const response = await axios.get('/api/clients');
      setClients(response.data);
    } catch (error) {
      toast.error('Failed to fetch clients');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      address: '',
      aadhaar: '',
      panUid: '',
      mobile: '',
      email: '',
      stateCode: '',
      gst: ''
    });
    setEditingClient(null);
  };

  const handleOpenModal = (client = null) => {
    if (client) {
      setEditingClient(client);
      setFormData({
        name: client.name,
        address: client.address,
        aadhaar: client.aadhaar || '',
        panUid: client.panUid || '',
        mobile: client.mobile || '',
        email: client.email || '',
        stateCode: client.stateCode || '',
        gst: client.gst || ''
      });
    } else {
      resetForm();
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    resetForm();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingClient) {
        await axios.put(`/api/clients/${editingClient._id}`, formData);
        toast.success('Client updated successfully');
      } else {
        await axios.post('/api/clients', formData);
        toast.success('Client created successfully');
      }
      fetchClients();
      handleCloseModal();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Operation failed');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this client?')) {
      return;
    }
    try {
      await axios.delete(`/api/clients/${id}`);
      toast.success('Client deleted successfully');
      fetchClients();
    } catch (error) {
      toast.error('Failed to delete client');
    }
  };

  if (loading) {
    return (
      <div className="lg:ml-64 pt-20 bg-gray-50 min-h-screen flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="px-6">
        {/* Header - EXACT Dashboard Style */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Clients</h1>
            <p className="text-sm text-gray-500 mt-1 font-medium">Manage your clients and customers</p>
          </div>
          <button
            onClick={() => handleOpenModal()}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg border border-indigo-600 shadow-sm hover:shadow-md transition-all duration-150 flex items-center space-x-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            <span>Add Client</span>
          </button>
        </div>

        {/* Clients Grid / Empty State */}
        {clients.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-12 text-center">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">No clients yet</h3>
            <p className="text-gray-500 mb-6">Get started by adding your first client.</p>
            <button
              onClick={() => handleOpenModal()}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg border border-indigo-600 shadow-sm hover:shadow-md transition-all duration-150"
            >
              Add Your First Client
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {clients.map((client) => (
              <div key={client._id} className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-200 overflow-hidden group">
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">{client.name}</h3>
                      {client.gst && (
                        <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 mt-1">
                          GST Registered
                        </div>
                      )}
                    </div>
                    <div className="flex space-x-2 opacity-0 group-hover:opacity-100 transition-all duration-200">
                      <button
                        onClick={() => handleOpenModal(client)}
                        className="p-2 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg transition-all duration-150"
                        title="Edit"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H8a2 2 0 00-2 2v6a2 2 0 002 2h6a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4 2h4m0 0L10 15l-2-2" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(client._id)}
                        className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-all duration-150"
                        title="Delete"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3 text-sm divide-y divide-gray-100">
                    {client.address && (
                      <div className="pt-3">
                        <span className="text-gray-500 font-medium">Address:</span>
                        <p className="text-gray-900 mt-1">{client.address}</p>
                      </div>
                    )}
                    <div className="pt-3 grid grid-cols-2 gap-4 text-xs">
                      {client.mobile && (
                        <div className="flex items-center space-x-2 p-2 bg-gray-50 rounded-lg">
                          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                          <span>{client.mobile}</span>
                        </div>
                      )}
                      {client.email && (
                        <div className="flex items-center space-x-2 p-2 bg-gray-50 rounded-lg">
                          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                          </svg>
                          <span>{client.email}</span>
                        </div>
                      )}
                    </div>
                    {(client.aadhaar || client.panUid || client.stateCode) && (
                      <div className="pt-3">
                        <span className="text-gray-500 font-medium text-xs uppercase tracking-wider">Documents</span>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {client.aadhaar && (
                            <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-md">Aadhaar</span>
                          )}
                          {client.panUid && (
                            <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-md">PAN</span>
                          )}
                          {client.stateCode && (
                            <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-md">{client.stateCode}</span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal - EXACT Dashboard Style */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
              {/* Modal Header */}
              <div className="px-6 py-5 border-b border-gray-200 bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                      <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">
                        {editingClient ? 'Edit Client' : 'Add New Client'}
                      </h2>
                      <p className="text-sm text-gray-500">
                        {editingClient ? 'Update client information' : 'Enter client details'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleCloseModal}
                    className="p-1.5 text-gray-400 hover:text-gray-500 hover:bg-gray-200 rounded-lg transition-all duration-150"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
                <form onSubmit={handleSubmit}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Client Name *</label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Mobile Number</label>
                      <input
                        type="tel"
                        value={formData.mobile}
                        onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Address *</label>
                      <textarea
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        rows="3"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Aadhaar Number</label>
                      <input
                        type="text"
                        value={formData.aadhaar}
                        onChange={(e) => setFormData({ ...formData, aadhaar: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        maxLength="12"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">PAN / UID</label>
                      <input
                        type="text"
                        value={formData.panUid}
                        onChange={(e) => setFormData({ ...formData, panUid: e.target.value.toUpperCase() })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 uppercase"
                        maxLength="10"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">GST Number</label>
                      <input
                        type="text"
                        value={formData.gst}
                        onChange={(e) => setFormData({ ...formData, gst: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        maxLength="15"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">State Code</label>
                      <input
                        type="text"
                        value={formData.stateCode}
                        onChange={(e) => setFormData({ ...formData, stateCode: e.target.value.toUpperCase() })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 uppercase"
                        maxLength="2"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end space-x-4 mt-8 pt-6 border-t border-gray-200">
                    <button
                      type="button"
                      onClick={handleCloseModal}
                      className="px-6 py-2.5 border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm font-semibold rounded-lg shadow-sm hover:shadow-md transition-all duration-150"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg border border-indigo-600 shadow-sm hover:shadow-md transition-all duration-150 flex items-center space-x-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>{editingClient ? 'Update Client' : 'Create Client'}</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Clients;
