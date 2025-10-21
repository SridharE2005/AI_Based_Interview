import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FiClock, FiCheckCircle, FiPlus } from "react-icons/fi";
import { toast } from "react-toastify";
import LoadingOverlay from "../components/LoadingOverlay";
import {  FiArrowLeft } from "react-icons/fi";

const Aptitude = () => {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [testStarted, setTestStarted] = useState(false);
  const [form, setForm] = useState({
    questionType: "Quantitative",
    difficulty: "Medium",
    totalQuestions: 5,
    timePerQuestion: 60,
    topics: [],
  });

  const [questions, setQuestions] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedback, setFeedback] = useState({ correct: false, explanation: "" });
  const [testId, setTestId] = useState(null);
  const [totalScorePercentage, setTotalScorePercentage] = useState(0);
  const [newTopic, setNewTopic] = useState("");

  // ✅ Predefined topics for each category
  const topicOptions = {
    Quantitative: [
      "Percentages",
      "Averages",
      "Simple Interest",
      "Compound Interest",
      "Profit and Loss",
      "Time and Work",
      "Speed, Time and Distance",
      "Ratio and Proportion",
      "Boats and Streams",
      "Pipes and Cisterns",
    ],
    Verbal: [
      "Synonyms & Antonyms",
      "Reading Comprehension",
      "Sentence Correction",
      "Para Jumbles",
      "Fill in the Blanks",
    ],
    Reasoning: [
      "Blood Relations",
      "Number Series",
      "Coding-Decoding",
      "Seating Arrangement",
      "Syllogism",
      "Direction Sense",
    ],
    Other: ["General Knowledge", "Current Affairs", "Logic Puzzles"],
  };

  // ✅ Combine all topics when "All Topics" selected
  const allTopics = Object.values(topicOptions).flat();

  // ✅ Handle form input
 // ✅ Fixed: Only reset topics when questionType changes
