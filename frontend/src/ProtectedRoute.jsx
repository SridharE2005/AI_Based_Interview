import React from "react";
import { Navigate } from "react-router-dom";
import { decodeJwt } from "jose";

const ProtectedRoute = ({ children, requiredStep }) => {
  const token = localStorage.getItem("token");
  const user = localStorage.getItem("user");

  // If no token or user, redirect to signin
  if (!token || !user) {
    return <Navigate to="/signin" replace />;
  }

  try {
    const decoded = decodeJwt(token); // decode JWT payload
    const currentTime = Date.now() / 1000; // convert ms to seconds

    // Check token expiration
    if (!decoded.exp || decoded.exp < currentTime) {
      // Clear all session-related data
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      localStorage.removeItem("completedOptions");
      localStorage.removeItem("completedResume");
      return <Navigate to="/signin" replace />;
    }
  } catch (error) {
    console.log("JWT decode error:", error);
    // On decoding failure, clear all data
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("completedOptions");
    localStorage.removeItem("completedResume");
    return <Navigate to="/signin" replace />;
  }

  // Sequential flow enforcement
  if (requiredStep) {
    const completedOptions = localStorage.getItem("completedOptions") === "true";
    const completedResume = localStorage.getItem("completedResume") === "true";

    if (requiredStep === "resume" && !completedOptions) {
      // Cannot access resume-upload before completing options
      return <Navigate to="/options" replace />;
    }

    if (requiredStep === "chatbot" && (!completedOptions || !completedResume)) {
      // Cannot access chatbot before completing options and resume
      return <Navigate to="/resume-upload" replace />;
    }
  }

  // Token valid and sequential flow satisfied
  return children;
};

export default ProtectedRoute;
