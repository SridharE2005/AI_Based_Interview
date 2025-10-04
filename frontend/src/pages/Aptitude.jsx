import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FiClock, FiArrowLeft, FiCheckCircle } from "react-icons/fi";


const Aptitude = () => {
  const navigate = useNavigate();
  
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(600);
  const [isFinished, setIsFinished] = useState(false);
  const [answers, setAnswers] = useState([]);

  const questions = [
    { id: 1, question: "If a train travels 120 km in 2 hours, what is its average speed?", options: ["50 km/h", "60 km/h", "70 km/h", "80 km/h"], correctAnswer: 1 },
    { id: 2, question: "What is 15% of 200?", options: ["25", "30", "35", "40"], correctAnswer: 1 },
    { id: 3, question: "If x + 5 = 12, what is the value of x?", options: ["5", "6", "7", "8"], correctAnswer: 2 },
    { id: 4, question: "A shopkeeper sells an item for $120 after a 20% discount. What was the original price?", options: ["$140", "$144", "$150", "$160"], correctAnswer: 2 },
    { id: 5, question: "What is the next number in the sequence: 2, 6, 12, 20, ?", options: ["28", "30", "32", "34"], correctAnswer: 1 }
  ];

  useEffect(() => {
    setAnswers(new Array(questions.length).fill(null));
  }, []);

  useEffect(() => {
    if (timeLeft > 0 && !isFinished) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0) {
      handleFinish();
    }
  }, [timeLeft, isFinished]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleAnswer = (index) => {
    setSelectedAnswer(index);
    const newAnswers = [...answers];
    newAnswers[currentQuestion] = index;
    setAnswers(newAnswers);
  };

  const handleNext = () => {
    if (selectedAnswer !== null && selectedAnswer === questions[currentQuestion].correctAnswer) {
      setScore(score + 1);
    }
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
      setSelectedAnswer(answers[currentQuestion + 1]);
    } else {
      handleFinish();
    }
  };

  const handleFinish = () => {
    let finalScore = 0;
    answers.forEach((answer, i) => {
      if (answer === questions[i].correctAnswer) finalScore++;
    });
    setScore(finalScore);
    setIsFinished(true);
    
  };

  const progress = ((currentQuestion + 1) / questions.length) * 100;

  if (isFinished) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-gray-900 text-white">
        <div className="bg-gray-800 rounded-2xl p-8 max-w-2xl w-full text-center space-y-6 animate-fade-in shadow-lg">
          <FiCheckCircle className="w-20 h-20 text-green-400 mx-auto" />
          <h1 className="text-4xl font-bold">Test Completed!</h1>
          <p className="text-gray-400">Great job on completing the aptitude test</p>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-purple-700/20 p-6 rounded-lg">
              <p className="text-gray-300 text-sm mb-1">Your Score</p>
              <p className="text-4xl font-bold text-purple-400">{score}/{questions.length}</p>
            </div>
            <div className="bg-cyan-700/20 p-6 rounded-lg">
              <p className="text-gray-300 text-sm mb-1">Percentage</p>
              <p className="text-4xl font-bold text-cyan-400">{Math.round((score / questions.length) * 100)}%</p>
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

  return (
    <div className="min-h-screen p-6 bg-[#0B0F1A] text-white">
      <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div
              onClick={() => navigate("/options")}
              className="p-2 rounded-full border border-gray-600 cursor-pointer hover:bg-gray-700"
            >
              <FiArrowLeft className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Aptitude Test</h1>
              <p className="text-gray-400">Question {currentQuestion + 1} of {questions.length}</p>
            </div>
          </div>

          <div className="bg-gray-800 p-4 rounded-xl flex items-center gap-2">
            <FiClock className="w-5 h-5 text-cyan-400" />
            <span className="text-xl font-bold">{formatTime(timeLeft)}</span>
          </div>
        </div>

        {/* Progress */}
        <div className="space-y-2">
          <div className="w-full bg-gray-700 h-2 rounded-full">
            <div className="h-2 bg-gradient-to-r from-purple-600 to-pink-500 rounded-full" style={{ width: `${progress}%` }}></div>
          </div>
          <p className="text-sm text-gray-400 text-right">{Math.round(progress)}% Complete</p>
        </div>

        {/* Question */}
        <div className="bg-[#0B0F1A] p-8 rounded-2xl border-2 space-y-6">
          <h2 className="text-2xl font-semibold">{questions[currentQuestion].question}</h2>
          <div className="space-y-3">
            {questions[currentQuestion].options.map((option, index) => (
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
                {option}
              </div>
            ))}
          </div>

          {/* Navigation */}
          <div className="flex justify-between">
            <div
              onClick={() => {
                if (currentQuestion > 0) {
                  setCurrentQuestion(currentQuestion - 1);
                  setSelectedAnswer(answers[currentQuestion - 1]);
                }
              }}
              className={`py-3 px-6 rounded-lg cursor-pointer border border-gray-400 font-semibold ${
                currentQuestion === 0 ? "opacity-50 cursor-not-allowed" : "hover:bg-gray-700"
              }`}
            >
              Previous
            </div>
            <div
              onClick={handleNext}
              className={`py-3 px-6 rounded-lg font-semibold cursor-pointer ${
                selectedAnswer === null ? "opacity-50 cursor-not-allowed bg-gray-600" : "bg-gradient-to-r from-cyan-400 to-blue-500 text-white hover:opacity-90"
              }`}
            >
              {currentQuestion === questions.length - 1 ? "Finish" : "Next"}
            </div>
          </div>
        </div>

        {/* Tip */}
        <div className="bg-gray-800 p-4 rounded-2xl">
          <p className="text-sm text-gray-400">
            <strong>Tip:</strong> Read each question carefully and manage your time wisely. You can go back to previous questions if needed.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Aptitude;
