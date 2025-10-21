import React, { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import { FaArrowLeft } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import RecentInterviews from "../components/RecentInterviews";

function Dashboard() {
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await axios.get("http://localhost:8000/user/dashboard", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setDashboardData(response.data);
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, []);

  if (loading) return <div className="text-white p-6">Loading...</div>;

  const {
    total_interviews = 0,
    technical_interview = 0,
    aptitude_interview = 0,
    technical_scores = [],
    aptitude_scores = [],
    overall_score = 0,
    recent_history = [],
  } = dashboardData || {};

  const averageTechnicalScore = technical_scores.length
    ? (technical_scores.reduce((a, b) => a + b, 0) / technical_scores.length).toFixed(2)
    : 0;

  const averageAptitudeScore = aptitude_scores.length
    ? (aptitude_scores.reduce((a, b) => a + b, 0) / aptitude_scores.length).toFixed(2)
    : 0;

  const performanceTechnicalData = technical_scores.map((score, index) => ({
    week: `T-${index + 1}`,
    score,
  }));

  const performanceAptitudeData = aptitude_scores.map((score, index) => ({
    week: `A-${index + 1}`,
    score,
  }));

  const categoryData = [
    { name: "Technical", score: averageTechnicalScore },
    { name: "Aptitude", score: averageAptitudeScore },
    { name: "Overall", score: overall_score },
  ];

  return (
    <div className="p-6 bg-gray-900 min-h-screen text-white">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center space-x-3">
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
        {/* Start Practice Button */}
        <button
          onClick={() => navigate("/options")}
          className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg font-semibold shadow-lg transition"
        >
          Start Practice
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-6 mb-6">
        <div className="bg-gray-800 rounded-2xl p-4 shadow-lg">
          <p className="text-purple-400 font-semibold">Total Interviews</p>
          <h2 className="text-2xl font-bold">{total_interviews}</h2>
        </div>
        <div className="bg-gray-800 rounded-2xl p-4 shadow-lg">
          <p className="text-cyan-400 font-semibold">Technical Interviews</p>
          <h2 className="text-2xl font-bold">{technical_interview}</h2>
        </div>
        <div className="bg-gray-800 rounded-2xl p-4 shadow-lg">
          <p className="text-purple-400 font-semibold">Aptitude Interviews</p>
          <h2 className="text-2xl font-bold">{aptitude_interview}</h2>
        </div>
        <div className="bg-gray-800 rounded-2xl p-4 shadow-lg">
          <p className="text-cyan-400 font-semibold">Avg Technical Score</p>
          <h2 className="text-2xl font-bold">{averageTechnicalScore}%</h2>
        </div>
        <div className="bg-gray-800 rounded-2xl p-4 shadow-lg">
          <p className="text-purple-400 font-semibold">Avg Aptitude Score</p>
          <h2 className="text-2xl font-bold">{averageAptitudeScore}%</h2>
        </div>
        <div className="bg-gray-800 rounded-2xl p-4 shadow-lg">
          <p className="text-yellow-400 font-semibold">Overall Score</p>
          <h2 className="text-2xl font-bold">{overall_score}%</h2>
        </div>
      </div>

      {/* Charts */}
     {/* Charts */}
<div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
  {/* Technical Performance */}
  <div className="bg-gray-800 rounded-2xl p-4 shadow-lg">
    <h2 className="text-lg font-semibold mb-4">Technical Performance Trend</h2>
    <ResponsiveContainer width="100%" height={250}>
      <LineChart data={performanceTechnicalData}>
        <CartesianGrid strokeDasharray="3 3" stroke="#444" />
        <XAxis dataKey="week" stroke="#aaa" />
        <YAxis stroke="#aaa" />
        <Tooltip />
        <Line type="monotone" dataKey="score" stroke="#a855f7" strokeWidth={3} />
      </LineChart>
    </ResponsiveContainer>
  </div>

  {/* Aptitude Performance */}
  <div className="bg-gray-800 rounded-2xl p-4 shadow-lg">
    <h2 className="text-lg font-semibold mb-4">Aptitude Performance Trend</h2>
    <ResponsiveContainer width="100%" height={250}>
      <LineChart data={performanceAptitudeData}>
        <CartesianGrid strokeDasharray="3 3" stroke="#444" />
        <XAxis dataKey="week" stroke="#aaa" />
        <YAxis stroke="#aaa" />
        <Tooltip />
        <Line type="monotone" dataKey="score" stroke="#facc15" strokeWidth={3} />
      </LineChart>
    </ResponsiveContainer>
  </div>
</div>

{/* Full-width Category Performance */}
<div className="bg-gray-800 rounded-2xl p-4 shadow-lg mb-6">
  <h2 className="text-lg font-semibold mb-4">Category Performance</h2>
  <ResponsiveContainer width="100%" height={300}>
    <BarChart data={categoryData}>
      <CartesianGrid strokeDasharray="3 3" stroke="#444" />
      <XAxis dataKey="name" stroke="#aaa" />
      <YAxis stroke="#aaa" />
      <Tooltip />
      <Bar dataKey="score" fill="#06b6d4" radius={[6, 6, 0, 0]} />
    </BarChart>
  </ResponsiveContainer>
</div>


      {/* Recent Interviews */}
      
        <RecentInterviews interviews={recent_history} />
      
    </div>
  );
}

export default Dashboard;
