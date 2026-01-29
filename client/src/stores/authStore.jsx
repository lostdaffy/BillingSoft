import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../services/api';

const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isLoading: false,

      login: async (email, password) => {
        set({ isLoading: true });
        try {
          const response = await api.post('/api/auth/login', { email, password });
          set({
            user: response.data.user,
            token: response.data.token,
            isLoading: false
          });
          return true;
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      register: async (name, email, password) => {
        set({ isLoading: true });
        try {
          const response = await api.post('/api/auth/register', { name, email, password });
          set({
            user: response.data.user,
            token: response.data.token,
            isLoading: false
          });
          return true;
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      logout: () => {
        set({ user: null, token: null });
      },

      setUser: (user) => set({ user }),
      setToken: (token) => set({ token })
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ user: state.user, token: state.token })
    }
  )
);

export default useAuthStore;
