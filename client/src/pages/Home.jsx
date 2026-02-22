import { Link } from "react-router-dom";

const Home = () => {
  return (
    <div className="bg-gray-50 min-h-screen">
      {/* ===== 1. HERO SECTION ===== */}
      <section className="bg-white py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <div className="mb-12">
            <h1 className="text-5xl md:text-6xl font-bold bg-linear-to-r from-indigo-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent mb-6">
              BillingSoft
            </h1>
            <p className="text-xl md:text-2xl text-gray-600 max-w-3xl mx-auto mb-8 leading-relaxed">
              Professional GST billing software for Indian businesses. Create,
              manage & track invoices with zero hassle.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center max-w-2xl mx-auto">
              <Link
                to="/register"
                className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-4 rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1"
              >
                Start Free Trial
              </Link>
              <Link
                to="/login"
                className="w-full sm:w-auto border-2 border-gray-300 text-gray-700 px-8 py-4 rounded-xl font-semibold text-lg hover:bg-gray-50 transition-all"
              >
                Demo Login
              </Link>
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto">
            <div>
              <img
                src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=500"
                alt="Invoice Dashboard"
                className="rounded-2xl shadow-2xl w-full h-64 object-cover"
              />
            </div>
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-6 rounded-xl">
                <div className="flex items-center space-x-3 mb-3">
                  <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                    <svg
                      className="w-6 h-6 text-indigo-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">
                    GST Compliant
                  </h3>
                </div>
                <p className="text-gray-600">
                  100% GST India compliant invoices with e-way bill support
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== 2. FEATURES SECTION ===== */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Everything You Need
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Powerful features designed for Indian businesses
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center group hover:shadow-xl transition-all duration-300 p-8 rounded-2xl hover:-translate-y-2 border border-gray-100">
              <div className="w-20 h-20 bg-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:bg-indigo-200 transition-colors">
                <svg
                  className="w-10 h-10 text-indigo-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                  />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                Fast Invoicing
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Create GST invoices in 30 seconds. Convert quotes to invoices
                instantly.
              </p>
            </div>

            <div className="text-center group hover:shadow-xl transition-all duration-300 p-8 rounded-2xl hover:-translate-y-2 border border-gray-100 relative">
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 w-24 h-1 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"></div>
              <div className="w-20 h-20 bg-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:bg-indigo-200 transition-colors">
                <svg
                  className="w-10 h-10 text-indigo-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                100% GST Compliant
              </h3>
              <p className="text-gray-600 leading-relaxed">
                IRN, e-way bills, HSN codes, state-wise GST. All India GST
                formats supported.
              </p>
            </div>

            <div className="text-center group hover:shadow-xl transition-all duration-300 p-8 rounded-2xl hover:-translate-y-2 border border-gray-100">
              <div className="w-20 h-20 bg-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:bg-indigo-200 transition-colors">
                <svg
                  className="w-10 h-10 text-indigo-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                PDF Export
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Beautiful, print-ready PDF invoices. Share via WhatsApp, email
                instantly.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ===== 3. STATS SECTION ===== */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-indigo-50 to-purple-50">
        <div className="max-w-4xl mx-auto text-center">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="text-4xl font-bold text-indigo-600 mb-2">
                50K+
              </div>
              <div className="text-gray-600 font-semibold">
                Invoices Created
              </div>
            </div>
            <div>
              <div className="text-4xl font-bold text-indigo-600 mb-2">
                10K+
              </div>
              <div className="text-gray-600 font-semibold">
                Happy Businesses
              </div>
            </div>
            <div>
              <div className="text-4xl font-bold text-indigo-600 mb-2">
                99.9%
              </div>
              <div className="text-gray-600 font-semibold">Uptime</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-indigo-600 mb-2">
                100%
              </div>
              <div className="text-gray-600 font-semibold">GST Compliant</div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== 4. HOW IT WORKS SECTION ===== */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              How It Works
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              3 simple steps to professional invoicing
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-12 items-center">
            <div className="text-center order-2 md:order-1">
              <div className="w-28 h-28 bg-indigo-100 rounded-3xl flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl font-bold text-indigo-600">1</span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                Add Client
              </h3>
              <p className="text-gray-600 leading-relaxed max-w-md mx-auto">
                Save client GST, PAN, address details once. Auto-fill future
                invoices.
              </p>
            </div>

            <div className="relative order-3 md:order-2">
              <div className="w-28 h-1 bg-indigo-200 mx-auto"></div>
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center">
                  <svg
                    className="w-4 h-4 text-white"
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
                </div>
              </div>
            </div>

            <div className="text-center order-4 md:order-3">
              <div className="w-28 h-28 bg-green-100 rounded-3xl flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl font-bold text-green-600">2</span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                Create Invoice
              </h3>
              <p className="text-gray-600 leading-relaxed max-w-md mx-auto">
                Add items, auto-calculate GST, generate IRN. Done in 30 seconds.
              </p>
            </div>

            <div className="relative order-5 md:order-4 hidden md:block">
              <div className="w-28 h-1 bg-indigo-200 mx-auto"></div>
            </div>

            <div className="text-center order-6 md:order-5">
              <div className="w-28 h-28 bg-purple-100 rounded-3xl flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl font-bold text-purple-600">3</span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                Send & Track
              </h3>
              <p className="text-gray-600 leading-relaxed max-w-md mx-auto">
                Share PDF via WhatsApp/Email. Track payments automatically.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ===== 5. CTA SECTION ===== */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Ready to Simplify Billing?
          </h2>
          <p className="text-xl md:text-2xl text-indigo-100 mb-12 max-w-2xl mx-auto leading-relaxed">
            Join 10,000+ businesses using BillingSoft for effortless GST
            compliance
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link
              to="/register"
              className="w-full sm:w-auto bg-white text-indigo-600 px-10 py-4 rounded-xl font-bold text-lg shadow-2xl hover:shadow-3xl hover:-translate-y-1 transition-all duration-300"
            >
              Start Free Trial
            </Link>
            <Link
              to="/demo"
              className="w-full sm:w-auto bg-white/20 backdrop-blur-sm text-white/90 px-10 py-4 rounded-xl font-semibold text-lg border border-white/30 hover:bg-white/30 transition-all"
            >
              Watch Demo
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
