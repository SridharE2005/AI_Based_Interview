import React from "react";
import loadingImage from "../assets/loadingImage.png"; 

const LoadingOverlay = ({ message = "Loading...", subMessage = "Please wait" }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-4 p-8 bg-white/90 rounded-xl shadow-xl">
        {/* Rotating image */}
        <img
          src={loadingImage}
          alt="Loading..."
          className="h-12 w-12 animate-spin"
        />
        <p className="text-gray-700 font-semibold">{message}</p>
        <p className="text-xs text-gray-500">{subMessage}</p>
      </div>
    </div>
  );
};

export default LoadingOverlay;
