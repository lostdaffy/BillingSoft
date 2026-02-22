import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";

const Settings = () => {
  const { user, updateCompany } = useAuth();
  const [formData, setFormData] = useState({
    companyName: "",
    address: "",
    gstNumber: "",
    bankName: "",
    branch: "", 
    accountNumber: "",
    ifscCode: "",
    phone: "",
    dealsIn: "",
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user?.company) {
      console.log("🔍 LOADED USER:", user.company); // DEBUG
      setFormData({
        companyName: user.company.name || "",
        address: user.company.address || "",
        gstNumber: user.company.gstin || user.company.gstNumber || "",
        bankName: user.company.bankDetails?.bankName || "",
        branch: user.company.bankDetails?.branch || "", // ✅ ADDED
        accountNumber: user.company.bankDetails?.accountNumber || "",
        ifscCode: user.company.bankDetails?.ifscCode || "",
        phone: user.company.mobile || user.company.phone || "",
        dealsIn: user.company.dealsIn || "",
      });
    }
  }, [user]);

  // ✅ FIXED: Send ALL bank fields including BRANCH
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const backendData = {
      name: formData.companyName.trim(),
      gstin: formData.gstNumber.trim(),
      mobile: formData.phone.trim(),
      address: formData.address.trim(),
      dealsIn: formData.dealsIn.trim(),
      bankDetails: {
        bankName: formData.bankName.trim(),
        branch: formData.branch.trim(), // ✅ ADDED BRANCH
        accountNumber: formData.accountNumber.trim(),
        ifscCode: formData.ifscCode.toUpperCase().trim(),
      },
    };

    console.log("📤 SENDING TO BACKEND:", backendData);

    try {
      const success = await updateCompany(backendData);
      if (success) {
        toast.success("✅ Company settings updated successfully!");
      }
    } catch (error) {
      console.error("❌ Update failed:", error);
      toast.error("Failed to update settings");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Company Settings
            </h1>
            <p className="text-lg text-gray-600 mt-1">
              Configure details for invoices & quotations
            </p>
          </div>
          <div className="text-sm text-gray-500 bg-blue-50 px-4 py-2 rounded-lg">
            Updates reflect instantly in invoices ✨
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Company Details Card */}
          <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-xl">
            {/* ... Company details form same as before ... */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Company Name, GST, Phone, DealsIn, Address - SAME */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Company Name <span className="text-red-500">*</span>
                </label>
                <input
                  name="companyName"
                  type="text"
                  value={formData.companyName}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-4 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-medium text-base"
                  placeholder="Manav Industries"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    GST Number
                  </label>
                  <input
                    name="gstNumber"
                    type="text"
                    value={formData.gstNumber}
                    onChange={handleChange}
                    maxLength={15}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-4 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-base"
                    placeholder="09GVZPD8683J1ZC"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Phone
                  </label>
                  <input
                    name="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-4 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-base"
                    placeholder="+91 9759185852"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Products/Services (Deals In)
                </label>
                <textarea
                  name="dealsIn"
                  value={formData.dealsIn}
                  onChange={handleChange}
                  rows="2"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-4 focus:ring-indigo-500 focus:border-indigo-500 transition-all resize-vertical text-base"
                  placeholder=""
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Business Address
                </label>
                <textarea
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  rows="3"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-4 focus:ring-indigo-500 focus:border-indigo-500 transition-all resize-vertical text-base"
                  placeholder="Village Malhipur, Saharanpur, 247001, UTTAR PRADESH"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 text-white py-3 px-8 rounded-xl font-bold text-base shadow-xl hover:shadow-2xl transition-all duration-200 flex items-center justify-center space-x-3 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <span>Save Company Details</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* ✅ BANK DETAILS CARD - BRANCH FIELD ADDED */}
          <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-xl">
            <div className="flex items-center mb-8">
              <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center mr-4 shadow-lg">
                <svg
                  className="w-6 h-6 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                  />
                </svg>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  Bank Details
                </h2>
                <p className="text-sm text-gray-600">
                  Printed on every invoice
                </p>
              </div>
            </div>

            <div className="space-y-6">
              {/* ✅ BANK NAME */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Bank Name
                </label>
                <input
                  name="bankName"
                  type="text"
                  value={formData.bankName}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-4 focus:ring-emerald-500 focus:border-emerald-500 transition-all font-medium"
                  placeholder="UCO BANK"
                />
              </div>

              {/* ✅ BRANCH FIELD - NEW! */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Branch Name <span className="text-red-500">*</span>
                </label>
                <input
                  name="branch"
                  type="text"
                  value={formData.branch}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-4 focus:ring-emerald-500 focus:border-emerald-500 transition-all font-medium"
                  placeholder="MALHIPUR BRANCH"
                  required
                />
              </div>

              {/* Account + IFSC */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Account Number
                  </label>
                  <input
                    name="accountNumber"
                    type="text"
                    value={formData.accountNumber}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-4 focus:ring-emerald-500 focus:border-emerald-500 transition-all font-mono tracking-wider text-sm"
                    placeholder="30900210000540"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    IFSC Code
                  </label>
                  <div className="relative">
                    <input
                      name="ifscCode"
                      type="text"
                      value={formData.ifscCode}
                      onChange={handleChange}
                      maxLength="11"
                      className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-4 focus:ring-emerald-500 focus:border-emerald-500 transition-all font-mono uppercase tracking-wider text-sm"
                      placeholder="UCBA0003090"
                    />
                    <svg
                      className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2 2z"
                      />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-5">
                <h4 className="font-semibold text-emerald-900 mb-2 text-sm flex items-center">
                  <svg
                    className="w-4 h-4 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 10V3L4 14h7v7l9-11h-7z"
                    />
                  </svg>
                  Bank details appear below amount section in invoices
                </h4>
                <p className="text-xs text-emerald-800">
                  Verify details for smooth payments
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
