import React, { useState, useEffect } from "react";
import { FaBrain, FaChartLine, FaBolt, FaClipboardList } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { decodeJwt } from "jose"; // JWT decode

const Home = () => {
  const [user, setUser] = useState(null);
  const [showProfile, setShowProfile] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    const token = localStorage.getItem("token");

    if (!token || !storedUser) return;

    try {
      const decoded = decodeJwt(token); // Decode JWT
      const currentTime = Math.floor(Date.now() / 1000);

      // If token expired, clear storage
      if (!decoded.exp || decoded.exp < currentTime) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        localStorage.removeItem("completedOptions");
        localStorage.removeItem("completedResume");

        setUser(null);
        setShowProfile(false);
        return;
      }

      // Token valid, set user
      setUser(JSON.parse(storedUser));
    } catch (error) {
      console.error("Invalid token:", error);
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      setUser(null);
      setShowProfile(false);
    }
  }, []);

  const handleLogin = () => navigate("/signin");
  const handleSignUp = () => navigate("/signup");
  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    localStorage.removeItem("completedOptions");
localStorage.removeItem("completedResume");

    setUser(null);
    setShowProfile(false);
  };

  const getInitials = (user) => {
    if (!user) return "";
    const first = user.first_name?.[0] || "";
    const last = user.last_name?.[0] || "";
    return `${first}${last}`.toUpperCase();
  };

  return (
    <div className="bg-[#0B0F1A] text-white min-h-screen flex flex-col">
      {/* Navbar */}
      <nav className="flex justify-between items-center px-8 py-4 bg-[#111827] shadow-lg">
        <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400">
          InterviewAI
        </h1>

        <div className="flex items-center gap-6">
          {!user ? (
            <>
              <button
                onClick={handleLogin}
                className="px-5 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg font-semibold transition shadow-md hover:shadow-xl"
              >
                Sign In
              </button>
              <button
                onClick={handleSignUp}
                className="px-5 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg font-semibold transition shadow-md hover:shadow-xl"
              >
                Sign Up
              </button>
            </>
          ) : (
            <div className="relative">
              <button
                onClick={() => setShowProfile(!showProfile)}
                className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition shadow-md hover:shadow-xl"
              >
                <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center font-semibold text-white">
                  {getInitials(user)}
                </div>
                <span className="font-medium">{user.first_name}</span>
              </button>

              {showProfile && (
                <div className="absolute right-0 mt-2 w-40 bg-gray-900 rounded-lg shadow-lg border border-gray-700">
                  <ul className="py-2">
                    <li
                      className="px-4 py-2 hover:bg-gray-700 cursor-pointer"
                      onClick={() => navigate("/dashboard")}
                    >
                      My Dashboard
                    </li>
                    <li className="px-4 py-2 hover:bg-gray-700 cursor-pointer">
                      Settings
                    </li>
                    <li
                      className="px-4 py-2 hover:bg-red-600 cursor-pointer text-red-400 font-semibold"
                      onClick={handleLogout}
                    >
                      Logout
                    </li>
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="flex flex-col items-center justify-center text-center py-20 px-6 bg-gradient-to-b from-[#1c0f3f] to-[#0B0F1A]">
        <h1 className="text-5xl md:text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400">
          Master Your Interview Skills
        </h1>
        <p className="mt-4 text-lg md:text-xl text-gray-300 max-w-2xl">
          Prepare for technical interviews and aptitude tests with AI-powered practice sessions
        </p>
        <button
          onClick={() => navigate("/options")}
          className="mt-6 px-8 py-3 bg-purple-600 hover:bg-purple-700 rounded-xl text-lg font-semibold transition shadow-md hover:shadow-2xl"
        >
          Get Started
        </button>
      </section>

      {/* Why Choose Section */}
      <section className="py-16 px-6 max-w-6xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
          Why Choose <span className="text-blue-400">InterviewAI?</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="bg-[#111827] border border-gray-700 rounded-xl p-6 text-center hover:scale-105 transition shadow-md hover:shadow-2xl">
            <FaBrain className="text-4xl text-blue-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">AI-Powered Interviews</h3>
            <p className="text-gray-400 text-sm">
              Practice with advanced AI that adapts to your skill level
            </p>
          </div>
          <div className="bg-[#111827] border border-gray-700 rounded-xl p-6 text-center hover:scale-105 transition shadow-md hover:shadow-2xl">
            <FaClipboardList className="text-4xl text-cyan-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Aptitude Tests</h3>
            <p className="text-gray-400 text-sm">
              Comprehensive tests to sharpen your problem-solving skills
            </p>
          </div>
          <div className="bg-[#111827] border border-gray-700 rounded-xl p-6 text-center hover:scale-105 transition shadow-md hover:shadow-2xl">
            <FaChartLine className="text-4xl text-green-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Track Progress</h3>
            <p className="text-gray-400 text-sm">
              Monitor your improvement with detailed analytics
            </p>
          </div>
          <div className="bg-[#111827] border border-gray-700 rounded-xl p-6 text-center hover:scale-105 transition shadow-md hover:shadow-2xl">
            <FaBolt className="text-4xl text-yellow-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Instant Feedback</h3>
            <p className="text-gray-400 text-sm">
              Get real-time feedback to improve faster
            </p>
          </div>
        </div>
      </section>

      {/* Final Call to Action */}
      <section className="py-16 px-6 max-w-4xl mx-auto text-center border border-gray-700 rounded-xl bg-[#111827] shadow-md hover:shadow-xl transition">
        <h2 className="text-2xl md:text-3xl font-bold mb-4">
          Ready to Ace Your Next Interview?
        </h2>
        <p className="text-gray-400 mb-6">
          Join thousands of successful candidates who prepared with InterviewAI
        </p>
        <button
          onClick={() => navigate("/dashboard")}
          className="px-8 py-3 bg-blue-500 hover:bg-blue-600 rounded-xl text-lg font-semibold transition shadow-md hover:shadow-2xl"
        >
          View Dashboard
        </button>
      </section>

      {/* Footer */}
      <footer className="mt-10 py-6 bg-[#111827] text-center text-gray-400 text-sm border-t border-gray-700">
        <p>© {new Date().getFullYear()} InterviewAI. All rights reserved.</p>
        <div className="flex justify-center gap-6 mt-2">
          <a href="#privacy" className="hover:text-white">Privacy Policy</a>
          <a href="#terms" className="hover:text-white">Terms of Service</a>
          <a href="#contact" className="hover:text-white">Contact</a>
        </div>
      </footer>
    </div>
  );
};

export default Home;
