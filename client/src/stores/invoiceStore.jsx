import { create } from 'zustand';
import api from '../services/api';

const useInvoiceStore = create((set, get) => ({
  invoices: [],
  clients: [],
  products: [],
  loading: false,

  fetchInvoices: async () => {
    set({ loading: true });
    try {
      const response = await api.get('/api/invoices');
      set({ invoices: response.data, loading: false });
    } catch (error) {
      set({ loading: false });
      throw error;
    }
  },

  fetchClients: async () => {
    set({ loading: true });
    try {
      const response = await api.get('/api/clients');
      set({ clients: response.data, loading: false });
    } catch (error) {
      set({ loading: false });
      throw error;
    }
  },

  fetchProducts: async () => {
    set({ loading: true });
    try {
      const response = await api.get('/api/products');
      set({ products: response.data, loading: false });
    } catch (error) {
      set({ loading: false });
      throw error;
    }
  },

  createInvoice: async (invoiceData) => {
    try {
      const response = await api.post('/api/invoices', invoiceData);
      set((state) => ({
        invoices: [response.data, ...state.invoices]
      }));
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  updateInvoice: async (id, invoiceData) => {
    try {
      const response = await api.put(`/api/invoices/${id}`, invoiceData);
      set((state) => ({
        invoices: state.invoices.map(inv => 
          inv._id === id ? response.data : inv
        )
      }));
      return response.data;
    } catch (error) {
      throw error;
    }
  }
}));

export default useInvoiceStore;
