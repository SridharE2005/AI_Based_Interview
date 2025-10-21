import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom"; // useNavigate to redirect after login
import { FaArrowLeft } from "react-icons/fa";
import { toast } from 'react-toastify';
import "../ForgotPassword"

const SignIn = () => {
  const [form, setForm] = useState({ email: "", password: "" });
  const navigate = useNavigate(); // to redirect after login

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const response = await fetch("http://localhost:8000/auth/signin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await response.json();

      if (response.ok) {
        // Save token and user data in localStorage
        localStorage.setItem("token", data.access_token);
        localStorage.setItem("user", JSON.stringify(data.user));

        toast.success(data.message || "Login successful!");
        
        // Redirect to dashboard or home page
        navigate("/"); // replace with your route
      } else {
        toast.error(data.detail || "Login failed");
      }
    } catch (error) {
      console.error(error);
      toast.error("Error during login");
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-[#0B0F1A] via-[#111827] to-[#1c0f3f] text-white relative">
      <Link
        to="/"
        className="absolute top-6 left-6 flex items-center text-gray-300 hover:text-white transition"
      >
        <FaArrowLeft className="mr-2" />
        <span className="font-medium">Back to Home</span>
      </Link>

      <div className="w-full max-w-md bg-[#111827]/90 p-8 rounded-2xl shadow-2xl border border-gray-700">
        <h1 className="text-3xl font-bold text-center text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400">
          TechTalkAI
        </h1>
        <p className="text-center text-gray-400 mt-1 text-sm">
          Welcome back! Login to continue 🚀
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <input
            type="email"
            name="email"
            placeholder="Email"
            value={form.email}
            onChange={handleChange}
            required
            className="w-full px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 focus:outline-none"
          />

          <input
            type="password"
            name="password"
            placeholder="Password"
            value={form.password}
            onChange={handleChange}
            required
            className="w-full px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 focus:outline-none"
          />

          <div className="flex justify-end">
            <Link
              to="/forgot-password"
              className="text-sm text-blue-400 hover:text-blue-300"
            >
              Forgot Password?
            </Link>
          </div>

          <button
            type="submit"
            className="w-full py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 rounded-lg font-semibold transition shadow-md hover:shadow-xl"
          >
            Login
          </button>
        </form>

        <div className="mt-4 text-center text-sm text-gray-400">
          Don’t have an account?{" "}
          <Link to="/signup" className="text-blue-400 hover:text-blue-300">
            Create one
          </Link>
        </div>
      </div>
    </div>
  );
};

export default SignIn;
