const categories = [
  "Quantitative",
  "Verbal",
  "Reasoning",
  "Data Interpretation",
  "Logical",
  "Puzzle Solving"
];

const categoriesDiv = document.getElementById("categories");
let currentDifficulty = "easy";
let selectedCategory = null;
let selectedTopic = "General";
let questionData = null;
let userAnswers = [];

const questionContainer = document.getElementById("questionContainer");
const optionsContainer = document.getElementById("optionsContainer");
const nextBtn = document.getElementById("nextBtn");
const finishBtn = document.getElementById("finishBtn");
const reportDiv = document.getElementById("report");

categories.forEach(cat => {
  const btn = document.createElement("button");
  btn.textContent = cat;
  btn.className = "bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-all";
  btn.onclick = () => {
    selectedCategory = cat;
    loadQuestion();
  };
  categoriesDiv.appendChild(btn);
});

async function loadQuestion(){
  questionContainer.textContent = "Loading question...";
  optionsContainer.innerHTML = "";
  nextBtn.classList.add("hidden");
  finishBtn.classList.add("hidden");
  reportDiv.innerHTML = "";

  try {
    const res = await fetch("http://127.0.0.1:8000/get_question", {
      method: "POST",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify({
        category: selectedCategory,
        topic: selectedTopic,
        difficulty: currentDifficulty
      })
    });
    questionData = await res.json();

    if(questionData.error){
      questionContainer.textContent = "Error: " + questionData.error;
      return;
    }

    questionContainer.textContent = questionData.question;
    questionData.options.forEach(opt => {
      const btn = document.createElement("button");
      btn.textContent = opt;
      btn.className = "bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-all text-left";
      btn.onclick = () => submitAnswer(opt);
      optionsContainer.appendChild(btn);
    });
  } catch(err){
    questionContainer.textContent = "Error fetching question.";
    console.error(err);
  }
}

async function submitAnswer(selectedOption){
  const correct = selectedOption[0] === questionData.correct_answer;
  alert(`Your Answer is ${correct ? "Correct ✅" : "Wrong ❌"}\nExplanation: ${questionData.explanation}`);

  userAnswers.push({
    question_id: questionData.question_id,
    category: selectedCategory,
    topic: selectedTopic,
    selected_option: selectedOption,
    correct_answer: questionData.correct_answer
  });

  await fetch("http://127.0.0.1:8000/submit_answer", {
    method: "POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify(userAnswers[userAnswers.length - 1])
  });

  if(correct){
    if(currentDifficulty === "easy") currentDifficulty = "medium";
    else if(currentDifficulty === "medium") currentDifficulty = "hard";
  } else {
    currentDifficulty = "easy";
  }

  nextBtn.classList.remove("hidden");
  finishBtn.classList.remove("hidden");
}

nextBtn.onclick = loadQuestion;

finishBtn.onclick = async () => {
  const res = await fetch(`http://127.0.0.1:8000/final_report/${selectedCategory}`);
  const data = await res.json();
  reportDiv.innerHTML = `
    <h2 class="text-xl font-bold mt-4">Final Report</h2>
    <p>Total Questions: ${data.total_questions}</p>
    <p>Correct Answers: ${data.correct_answers}</p>
    <p>Score: ${data.score_percent}%</p>
    <p>Strengths: ${data.strengths.join(", ") || "None"}</p>
    <p>Weaknesses: ${data.weaknesses.join(", ") || "None"}</p>
    <p>Areas of Improvement: ${data.areas_of_improvement.join(", ") || "None"}</p>
  `;
  questionContainer.textContent = "";
  optionsContainer.innerHTML = "";
  nextBtn.classList.add("hidden");
  finishBtn.classList.add("hidden");
};