const handleFormChange = (e) => {
  const { name, value } = e.target;

  setForm((prev) => ({
    ...prev,
    [name]: value,
    // Only clear topics when changing question type
    topics: name === "questionType" ? [] : prev.topics,
  }));
};


  // ✅ Handle topic selection (multi-select)
  const handleTopicSelect = (topic) => {
    setForm((prev) => {
      const alreadySelected = prev.topics.includes(topic);
      return {
        ...prev,
        topics: alreadySelected
          ? prev.topics.filter((t) => t !== topic)
          : [...prev.topics, topic],
      };
    });
  };

  // ✅ Add custom topic
  const handleAddTopic = () => {
    const trimmed = newTopic.trim();
    if (trimmed === "") {
      toast.error("Please enter a topic name");
      return;
    }
    if (form.topics.includes(trimmed)) {
      toast.info("Topic already added");
      return;
    }
    setForm((prev) => ({ ...prev, topics: [...prev.topics, trimmed] }));
    setNewTopic("");
    toast.success(`Topic "${trimmed}" added`);
  };

  // ✅ Start Test
  const handleStartTest = async (e) => {
    e.preventDefault();
    if (form.topics.length === 0) {
      toast.error("Please select at least one topic");
      return;
    }
    setLoading(true);

    try {
      const token = localStorage.getItem("token");
      const response = await fetch("http://localhost:8000/aptitude/create-test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("Test created! Starting now...");

        const parsedQuestions = data.questions.map((q) => ({
          questionText: q.questionText,
          options: [q.optionA, q.optionB, q.optionC, q.optionD],
          correctAnswer: q.correctAnswer,
          explanation: q.explanation,
          optionA: q.optionA,
          optionB: q.optionB,
          optionC: q.optionC,
          optionD: q.optionD,
        }));

        setQuestions(parsedQuestions);
        setTimeLeft(form.timePerQuestion);
        setTestStarted(true);
        setTestId(data.testId);
      } else {
        toast.error(data.detail || "Failed to create test");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error creating test");
    } finally {
      setLoading(false);
    }
  };

  // ✅ Timer logic
useEffect(() => {
  if (testStarted && !isFinished && !showFeedback) {
    if (timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      // Time's up — auto-submit current question (without going to next)
      handleSubmitAnswer(true); // true = auto submit
    }
  }
}, [timeLeft, testStarted, isFinished, showFeedback]);


  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // ✅ Answer handling
  const handleAnswer = (index) => {
    if (!showFeedback) setSelectedAnswer(index);
  };

 const handleSubmitAnswer = async (autoSubmit = false) => {
  const currentQuestionObj = questions[currentQuestion];
  const timeTakenSec = form.timePerQuestion - timeLeft;

  // Prevent submission if nothing selected (for manual only)
  if (selectedAnswer === null && !autoSubmit) {
    toast.warn("Please select an answer before submitting!");
    return;
  }

  const selectedOption = selectedAnswer !== null
    ? String.fromCharCode(65 + selectedAnswer)
    : "";

  try {
    const token = localStorage.getItem("token");
    const response = await fetch("http://localhost:8000/aptitude/submit-answer", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        testId,
        questionText: currentQuestionObj.questionText,
        optionA: currentQuestionObj.optionA,
        optionB: currentQuestionObj.optionB,
        optionC: currentQuestionObj.optionC,
        optionD: currentQuestionObj.optionD,
        correctAnswer: currentQuestionObj.correctAnswer,
        explanation: currentQuestionObj.explanation,
        selectedOption,
        timeTaken: timeTakenSec,
      }),
    });

    const data = await response.json();
    setFeedback({
      correct: data.isCorrect,
      explanation: currentQuestionObj.explanation,
    });

    if (data.isCorrect) setScore((prev) => prev + 1);
    setTotalScorePercentage(data.totalScore);
    setShowFeedback(true);

    // ✅ Do NOT move to next question automatically — user clicks Next manually

  } catch (err) {
    console.error("Error submitting answer:", err);
    toast.error("Failed to submit answer");
  }
};
  // ✅ Next Question
  const handleNextQuestion = () => {
    setShowFeedback(false);
    setSelectedAnswer(null);
    setTimeLeft(form.timePerQuestion);
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      handleFinishTest();
    }
  };

  // ✅ Finish Test
  const handleFinishTest = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`http://localhost:8000/aptitude/complete-test/${testId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (response.ok) {
        setIsFinished(true);
        setTotalScorePercentage(data.aptitudeScore);
        toast.success("Test completed!");
      } else {
        toast.error(data.detail || "Failed to complete test");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error completing test");
    }
  };

  // ✅ Loading Overlay
 

  // ✅ Test Finished
  if (isFinished) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-gray-900 text-white">
        <div className="bg-gray-800 rounded-2xl p-8 max-w-2xl w-full text-center space-y-6 animate-fade-in shadow-lg">
          <FiCheckCircle className="w-20 h-20 text-green-400 mx-auto" />
          <h1 className="text-4xl font-bold">Test Completed!</h1>
          <p className="text-gray-400">You have finished the aptitude test.</p>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-purple-700/20 p-6 rounded-lg">
              <p className="text-gray-300 text-sm mb-1">Your Score</p>
              <p className="text-4xl font-bold text-purple-400">{totalScorePercentage}/100</p>
            </div>
            <div className="bg-cyan-700/20 p-6 rounded-lg">
              <p className="text-gray-300 text-sm mb-1">Percentage</p>
              <p className="text-4xl font-bold text-cyan-400">{totalScorePercentage}%</p>
            </div>
          </div>
          <div className="space-y-3">
            <div
              onClick={() => window.location.reload()}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-500 text-white py-3 rounded-lg font-semibold cursor-pointer hover:opacity-90 transition"
            >
              Try Again
            </div>
            <div
              onClick={() => navigate("/dashboard")}
              className="w-full border border-gray-400 text-gray-200 py-3 rounded-lg font-semibold cursor-pointer hover:bg-gray-700 transition"
            >
              Back to Dashboard
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ✅ Test Setup Form
  if (!testStarted) {
    const displayedTopics =
      form.questionType === "All Topics" ? allTopics : topicOptions[form.questionType] || [];

    return (
      
    <div className="min-h-screen flex items-center justify-center bg-[#0B0F1A] text-white p-6 relative">
      {/* Back Button */}
       <button
        onClick={() => navigate("/options")}
        className="absolute top-6 left-6 flex items-center text-gray-300 hover:text-white transition"
      >
        <FiArrowLeft className="mr-2" />
        <span className="font-medium">Back to Options</span>
      </button>

      <div className="w-full max-w-lg bg-[#111827]/90 p-10 rounded-3xl shadow-2xl border border-gray-700">
        <h1 className="text-4xl font-bold text-center text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400">
          Create Aptitude Test
        </h1>
        <p className="text-center text-gray-400 mt-2 text-sm">
          Configure your test settings before starting
        </p>

        <form onSubmit={handleStartTest} className="mt-6 space-y-6">
          {/* Question Type */}
          <div className="flex flex-col">
            <label className="text-gray-400 mb-2">Question Type</label>
            <select
              name="questionType"
              value={form.questionType}
              onChange={handleFormChange}
              className="w-full px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 focus:outline-none"
            >
              <option>Quantitative</option>
              <option>Verbal</option>
              <option>Reasoning</option>
              <option>Other</option>
              <option>All Topics</option>
            </select>
          </div>

          {/* Dynamic Topics */}
          {displayedTopics.length > 0 && (
            <div className="flex flex-col">
              <label className="text-gray-400 mb-2">Select Topics</label>
              <div className="flex flex-wrap gap-2">
                {displayedTopics.map((topic, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => handleTopicSelect(topic)}
                    className={`px-3 py-2 rounded-lg border ${
                      form.topics.includes(topic)
                        ? "bg-gradient-to-r from-purple-600 to-blue-600 text-white border-transparent"
                        : "bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700"
                    } transition`}
                  >
                    {topic}
                  </button>
                ))}
              </div>

              {/* Add Custom Topic */}
              
            </div>
          )}

          {/* Difficulty */}
          <div className="flex flex-col">
            <label className="text-gray-400 mb-2">Difficulty</label>
            <select
              name="difficulty"
              value={form.difficulty}
              onChange={handleFormChange}
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
              onChange={handleFormChange}
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
              max={600}
              step={10}
              onChange={handleFormChange}
              className="w-full px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 focus:outline-none"
            />
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 rounded-lg font-semibold transition shadow-md hover:shadow-xl"
          >
            Start Test
          </button>
        </form>
      </div>
       {loading && <LoadingOverlay message="Generating Test..." subMessage="Please wait" />}
    </div>
    );
  }

  // ✅ Test Question UI
  const currentQuestionObj = questions[currentQuestion];
  return (
    <div className="min-h-screen p-6 bg-[#0B0F1A] text-white">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Aptitude Test</h1>
          <div className="bg-gray-800 p-4 rounded-xl flex items-center gap-2">
            <FiClock className="w-5 h-5 text-cyan-400" />
            <span className="text-xl font-bold">{formatTime(timeLeft)}</span>
          </div>
        </div>

        <div className="w-full bg-gray-700 h-2 rounded-full">
          <div
            className="h-2 bg-gradient-to-r from-purple-600 to-pink-500 rounded-full"
            style={{ width: `${((currentQuestion + 1) / questions.length) * 100}%` }}
          ></div>
        </div>
        <p className="text-sm text-gray-400 text-right">
          {Math.round(((currentQuestion + 1) / questions.length) * 100)}% Complete
        </p>

        <div className="bg-[#0B0F1A] p-8 rounded-2xl border-2 space-y-6">
          <h2 className="text-2xl font-semibold">{currentQuestionObj.questionText}</h2>
          <div className="space-y-3">
            {["optionA", "optionB", "optionC", "optionD"].map((key, index) => (
              <div
                key={index}
                onClick={() => handleAnswer(index)}
                className={`w-full p-4 rounded-lg text-left cursor-pointer transition-all ${
                  selectedAnswer === index
                    ? "bg-gradient-to-r from-purple-600 to-pink-500 text-white"
                    : "bg-gray-700/50 hover:bg-gray-600"
                }`}
              >
                <span className="font-semibold mr-3">{String.fromCharCode(65 + index)}.</span>
                {currentQuestionObj[key]}
              </div>
            ))}
          </div>

          {showFeedback && (
            <div
              className={`mt-4 p-4 rounded-lg ${
                feedback.correct ? "bg-green-700/50" : "bg-red-700/50"
              }`}
            >
              <p className="font-semibold text-lg">
                {feedback.correct
                  ? "Correct!"
                  : `Wrong! Correct Answer: ${currentQuestionObj.correctAnswer}`}
              </p>
              {feedback.explanation && (
                <p className="mt-2 text-gray-200">{feedback.explanation}</p>
              )}
              <div
                onClick={handleNextQuestion}
                className="mt-3 w-full bg-blue-600 text-white py-2 rounded-lg cursor-pointer text-center font-semibold hover:opacity-90 transition"
              >
                Next Question
              </div>
            </div>
          )}

          {!showFeedback && (
            <div
              onClick={handleSubmitAnswer}
              className={`mt-6 py-3 px-6 rounded-lg font-semibold cursor-pointer ${
                selectedAnswer === null
                  ? "opacity-50 cursor-not-allowed bg-gray-600"
                  : "bg-gradient-to-r from-cyan-400 to-blue-500 text-white hover:opacity-90"
              }`}
            >
              {currentQuestion === questions.length - 1 ? "Finish" : "Submit Answer"}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Aptitude;
