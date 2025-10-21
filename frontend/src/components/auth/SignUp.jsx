import React, { useState } from "react";
import { Link } from "react-router-dom";
import { FaArrowLeft, FaCamera } from "react-icons/fa";
import { toast } from "react-toastify";
import LoadingOverlay from "../LoadingOverlay";

const SignUp = () => {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });

  const [profileImage, setProfileImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // Handle profile image selection
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProfileImage(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
  e.preventDefault();

  if (form.password !== form.confirmPassword) {
    toast.error("Passwords do not match!");
    return;
  }

  const formData = new FormData();
  formData.append("first_name", form.firstName);
  formData.append("last_name", form.lastName);
  formData.append("email", form.email);
  formData.append("phone_number", form.phone);
  formData.append("password", form.password);
  formData.append("total_interviews", 0);
  formData.append("skills", "");
  formData.append("technical_interview", "");
  formData.append("aptitude_interview", "");
  formData.append("overall_score", "");

  if (profileImage) {
    formData.append("profile_image", profileImage);
  }

  setLoading(true); // 👈 Start loading before sending request

  try {
    const response = await fetch("http://localhost:8000/auth/send-otp", {
      method: "POST",
      body: formData,
    });

    const data = await response.json();

    if (response.ok) {
      setOtpSent(true);
      toast.info(`OTP sent to ${form.email}`);
    } else {
      toast.error(data.detail || "Failed to send OTP");
    }
  } catch (error) {
    console.error(error);
    toast.error("Error sending OTP");
  } finally {
    setLoading(false); // 👈 Stop loading after request completes
  }
};


  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch("http://localhost:8000/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email, otp }),
      });

      const data = await response.json();
      if (response.ok) {
        toast.success("Account created successfully!");
        setOtpSent(false);
        setForm({
          firstName: "",
          lastName: "",
          email: "",
          phone: "",
          password: "",
          confirmPassword: "",
        });
        setOtp("");
        setProfileImage(null);
        setPreview(null);
      } else {
        toast.error(data.detail || "OTP verification failed");
      }
    } catch (error) {
      console.error(error);
      toast.error("Error verifying OTP");
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

     {loading && <LoadingOverlay message="Sending OTP..." subMessage="Please wait" />}


      <div className="w-full max-w-lg bg-[#111827]/90 p-10 rounded-3xl shadow-2xl border border-gray-700">
        <h1 className="text-4xl font-bold text-center text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400">
          TechTalkAI
        </h1>
        <p className="text-center text-gray-400 mt-2 text-sm">
          Create your account and start mastering interviews
        </p>

        {!otpSent ? (
          <form
            onSubmit={handleSubmit}
            className="mt-6 space-y-4"
            encType="multipart/form-data"
          >
            {/* Profile Image Upload */}
            
            <div className="flex flex-col items-center mb-4">
              <p className="text-sm text-gray-400 mb-2">
                (Optional) Upload Profile Picture
              </p>
              <input
                type="file"
                accept="image/*"
                id="profileImageInput"
                className="hidden"
                onChange={handleImageChange}
              />

              <div
                onClick={() =>
                  document.getElementById("profileImageInput").click()
                }
                className="relative w-24 h-24 rounded-full overflow-hidden border-2 border-gray-600 cursor-pointer group"
              >
                {preview ? (
                  <img
                    src={preview}
                    alt="Profile Preview"
                    className="object-cover w-full h-full"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center w-full h-full bg-gray-800 text-gray-500 group-hover:bg-gray-700 transition">
                    <FaCamera size={28} className="opacity-60" />
                    <span className="text-xs mt-1 opacity-70">
                      Click to Upload
                    </span>
                  </div>
                )}
              </div>
              
            </div>

            {/* Input Fields */}
            <div className="flex gap-4">
              <input
                type="text"
                name="firstName"
                placeholder="First Name"
                value={form.firstName}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 focus:outline-none"
              />
              <input
                type="text"
                name="lastName"
                placeholder="Last Name"
                value={form.lastName}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 focus:outline-none"
              />
            </div>

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
              type="tel"
              name="phone"
              placeholder="Phone Number"
              value={form.phone}
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
            <input
              type="password"
              name="confirmPassword"
              placeholder="Confirm Password"
              value={form.confirmPassword}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 focus:outline-none"
            />

            <button
              type="submit"
              className="w-full py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 rounded-lg font-semibold transition shadow-md hover:shadow-xl"
            >
              Send OTP & Create Account
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="mt-6 space-y-4">
            <input
              type="text"
              name="otp"
              placeholder="Enter OTP"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              required
              className="w-full px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 focus:outline-none"
            />
            <button
              type="submit"
              className="w-full py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 rounded-lg font-semibold transition shadow-md hover:shadow-xl"
            >
              Verify OTP
            </button>
          </form>
        )}

        <div className="mt-4 text-center text-sm text-gray-400">
          Already have an account?{" "}
          <Link to="/signin" className="text-blue-400 hover:text-blue-300">
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
};

export default SignUp;
