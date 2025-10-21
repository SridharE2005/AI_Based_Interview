import React, { useState, useEffect, useRef } from "react";
import { MdFlagCircle, MdInfoOutline } from "react-icons/md";
import { FaMicrophone, FaMicrophoneSlash, FaCode, FaTimes } from "react-icons/fa";
import { IoSend } from "react-icons/io5";
import SpeechRecognition, { useSpeechRecognition } from "react-speech-recognition";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import CodeEditor from "../components/CodeEditor";
import LoadingOverlay from "../components/LoadingOverlay";

const API_BASE = "http://localhost:8000/mock-interview";

const Chatbot = () => {
  const [user, setUser] = useState({ username: "Guest" });
  const [token, setToken] = useState("");
  const [messages, setMessages] = useState([
    { text: "Hello! Type 'start' or 'yes' to begin your mock interview.", sender: "bot" }
  ]);
  const [input, setInput] = useState("");
  const [currentQuestion, setCurrentQuestion] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [interviewStarted, setInterviewStarted] = useState(false);
  const [interviewFinished, setInterviewFinished] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [showCodeEditor, setShowCodeEditor] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resultData, setResultData] = useState(null);
  const [showInfo, setShowInfo] = useState(false);

  const navigate = useNavigate();
  const chatContainerRef = useRef(null);
  const { transcript, listening, resetTranscript, browserSupportsSpeechRecognition } = useSpeechRecognition();

  useEffect(() => {
    const storedToken = localStorage.getItem("token");
    if (storedToken) setToken(storedToken);

    const storedUsername = localStorage.getItem("username");
    if (storedUsername) setUser({ username: storedUsername });
  }, []);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: "smooth"
      });
    }
  }, [messages]);

  useEffect(() => {
    if (!interviewFinished && transcript && !listening) {
      setInput(transcript);
    }
  }, [transcript, listening, interviewFinished]);

  const startInterview = async () => {
    if (!token) return setMessages(prev => [...prev, { text: "No token found. Please login first.", sender: "bot" }]);
    try {
      const res = await axios.get(`${API_BASE}/`, { headers: { Authorization: `Bearer ${token}` } });
      const { question, sessionId } = res.data;
      setSessionId(sessionId);
      setCurrentQuestion(question);
      setMessages(prev => [...prev, { text: question, sender: "bot" }]);
      setInterviewStarted(true);
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, { text: "Failed to start interview. Check token or server.", sender: "bot" }]);
    }
  };

  const sendAnswer = async answer => {
    if (!sessionId || !token || !currentQuestion) return;
    try {
      const res = await axios.post(
        `${API_BASE}/evaluate`,
        { sessionId, question: currentQuestion, answer, skip_feedback: false },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const { feedback, next_question } = res.data;
      if (feedback) setMessages(prev => [...prev, { text: feedback, sender: "bot" }]);
      if (next_question) {
        setCurrentQuestion(next_question);
        setMessages(prev => [...prev, { text: next_question, sender: "bot" }]);
      }
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, { text: "Failed to evaluate answer. Try again.", sender: "bot" }]);
    }
  };

  const finishInterview = async () => {
    if (!sessionId || !token) return;
    try {
      setLoading(true);
      const res = await axios.post(`${API_BASE}/finish`, { sessionId }, { headers: { Authorization: `Bearer ${token}` } });
      setLoading(false);
      const data = res.data;
      setResultData({
        overall_score: data.overall_score ?? "N/A",
        overall_feedback: data.overall_feedback || "No feedback available.",
        strengths: data.strengths || "Not provided",
        weaknesses: data.weaknesses || "Not provided",
        questions_attended: data.questions_attended || 0
      });
      setInterviewFinished(true);
    } catch (err) {
      console.error(err);
      setLoading(false);
      setMessages(prev => [...prev, { text: "❌ Failed to finish interview. Please try again.", sender: "bot" }]);
    }
  };

  const handleSendMessage = () => {
    const trimmedInput = input.trim();
    if (!trimmedInput) return;

    setMessages(prev => [...prev, { text: trimmedInput, sender: "user" }]);

    if (!interviewStarted) {
      if (trimmedInput.toLowerCase() === "start" || trimmedInput.toLowerCase() === "yes") startInterview();
      else setMessages(prev => [...prev, { text: "Please type 'start' or 'yes' to begin.", sender: "bot" }]);
    } else {
      sendAnswer(trimmedInput);
    }

    setInput("");
    resetTranscript();
  };

  const toggleMic = () => {
    if (!browserSupportsSpeechRecognition) return alert("Speech Recognition not supported.");
    if (listening) {
      SpeechRecognition.stopListening();
      setIsRecording(false);
    } else {
      resetTranscript();
      SpeechRecognition.startListening({ continuous: true, language: "en-US" });
      setIsRecording(true);
    }
  };

  const handleSubmitCodeFromEditor = code => {
    if (!code) return;
    setMessages(prev => [...prev, { text: code, sender: "user" }]);
    sendAnswer(code);
    setShowCodeEditor(false);
  };

  // Show final feedback card
  if (interviewFinished && resultData) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-[#0B0F1A] text-white">
        <div className="bg-gray-800 rounded-2xl p-8 max-w-2xl w-full text-center space-y-6 animate-fade-in shadow-lg">
          <h1 className="text-4xl font-bold">Interview Completed!</h1>
          <p className="text-gray-400">Well done, {user.username}! Here is your interview feedback.</p>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-purple-700/20 p-6 rounded-lg">
              <p className="text-gray-300 text-sm mb-1">Overall Score</p>
              <p className="text-4xl font-bold text-purple-400">{resultData.overall_score}</p>
            </div>
            <div className="bg-cyan-700/20 p-6 rounded-lg">
              <p className="text-gray-300 text-sm mb-1">Questions Attempted</p>
              <p className="text-4xl font-bold text-cyan-400">{resultData.questions_attended}</p>
            </div>
          </div>

          <div className="bg-gray-700/20 p-6 rounded-lg text-left space-y-4">
            <p><strong>Strengths:</strong> {resultData.strengths}</p>
            <p><strong>Weaknesses:</strong> {resultData.weaknesses}</p>
            <p><strong>Overall Feedback:</strong> {resultData.overall_feedback}</p>
          </div>

          <div className="space-y-3">
            <div
              onClick={() => {
                setInterviewFinished(false);
                setInterviewStarted(false);
                setMessages([{ text: "Hello! Type 'start' or 'yes' to begin your mock interview.", sender: "bot" }]);
                setResultData(null);
              }}
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

  // Main chat interface
  return (
    <div className="w-full h-screen bg-[#0B0F1A] flex justify-center items-center font-sans relative">
      <div className="w-full max-w-4xl h-screen flex flex-col">
        {/* Chat messages */}
        <div className="flex-1 p-6 overflow-y-auto no-scrollbar" ref={chatContainerRef}>
          <h1 className="text-3xl font-bold text-white mb-6">
            Hi, {user.username}! Let's begin the interview.
          </h1>
          <div className="flex flex-col space-y-4">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`max-w-[85%] p-4 rounded-xl text-lg break-words ${
                  msg.sender === "bot"
                    ? "bg-slate-800 text-slate-200 self-start rounded-bl-none"
                    : "bg-indigo-600 text-white self-end rounded-br-none"
                }`}
              >
                <pre className="whitespace-pre-wrap font-sans">{msg.text}</pre>
              </div>
            ))}
          </div>
        </div>

        {/* Input */}
        <div className="px-6 py-4">
          <div className="flex items-center p-2 rounded-xl bg-slate-800/80 backdrop-blur-sm ring-1 ring-slate-700 shadow-lg shadow-black/30">
            <button
              onClick={toggleMic}
              className={`p-3 rounded-full ${isRecording ? "text-indigo-400 scale-110" : "text-slate-400"} hover:bg-slate-700`}
            >
              {isRecording ? <FaMicrophoneSlash size={24} /> : <FaMicrophone size={24} />}
            </button>
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSendMessage()}
              placeholder="Type or speak your answer..."
              className="flex-1 mx-2 bg-transparent outline-none text-white text-lg placeholder-slate-500"
              disabled={interviewFinished}
            />
            <button
              onClick={handleSendMessage}
              className="p-3 rounded-full bg-indigo-600 text-white hover:bg-indigo-500"
              disabled={!input.trim() || interviewFinished}
            >
              <IoSend size={22} />
            </button>
            <button
              onClick={() => setShowCodeEditor(true)}
              className="p-3 rounded-full text-slate-400 hover:bg-slate-700 hover:text-yellow-400 mx-2"
            >
              <FaCode size={22} />
            </button>
            <button
              onClick={finishInterview}
              className="p-3 rounded-full text-slate-400 hover:bg-slate-700 hover:text-rose-500"
              disabled={interviewFinished}
            >
              <MdFlagCircle size={24} />
            </button>
          </div>
        </div>
      </div>

      {/* Floating Code Editor Modal */}
      {showCodeEditor && (
        <div className="fixed inset-0 bg-black/70 flex justify-center items-center z-50">
          <div className="bg-slate-900 w-[90%] max-w-6xl rounded-xl p-4 relative">
            <button
              onClick={() => setShowCodeEditor(false)}
              className="absolute top-3 right-3 text-red-500 hover:text-red-400"
            >
              <FaTimes size={24} />
            </button>
            <CodeEditor onSubmitCode={handleSubmitCodeFromEditor} />
          </div>
        </div>
      )}

      {/* Info Popup */}
 {showInfo && (
        <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50">
          <div className="bg-gray-800 text-white w-[90%] max-w-sm rounded-xl p-6 relative">
            <button onClick={() => setShowInfo(false)} className="absolute top-3 right-3 text-red-400 hover:text-red-300">
              <FaTimes size={24} />
            </button>
            <h2 className="text-xl font-bold mb-4">Instructions</h2>
            <ul className="list-disc list-inside space-y-2 text-gray-300">
              <li>Type <strong>"start"</strong> or <strong>"yes"</strong> to begin your interview.</li>
              <li>The <MdFlagCircle className="inline mx-1" /> button is used to finish the interview.</li>
              <li>The <FaCode className="inline mx-1" /> button opens the code editor for coding questions.</li>
              <li>The <FaMicrophone className="inline mx-1" /> button lets you speak your answer using voice.</li>
            </ul>
          </div>
        </div>
      )}

{/* Floating Info Button */}
<button
        onClick={() => setShowInfo(true)}
        className="fixed bottom-6 right-6 bg-indigo-600 hover:bg-indigo-700 text-white p-4 rounded-full shadow-lg z-40 transition-transform hover:scale-110"
        title="Instructions"
      >
        <MdInfoOutline size={28} />
      </button>


      {/* Loading overlay */}
      {loading && <LoadingOverlay text="Finishing Interview..." subtext="Please wait while we evaluate your results." />}
    </div>
  );
};

export default Chatbot;
