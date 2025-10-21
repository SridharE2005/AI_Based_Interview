import React, { useState } from "react";
import { Link } from "react-router-dom";
import { FaArrowLeft } from "react-icons/fa";
import { toast } from "react-toastify";
import LoadingOverlay from "../components/LoadingOverlay";

const CreateAptitudeTest = () => {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    questionType: "Quantitative",
    difficulty: "Medium",
    totalQuestions: 10,
    timePerQuestion: 60, // in seconds
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch("http://localhost:8000/aptitude/create-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("Aptitude Test Settings Saved Successfully!");
        setForm({
          questionType: "Quantitative",
          difficulty: "Medium",
          totalQuestions: 10,
          timePerQuestion: 60,
        });
      } else {
        toast.error(data.detail || "Failed to save test settings");
      }
    } catch (error) {
      console.error(error);
      toast.error("Error saving test settings");
    } finally {
      setLoading(false);
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

      {loading && <LoadingOverlay message="Saving Test..." subMessage="Please wait" />}

      <div className="w-full max-w-lg bg-[#111827]/90 p-10 rounded-3xl shadow-2xl border border-gray-700">
        <h1 className="text-4xl font-bold text-center text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400">
          Create Aptitude Test
        </h1>
        <p className="text-center text-gray-400 mt-2 text-sm">
          Configure your test settings
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-6">
          {/* Question Type */}
          <div className="flex flex-col">
            <label className="text-gray-400 mb-2">Question Type</label>
            <select
              name="questionType"
              value={form.questionType}
              onChange={handleChange}
              className="w-full px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 focus:outline-none"
            >
              <option>Quantitative</option>
              <option>Verbal</option>
              <option>Reasoning</option>
              <option>Other</option>
            </select>
          </div>

          {/* Difficulty Level */}
          <div className="flex flex-col">
            <label className="text-gray-400 mb-2">Difficulty Level</label>
            <select
              name="difficulty"
              value={form.difficulty}
              onChange={handleChange}
              className="w-full px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 focus:outline-none"
            >
              <option>Easy</option>
              <option>Medium</option>
              <option>Hard</option>
            </select>
          </div>

          {/* Total Questions */}
          <div className="flex flex-col">
            <label className="text-gray-400 mb-2">Total Questions</label>
            <input
              type="number"
              name="totalQuestions"
              value={form.totalQuestions}
              min={1}
              max={100}
              onChange={handleChange}
              className="w-full px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 focus:outline-none"
            />
          </div>

          {/* Time per Question */}
          <div className="flex flex-col">
            <label className="text-gray-400 mb-2">Time per Question (seconds)</label>
            <input
              type="number"
              name="timePerQuestion"
              value={form.timePerQuestion}
              min={30}
              max={600} // 10 minutes
              step={10}
              onChange={handleChange}
              className="w-full px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 focus:outline-none"
            />
            <p className="text-gray-500 text-xs mt-1">
              Minimum 30 sec, Maximum 10 min
            </p>
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 rounded-lg font-semibold transition shadow-md hover:shadow-xl"
          >
            Save Test Settings
          </button>
        </form>
      </div>
    </div>
  );
};

export default CreateAptitudeTest;
