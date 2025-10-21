import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FaArrowLeft, FaCamera, FaKey } from "react-icons/fa";
import { toast } from "react-toastify";
import axios from "axios";

const Setting = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone_number: "",
    profile_picture: "",
  });

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ currentPassword: "", newPassword: "" });

  const userId = JSON.parse(localStorage.getItem("user"))?.id;

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("user"));
    if (!storedUser) return;

    setForm({
      first_name: storedUser.first_name || "",
      last_name: storedUser.last_name || "",
      email: storedUser.email || "",
      phone_number: storedUser.phone_number || "",
      profile_picture: storedUser.profile_image || "",
    });
  }, []);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const handlePasswordChange = (e) => setPasswordForm({ ...passwordForm, [e.target.name]: e.target.value });

  // ---------------- PROFILE PICTURE ----------------
  const handleProfilePicture = async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const formData = new FormData();
  formData.append("file", file); // Backend expects `file` field

  try {
    const res = await axios.post(`http://localhost:8000/settings/${userId}`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });

    if (res.data.success) {
      const newImage = res.data.profile_image;
      setForm(prev => ({ ...prev, profile_picture: newImage }));

      const storedUser = JSON.parse(localStorage.getItem("user")) || {};
      localStorage.setItem("user", JSON.stringify({ ...storedUser, profile_image: newImage }));

      toast.success("Profile picture updated!");
    }
  } catch (err) {
    console.error(err);
    toast.error("Error uploading profile picture");
  }
};

  // ---------------- UPDATE PROFILE ----------------
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        first_name: form.first_name,
        last_name: form.last_name,
        email: form.email,
        phone_number: form.phone_number,
      };

      const res = await axios.put(`http://localhost:8000/settings/${userId}`, payload);

      if (res.data.success) {
        toast.success("Profile updated successfully!");

        // Keep profile_image intact and update localStorage
        const updatedUser = { ...res.data.user, profile_image: form.profile_picture };
        localStorage.setItem("user", JSON.stringify(updatedUser));

        // Update form with latest values
        setForm(prev => ({ ...prev, ...updatedUser }));
      } else {
        toast.error(res.data.message || "Error updating profile");
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Error updating profile");
    }
  };

  // ---------------- CHANGE PASSWORD ----------------
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(
        `http://localhost:8000/settings/change-password/${userId}`,
        passwordForm
      );

      if (res.data.success) {
        toast.success("Password changed successfully!");
        setPasswordForm({ currentPassword: "", newPassword: "" });
        setShowPasswordModal(false);
      } else {
        toast.error(res.data.message || "Error changing password");
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Error changing password");
    }
  };

  // ---------------- GET INITIALS ----------------
  const getInitials = () => {
    const first = form.first_name?.charAt(0).toUpperCase() || "";
    const last = form.last_name?.charAt(0).toUpperCase() || "";
    return first + last;
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-[#0B0F1A] via-[#111827] to-[#1c0f3f] text-white relative p-4">
      {/* Back Button */}
      <button
        onClick={() => navigate("/")}
        className="absolute top-6 left-6 flex items-center text-gray-400 hover:text-white transition"
      >
        <FaArrowLeft className="mr-2" />
        <span className="font-medium opacity-80">Back to Home</span>
      </button>

      {/* Profile Card */}
      <div className="w-full max-w-lg bg-[#111827]/80 p-8 rounded-2xl shadow-2xl border border-gray-700">
        <h1 className="text-3xl font-bold text-center text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400 mb-2">
          Account Settings
        </h1>
        <p className="text-center text-gray-400 mb-6 opacity-80">
          Update your profile details to enhance your InterviewAI experience 🚀
        </p>

        {/* Profile Picture */}
        <div className="flex flex-col items-center mb-6">
          {form.profile_picture ? (
            <img
              src={form.profile_picture}
              alt="Profile"
              className="w-24 h-24 rounded-full border object-cover mb-3"
            />
          ) : (
            <div className="w-24 h-24 rounded-full bg-sky-500 text-white flex items-center justify-center text-3xl font-bold mb-3">
              {getInitials()}
            </div>
          )}
          <label className="flex items-center justify-center gap-2 px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-lg cursor-pointer transition-opacity duration-200">
            <FaCamera size={18} /> Change Photo
            <input type="file" accept="image/*" onChange={handleProfilePicture} className="hidden" />
          </label>
          <button
            type="button"
            onClick={() => setShowPasswordModal(true)}
            className="mt-2 flex items-center justify-center gap-2 px-4 py-2 border border-gray-500 rounded-lg bg-white/10 text-white/70 hover:bg-white/20 hover:text-white transition-all duration-200 shadow-sm"
          >
            <FaKey size={18} /> Change Password
          </button>
        </div>

        {/* Form Fields */}
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4">
          {["first_name", "last_name", "email", "phone_number"].map((field) => (
            <div key={field}>
              <label className="block font-semibold mb-1 text-gray-300 opacity-80">
                {field.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase())}
              </label>
              <input
                type={field === "email" ? "email" : "text"}
                name={field}
                value={form[field]}
                onChange={handleChange}
                className="w-full px-4 py-2 rounded-lg bg-gray-800/70 border border-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                placeholder={`Enter your ${field.replace("_", " ")}`}
              />
            </div>
          ))}

          <button
            type="submit"
            className="w-full py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 rounded-lg font-semibold transition shadow-md hover:shadow-xl mt-4"
          >
            Save Changes
          </button>
        </form>

        {/* Password Modal */}
        {showPasswordModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4">
            <div className="bg-[#111827] p-6 rounded-lg w-full max-w-md text-white border border-gray-700 shadow-lg">
              <h2 className="text-xl font-bold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400">
                Change Password
              </h2>
              <form onSubmit={handlePasswordSubmit} className="flex flex-col gap-4">
                <input
                  type="password"
                  placeholder="Current Password"
                  name="currentPassword"
                  value={passwordForm.currentPassword}
                  onChange={handlePasswordChange}
                  className="w-full px-3 py-2 rounded-lg bg-gray-800/70 border border-gray-700 focus:outline-none placeholder-gray-400 text-white"
                  required
                />
                <input
                  type="password"
                  placeholder="New Password"
                  name="newPassword"
                  value={passwordForm.newPassword}
                  onChange={handlePasswordChange}
                  className="w-full px-3 py-2 rounded-lg bg-gray-800/70 border border-gray-700 focus:outline-none placeholder-gray-400 text-white"
                  required
                />
                <div className="flex flex-col sm:flex-row justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowPasswordModal(false)}
                    className="px-4 py-2 border border-gray-500 rounded-lg hover:bg-gray-700 transition text-gray-300/80"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-sky-500 hover:bg-sky-600 rounded-lg font-semibold transition text-white"
                  >
                    Submit
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Setting;
