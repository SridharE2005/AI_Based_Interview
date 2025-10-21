import React from 'react';
import { BsCodeSlash } from 'react-icons/bs'; // Icon for Technical Interview
import { FaBrain, FaArrowLeft } from 'react-icons/fa'; // Icons
import { useNavigate } from 'react-router-dom';

const Options = () => {
  const navigate = useNavigate();

  // Function to mark Options as completed and navigate
  const handleTechnicalClick = () => {
    localStorage.setItem("completedOptions", "true"); // mark step as completed
    navigate("/resume-upload"); // go to Resume Upload page
  };

   const handleAptitudeClick = () => {
    localStorage.setItem("completedOptions", "true"); // mark step as completed
    navigate("/aptitude"); // go to Resume Upload page
  };

  return (
    <div className="bg-[#0B0F1A] min-h-screen flex flex-col items-center p-4 font-sans relative">
      
      {/* Back to Home Button */}
      <button
        onClick={() => navigate("/")}
        className="absolute top-6 left-6 flex items-center text-gray-300 hover:text-white transition"
      >
        <FaArrowLeft className="mr-2" />
        <span className="font-medium">Back to Home</span>
      </button>

      {/* Header */}
      <div className="text-center mb-12 mt-12">
        <h1 className="text-5xl font-bold text-white mb-3">
          Choose Your Practice Mode
        </h1>
        <p className="text-lg text-gray-400">
          Select the type of interview preparation you want to focus on
        </p>
      </div>

      <div className="flex flex-col md:flex-row gap-8 mb-12">
        {/* Technical Interview Card */}
        <div 
          className="bg-[#0B0F1A] p-8 rounded-xl border border-slate-700 flex flex-col items-center gap-6 w-full md:w-96 text-center cursor-pointer hover:scale-105 transition-transform"
          onClick={handleTechnicalClick}
        >
          <div className="bg-gradient-to-br from-purple-500 to-indigo-600 p-4 rounded-lg">
            <BsCodeSlash className="text-white text-4xl" />
          </div>
          <h2 className="text-2xl font-semibold text-white mt-2">
            Technical Interview
          </h2>
          <p className="text-gray-400">
            Practice coding and system design with AI-powered interviews
          </p>
          <button 
            onClick={handleTechnicalClick} 
            className="w-full bg-gradient-to-r from-purple-600 to-indigo-700 text-white font-semibold py-3 px-6 rounded-lg hover:opacity-90 transition-opacity mt-4"
          >
            Start Practice
          </button>
        </div>

        {/* Aptitude Test Card */}
        <div className="bg-[#0B0F1A] p-8 rounded-xl border border-slate-700 flex flex-col items-center gap-6 w-full md:w-96 text-center hover:scale-105 transition-transform"
         onClick={handleAptitudeClick}>
          <div className="bg-cyan-500 p-4 rounded-lg">
            <FaBrain className="text-white text-4xl" />
          </div>
          <h2 className="text-2xl font-semibold text-white mt-2">
            Aptitude Test
          </h2>
          <p className="text-gray-400">
            Sharpen your problem-solving and analytical skills
          </p>
          <button onClick={handleAptitudeClick} className="w-full bg-cyan-500 text-white font-semibold py-3 px-6 rounded-lg hover:opacity-90 transition-opacity mt-4">
            Start Practice
          </button>
        </div>
      </div>

      {/* Back to Dashboard */}
      <button
        onClick={() => navigate("/dashboard")}
        className="bg-slate-800 text-gray-300 py-2 px-6 rounded-lg border border-slate-700 hover:bg-slate-700 transition-colors"
      >
        Back to Dashboard
      </button>
    </div>
  );
};

export default Options;
