import React, { useState } from "react";

const RecentInterviews = ({ interviews }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5; // Number of interviews per page

  // Sort interviews by date descending (most recent first)
  const sortedInterviews = [...interviews].sort(
    (a, b) => new Date(b.date) - new Date(a.date)
  );

  const totalPages = Math.ceil(sortedInterviews.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentInterviews = sortedInterviews.slice(
    startIndex,
    startIndex + itemsPerPage
  );

  const handlePrev = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  const handleNext = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };

  return (
    <div className="bg-gray-800 rounded-2xl p-4 shadow-lg">
      <h2 className="text-lg font-semibold mb-4">Recent Interviews</h2>
      <div className="space-y-4">
        {currentInterviews.length === 0 && (
          <p className="text-gray-400">No interviews yet.</p>
        )}
        {currentInterviews.map((interview, index) => (
          <div
            key={index}
            className="flex justify-between items-center bg-gray-700 p-4 rounded-xl"
          >
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

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center mt-4 space-x-4">
          <button
            onClick={handlePrev}
            disabled={currentPage === 1}
            className="px-3 py-1 rounded-lg bg-gray-700 hover:bg-gray-600 disabled:opacity-50"
          >
            Prev
          </button>
          <span className="text-gray-400">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={handleNext}
            disabled={currentPage === totalPages}
            className="px-3 py-1 rounded-lg bg-gray-700 hover:bg-gray-600 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default RecentInterviews;
