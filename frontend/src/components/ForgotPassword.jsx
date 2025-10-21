import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

const ForgotPassword = () => {
  const [step, setStep] = useState(1);
  const [email_id, setEmailId] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const navigate = useNavigate();

  // 1️⃣ Send OTP
  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (!email_id) return toast.error("Email is required");

    try {
      const res = await fetch("http://localhost:8000/forgot-password/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email_id }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success(data.message || "OTP sent successfully");
        setStep(2);
      } else {
        toast.error(data.message || "Failed to send OTP");
      }
    } catch (err) {
      console.error(err);
      toast.error("Something went wrong while sending OTP");
    }
  };

  // 2️⃣ Verify OTP
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!otp) return toast.error("OTP is required");

    try {
      const res = await fetch("http://localhost:8000/forgot-password/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email_id, otp }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success(data.message || "OTP verified successfully");
        setStep(3);
      } else {
        toast.error(data.message || "Invalid OTP");
      }
    } catch (err) {
      console.error(err);
      toast.error("Something went wrong while verifying OTP");
    }
  };

  // 3️⃣ Reset Password
  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!password || !confirmPassword) return toast.error("Both password fields are required");
    if (password !== confirmPassword) return toast.error("Passwords do not match");

    try {
      const res = await fetch("http://localhost:8000/forgot-password/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email_id, password }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success(data.message || "Password reset successfully");
        setStep(1);
        setEmailId(""); 
        setOtp(""); 
        setPassword(""); 
        setConfirmPassword("");
        navigate("/signin");
      } else {
        toast.error(data.message || "Failed to reset password");
      }
    } catch (err) {
      console.error(err);
      toast.error("Something went wrong while resetting password");
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-[#0B0F1A] via-[#111827] to-[#1c0f3f] px-4">
      <div className="w-full max-w-md bg-[#111827]/90 p-8 rounded-2xl shadow-2xl border border-gray-700">
        <h2 className="text-3xl font-bold text-center text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400">
          Forgot Password
        </h2>
        <p className="text-center text-gray-400 mt-1 mb-6">
          Reset your password in a few easy steps
        </p>

        <form className="space-y-4">
          {/* Step 1: Enter Email */}
          {step === 1 && (
            <>
              <input
                type="email"
                value={email_id}
                onChange={(e) => setEmailId(e.target.value)}
                placeholder="Enter your email"
                className="w-full px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white focus:outline-none"
              />
              <button
                onClick={handleSendOtp}
                className="w-full py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 rounded-lg font-semibold text-white shadow-md hover:shadow-xl transition"
              >
                Send OTP
              </button>
            </>
          )}

          {/* Step 2: Verify OTP */}
          {step === 2 && (
            <>
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="Enter OTP"
                className="w-full px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white focus:outline-none"
              />
              <button
                onClick={handleVerifyOtp}
                className="w-full py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 rounded-lg font-semibold text-white shadow-md hover:shadow-xl transition"
              >
                Verify OTP
              </button>
            </>
          )}

          {/* Step 3: Reset Password */}
          {step === 3 && (
            <>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="New Password"
                className="w-full px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white focus:outline-none"
              />
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm Password"
                className="w-full px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white focus:outline-none"
              />
              <button
                onClick={handleResetPassword}
                className="w-full py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 rounded-lg font-semibold text-white shadow-md hover:shadow-xl transition"
              >
                Reset Password
              </button>
            </>
          )}
        </form>

        <button
          onClick={() => navigate("/signin")}
          className="mt-6 w-full py-2 border border-gray-700 text-gray-300 rounded-lg hover:bg-gray-700 transition"
        >
          Back to Sign In
        </button>
      </div>
    </div>
  );
};

export default ForgotPassword;
