import React from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
import { FaArrowLeft } from "react-icons/fa";
import { useNavigate } from "react-router-dom";

function Dashboard() {
  const navigate = useNavigate();

  const performanceData = [
    { week: "Week 1", score: 65 },
    { week: "Week 2", score: 72 },
    { week: "Week 3", score: 77 },
    { week: "Week 4", score: 83 },
  ];

  const categoryData = [
    { name: "Technical", score: 90 },
    { name: "Aptitude", score: 80 },
    { name: "Problem Solving", score: 85 },
    { name: "Communication", score: 92 },
  ];

  const recentInterviews = [
    { type: "Technical Interview", date: "2025-09-28", score: 92, duration: "45 min" },
    { type: "Aptitude Interview", date: "2025-09-25", score: 88, duration: "30 min" },
    { type: "Technical Interview", date: "2025-09-22", score: 85, duration: "50 min" },
  ];

  return (
    <div className="p-6 bg-gray-900 min-h-screen text-white">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center space-x-3">
          {/* Back Arrow Button */}
          <button
            onClick={() => navigate(-1)}
            className="text-white bg-gray-700 hover:bg-gray-600 p-2 rounded-full shadow-md transition"
          >
            <FaArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-3xl font-bold mb-1">Dashboard</h1>
            <p className="text-gray-400">Track your interview preparation progress</p>
          </div>
        </div>
        <button className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg font-semibold shadow-lg transition">
          Start Practice
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="bg-gray-800 rounded-2xl p-4 shadow-lg">
          <p className="text-purple-400 font-semibold">Total Interviews</p>
          <h2 className="text-2xl font-bold">12</h2>
        </div>
        <div className="bg-gray-800 rounded-2xl p-4 shadow-lg">
          <p className="text-cyan-400 font-semibold">Average Score</p>
          <h2 className="text-2xl font-bold">85%</h2>
        </div>
        <div className="bg-gray-800 rounded-2xl p-4 shadow-lg">
          <p className="text-purple-400 font-semibold">Improvement</p>
          <h2 className="text-2xl font-bold">+23%</h2>
        </div>
        <div className="bg-gray-800 rounded-2xl p-4 shadow-lg">
          <p className="text-cyan-400 font-semibold">Hours Spent</p>
          <h2 className="text-2xl font-bold">8.5h</h2>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-gray-800 rounded-2xl p-4 shadow-lg">
          <h2 className="text-lg font-semibold mb-4">Performance Trend</h2>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={performanceData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#444" />
              <XAxis dataKey="week" stroke="#aaa" />
              <YAxis stroke="#aaa" />
              <Tooltip />
              <Line type="monotone" dataKey="score" stroke="#a855f7" strokeWidth={3} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-gray-800 rounded-2xl p-4 shadow-lg">
          <h2 className="text-lg font-semibold mb-4">Category Performance</h2>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={categoryData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#444" />
              <XAxis dataKey="name" stroke="#aaa" />
              <YAxis stroke="#aaa" />
              <Tooltip />
              <Bar dataKey="score" fill="#06b6d4" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Interviews */}
      <div className="bg-gray-800 rounded-2xl p-4 shadow-lg">
        <h2 className="text-lg font-semibold mb-4">Recent Interviews</h2>
        <div className="space-y-4">
          {recentInterviews.map((interview, index) => (
            <div key={index} className="flex justify-between items-center bg-gray-700 p-4 rounded-xl">
              <div>
                <p className="font-semibold text-white">{interview.type}</p>
                <p className="text-gray-400 text-sm">{interview.date}</p>
              </div>
              <div className="text-right">
                <p className="text-cyan-400 font-bold">Score {interview.score}%</p>
                <p className="text-gray-400 text-sm">Duration {interview.duration}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
