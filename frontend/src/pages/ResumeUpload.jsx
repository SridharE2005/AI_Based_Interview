import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FaUpload, FaCheckCircle, FaArrowLeft } from "react-icons/fa";
import axios from "axios";

const ResumeUpload = () => {
  const [documentFile, setDocumentFile] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [allowNavigation, setAllowNavigation] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const handleBeforeUnload = (event) => {
      if (!allowNavigation && (documentFile || isAnalyzing || uploadSuccess)) {
        event.preventDefault();
        event.returnValue =
          "Are you sure you want to leave? Your progress will be lost.";
      }
    };

    const handleBackNavigation = (event) => {
      if (!allowNavigation) {
        event.preventDefault();
        const confirmExit = window.confirm(
          "Are you sure you want to leave this page?"
        );
        if (!confirmExit) {
          window.history.pushState(null, "", window.location.href);
        } else {
          navigate("/");
        }
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("popstate", handleBackNavigation);
    window.history.pushState(null, "", window.location.href);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("popstate", handleBackNavigation);
    };
  }, [documentFile, isAnalyzing, uploadSuccess, allowNavigation, navigate]);

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    const allowedTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];

    if (file && allowedTypes.includes(file.type)) {
      setDocumentFile(file);
      setUploadSuccess(false);
    } else {
      alert("Please upload a valid PDF or Word document (.doc or .docx)");
    }
  };

  const handleUpload = async () => {
    if (!documentFile) {
      alert("Please select a file to upload");
      return;
    }

    const user = JSON.parse(localStorage.getItem("user"));
    const token = localStorage.getItem("token");

    if (!user || !user.id || !token) {
      alert("User not found or token missing. Please log in again.");
      return;
    }

    setIsAnalyzing(true);
    const formData = new FormData();
    formData.append("file", documentFile);

    try {
      const response = await axios.post(
        "http://localhost:8000/upload",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      console.log("Analysis Result:", response.data.analysis);
      setUploadSuccess(true);

      // ✅ Mark resume upload as completed
      localStorage.setItem("completedResume", "true");
    } catch (error) {
      console.error("Error analyzing document:", error);
      alert("Failed to analyze the document");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleProceed = () => {
    if (!documentFile) {
      alert("No file uploaded!");
      return;
    }

    setAllowNavigation(true);
    const baseName = documentFile.name.replace(/\.(pdf|docx?|DOCX?|PDF)$/, "");
    navigate("/chatbot", { state: { resumeFile: baseName } });
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#0B0F1A] text-white px-6 relative">
      {/* Back Button */}
      <button
        onClick={() => navigate("/options")}
        className="absolute top-6 left-6 flex items-center text-gray-300 hover:text-white transition"
      >
        <FaArrowLeft className="mr-2 text-lg" />
        <span className="text-sm font-medium">Back to Options</span>
      </button>

      {/* Resume Upload Container */}
      <div className="bg-gray-800 p-12 rounded-2xl shadow-2xl w-full max-w-5xl text-center min-h-[75vh] flex flex-col justify-center">
        <h1 className="text-4xl font-bold mb-6">
          Upload Your Resume for Analysis
        </h1>
        <p className="text-gray-400 mb-8 text-lg">
          Supported formats: <span className="font-semibold">PDF</span>,{" "}
          <span className="font-semibold">Word (.doc/.docx)</span>
        </p>

        {/* Upload Drop Area */}
        <label
          className={`w-full h-56 flex flex-col items-center justify-center border-2 border-dashed rounded-xl cursor-pointer transition ${
            isAnalyzing || uploadSuccess
              ? "opacity-60 cursor-not-allowed border-gray-600"
              : "hover:border-blue-500"
          }`}
        >
          {uploadSuccess ? (
            <div className="flex flex-col items-center">
              <FaCheckCircle className="text-green-400 text-6xl mb-3 animate-bounce" />
              <p className="text-xl font-semibold">Analysis Complete!</p>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <FaUpload className="text-blue-400 text-6xl mb-3" />
              <p className="text-base text-gray-300 text-center">
                {isAnalyzing
                  ? "Analyzing... Please wait"
                  : documentFile
                  ? documentFile.name
                  : "Click to upload resume"}
              </p>
            </div>
          )}
          <input
            type="file"
            accept=".pdf,.doc,.docx"
            className="hidden"
            onChange={handleFileChange}
            disabled={isAnalyzing || uploadSuccess}
          />
        </label>

        {/* Upload Button */}
        <button
          className={`mt-10 w-full py-4 rounded-lg font-semibold transition text-xl ${
            uploadSuccess
              ? "bg-green-600 hover:bg-green-700"
              : isAnalyzing
              ? "bg-gray-600 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700"
          }`}
          onClick={uploadSuccess ? handleProceed : handleUpload}
          disabled={isAnalyzing}
        >
          {uploadSuccess
            ? "Proceed to Interview"
            : isAnalyzing
            ? "Analyzing..."
            : "Upload Resume"}
        </button>
      </div>
    </div>
  );
};

export default ResumeUpload;
