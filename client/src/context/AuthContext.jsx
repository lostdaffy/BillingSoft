import { createContext, useState, useContext, useEffect } from "react";
import api from "../lib/api.js";
import toast from "react-hot-toast";

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
};

export const AuthProvider = ({ children }) => {

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const token = localStorage.getItem("token");

      if (!token) {
        setLoading(false);
        return;
      }

      const response = await api.get("/auth/me");

      setUser(response.data.user);

    } catch (error) {
      localStorage.removeItem("token");
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {

      const response = await api.post("/auth/login", {
        email,
        password
      });

      localStorage.setItem("token", response.data.token);
      setUser(response.data.user);

      toast.success("Login successful!");

      return true;

    } catch (error) {

      toast.error(error.response?.data?.message || "Login failed");

      return false;
    }
  };

  const register = async (name, email, password) => {
    try {

      const response = await api.post("/auth/register", {
        name,
        email,
        password
      });

      localStorage.setItem("token", response.data.token);
      setUser(response.data.user);

      toast.success("Registration successful!");

      return true;

    } catch (error) {

      toast.error(error.response?.data?.message || "Registration failed");

      return false;
    }
  };

  const logout = () => {

    localStorage.removeItem("token");

    setUser(null);

    toast.success("Logged out successfully");
  };

  const updateCompany = async (companyData) => {
    try {

      const response = await api.put("/auth/company", companyData);

      setUser({
        ...user,
        company: response.data.company
      });

      toast.success("Company details updated!");

      return true;

    } catch (error) {

      toast.error(error.response?.data?.message || "Update failed");

      return false;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        updateCompany
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};