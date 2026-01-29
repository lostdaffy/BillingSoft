import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";

const Settings = () => {
  const { user, updateCompany } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    gstin: "",
    mobile: "",
    address: "",
    dealsIn: "",
    bankDetails: {
      bankName: "",
      branch: "",
      accountNumber: "",
      ifscCode: "",
    },
  });

  useEffect(() => {
    // Initialize form data when user loads
    if (user?.company) {
      setFormData({
        name: user.company.name || "",
        gstin: user.company.gstin || "",
        mobile: user.company.mobile || "",
        address: user.company.address || "",
        dealsIn: user.company.dealsIn || "",
        bankDetails: {
          bankName: user.company.bankDetails?.bankName || "",
          branch: user.company.bankDetails?.branch || "",
          accountNumber: user.company.bankDetails?.accountNumber || "",
          ifscCode: user.company.bankDetails?.ifscCode || "",
        },
      });
    }
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const success = await updateCompany(formData);
      if (success) {
        toast.success("Settings updated successfully!");
      }
    } catch (error) {
      toast.error("Failed to update settings");
    } finally {
      setLoading(false);
    }
  };

  const handleBankDetailChange = (field, value) => {
    setFormData({
      ...formData,
      bankDetails: {
        ...formData.bankDetails,
        [field]: value,
      },
    });
  };

  const handleChange = (field, value) => {
    setFormData({
      ...formData,
      [field]: value,
    });
  };

  return (
    <div className=" bg-gray-50 min-h-screen">
      <div>
        {/* Header - EXACT Dashboard Style */}
        <div className="flex items-center justify-between mb-8 px-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
              Company Settings
            </h1>
            <p className="text-sm text-gray-500 mt-1 font-medium">
              Update your company information
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Company Information Card */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm mb-8 px-6 py-8">
            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center space-x-2">
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
              <span>Company Information</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Company Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleChange("name", e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Enter your company name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  GSTIN Number
                </label>
                <input
                  type="text"
                  value={formData.gstin}
                  onChange={(e) => handleChange("gstin", e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="22AAAAA0000A1Z5"
                  maxLength="15"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mobile Number
                </label>
                <input
                  type="tel"
                  value={formData.mobile}
                  onChange={(e) => handleChange("mobile", e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="+91 9876543210"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Company Address
                </label>
                <textarea
                  value={formData.address}
                  onChange={(e) => handleChange("address", e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  rows="3"
                  placeholder="Enter complete address with city, state, and pincode"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Deals In (Products/Services)
                </label>
                <textarea
                  value={formData.dealsIn}
                  onChange={(e) => handleChange("dealsIn", e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  rows="3"
                  placeholder="Describe what products or services your company deals in"
                />
              </div>
            </div>
          </div>

          {/* Bank Details Card */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm mb-8 px-6 py-8">
            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center space-x-2">
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
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
                />
              </svg>
              <span>Bank Details</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bank Name
                </label>
                <input
                  type="text"
                  value={formData.bankDetails.bankName}
                  onChange={(e) =>
                    handleBankDetailChange("bankName", e.target.value)
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="State Bank of India"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Branch Name
                </label>
                <input
                  type="text"
                  value={formData.bankDetails.branch}
                  onChange={(e) =>
                    handleBankDetailChange("branch", e.target.value)
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Main Branch"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Account Number
                </label>
                <input
                  type="text"
                  value={formData.bankDetails.accountNumber}
                  onChange={(e) =>
                    handleBankDetailChange("accountNumber", e.target.value)
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="1234567890"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  IFSC Code
                </label>
                <input
                  type="text"
                  value={formData.bankDetails.ifscCode}
                  onChange={(e) =>
                    handleBankDetailChange(
                      "ifscCode",
                      e.target.value.toUpperCase(),
                    )
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 uppercase"
                  placeholder="SBIN0001234"
                  maxLength="11"
                />
              </div>
            </div>
          </div>

          {/* Account Information Card (Read Only) */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm mb-8 px-6 py-8">
            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center space-x-2">
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
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
              <span>Account Information</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Your Name
                </label>
                <input
                  type="text"
                  value={user?.name || ""}
                  className="w-full px-4 py-3 border border-gray-200 bg-gray-50 text-sm rounded-lg cursor-not-allowed"
                  disabled
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={user?.email || ""}
                  className="w-full px-4 py-3 border border-gray-200 bg-gray-50 text-sm rounded-lg cursor-not-allowed"
                  disabled
                />
              </div>
            </div>

            <p className="text-sm text-gray-500 mt-4 bg-gray-50 p-4 rounded-lg">
              Note: To change your name or email, please contact support.
            </p>
          </div>

          {/* Save Button Card */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm px-6 py-8">
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg border border-indigo-600 shadow-sm hover:shadow-md transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
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
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                <span>{loading ? "Saving..." : "Save Settings"}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Settings;
