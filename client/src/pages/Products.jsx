import { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

const Products = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    hsnCode: '',
    defaultRate: '',
    description: '',
    unit: 'Nos'
  });

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await axios.get('/api/products');
      setProducts(response.data);
    } catch (error) {
      toast.error('Failed to fetch products');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      hsnCode: '',
      defaultRate: '',
      description: '',
      unit: 'Nos'
    });
    setEditingProduct(null);
  };

  const handleOpenModal = (product = null) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        name: product.name,
        hsnCode: product.hsnCode,
        defaultRate: product.defaultRate,
        description: product.description || '',
        unit: product.unit || 'Nos'
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
      if (editingProduct) {
        await axios.put(`/api/products/${editingProduct._id}`, formData);
        toast.success('Product updated successfully');
      } else {
        await axios.post('/api/products', formData);
        toast.success('Product created successfully');
      }
      fetchProducts();
      handleCloseModal();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Operation failed');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this product?')) {
      return;
    }
    try {
      await axios.delete(`/api/products/${id}`);
      toast.success('Product deleted successfully');
      fetchProducts();
    } catch (error) {
      toast.error('Failed to delete product');
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
    <div className=" bg-gray-50 min-h-screen">
      <div className="px-6">
        {/* Header - EXACT Dashboard Style */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Products</h1>
            <p className="text-sm text-gray-500 mt-1 font-medium">Manage your products and services</p>
          </div>
          <button
            onClick={() => handleOpenModal()}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg border border-indigo-600 shadow-sm hover:shadow-md transition-all duration-150 flex items-center space-x-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            <span>Add Product</span>
          </button>
        </div>

        {/* Products Table / Empty State */}
        {products.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-12 text-center">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">No products yet</h3>
            <p className="text-gray-500 mb-6">Get started by adding your first product.</p>
            <button
              onClick={() => handleOpenModal()}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg border border-indigo-600 shadow-sm hover:shadow-md transition-all duration-150"
            >
              Add Your First Product
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Product Name</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">HSN Code</th>
                    <th className="px-6 py-4 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">Default Rate</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Unit</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Description</th>
                    <th className="px-6 py-4 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {products.map((product) => (
                    <tr key={product._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center mr-4">
                            <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                            </svg>
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-gray-900">{product.name}</div>
                            {product.hsnCode && (
                              <div className="text-xs text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                                {product.hsnCode}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {product.hsnCode || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold text-indigo-600">
                        ₹{Number(product.defaultRate || 0).toLocaleString('en-IN')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex px-2 py-1 text-xs font-semibold bg-gray-100 text-gray-800 rounded-full">
                          {product.unit || 'Nos'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 max-w-md truncate" title={product.description || 'No description'}>
                        {product.description || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                        <div className="flex justify-center items-center space-x-2">
                          <button
                            onClick={() => handleOpenModal(product)}
                            className="p-2 text-indigo-600 hover:text-indigo-900 hover:bg-indigo-50 rounded-lg transition-all duration-150"
                            title="Edit Product"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H8a2 2 0 00-2 2v6a2 2 0 002 2h6a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4 2h4m0 0L10 15l-2-2" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDelete(product._id)}
                            className="p-2 text-red-600 hover:text-red-900 hover:bg-red-50 rounded-lg transition-all duration-150"
                            title="Delete Product"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
          </div>
        )}

        {/* Modal - EXACT Dashboard Style */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-hidden shadow-2xl">
              {/* Modal Header */}
              <div className="px-6 py-5 border-b border-gray-200 bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                      <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">
                        {editingProduct ? 'Edit Product' : 'Add New Product'}
                      </h2>
                      <p className="text-sm text-gray-500">
                        {editingProduct ? 'Update product details' : 'Enter product information'}
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
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Product Name *</label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">HSN Code *</label>
                      <input
                        type="text"
                        value={formData.hsnCode}
                        onChange={(e) => setFormData({ ...formData, hsnCode: e.target.value.toUpperCase() })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 uppercase"
                        maxLength="12"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Default Rate (₹) *</label>
                      <input
                        type="number"
                        value={formData.defaultRate}
                        onChange={(e) => setFormData({ ...formData, defaultRate: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-right"
                        min="0"
                        step="0.01"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Unit</label>
                      <select
                        value={formData.unit}
                        onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      >
                        <option value="Nos">Nos (Numbers)</option>
                        <option value="Kg">Kg (Kilograms)</option>
                        <option value="Ltr">Ltr (Liters)</option>
                        <option value="Mtr">Mtr (Meters)</option>
                        <option value="Pcs">Pcs (Pieces)</option>
                        <option value="Box">Box</option>
                        <option value="Set">Set</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                      <textarea
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-vertical"
                        rows="3"
                        placeholder="Optional product description..."
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
                      <span>{editingProduct ? 'Update Product' : 'Create Product'}</span>
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

export default Products;
