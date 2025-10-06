# Backend/app/ai_client.py
import os
import json
import re
from dotenv import load_dotenv
import google.generativeai as genai

load_dotenv()
GENIE_API_KEY = os.getenv("GEMINI_API_KEY") or os.getenv("GENIE_API_KEY") or os.getenv("GEMINI_KEY")
if not GENIE_API_KEY:
    raise RuntimeError("GEMINI_API_KEY not found in environment")
genai.configure(api_key=GENIE_API_KEY)

# Use gemini-2.5-flash-lite explicitly
MODEL_NAME = "gemini-2.5-flash-lite"

def _try_parse_json_from_text(txt: str):
    """Try to find JSON object inside text and parse it."""
    txt = txt.strip()
    # First try direct json
    try:
        return json.loads(txt)
    except Exception:
        # extract first {...} block
        m = re.search(r"\{.*\}", txt, re.DOTALL)
        if m:
            try:
                return json.loads(m.group())
            except Exception:
                # try to clean trailing commas and such
                cleaned = re.sub(r",\s*}", "}", m.group())
                cleaned = re.sub(r",\s*\]", "]", cleaned)
                try:
                    return json.loads(cleaned)
                except Exception:
                    return None
        return None

def _match_correct_index(options, answer_text_candidate):
    """Find index in options that best matches answer_text_candidate."""
    if answer_text_candidate is None:
        return None
    answer_text_candidate = str(answer_text_candidate).strip().lower()
    # direct equality
    for i, opt in enumerate(options):
        if str(opt).strip().lower() == answer_text_candidate:
            return i
    # substring match
    for i, opt in enumerate(options):
        if answer_text_candidate in str(opt).strip().lower() or str(opt).strip().lower() in answer_text_candidate:
            return i
    # If options might be labeled "A. 3", "B. 4", try to strip label
    for i, opt in enumerate(options):
        s = re.sub(r"^[A-Da-d]\.?\s*", "", str(opt)).strip().lower()
        if s == answer_text_candidate:
            return i
    # fallback None
    return None

def generate_text(category: str, topic: str, difficulty: str, previous_questions: list = None) -> dict:
    """
    Ask Gemini to generate one multiple-choice question.
    Returns dict with keys:
      question, options (list of 4), correct_index (int 0..3), correct_answer_text, explanation, subtopic
    """
    previous_questions = previous_questions or []

    # Make the prompt explicit and conservative (required JSON format)
    # Keep verbal questions simple if category == "Verbal"
    simple_verbal_note = ""
    if category.lower() == "verbal":
        simple_verbal_note = "Use simple language suitable for interview-level verbal ability questions (short sentences)."

    prompt = f"""
You are an assistant that generates one clear multiple-choice aptitude question for interviews.
Category: {category}
Topic: {topic}
Difficulty: {difficulty}

Do NOT output anything but a single JSON object. The JSON must match EXACTLY this schema:

{{
  "question": "string (the question statement)",
  "options": ["option1", "option2", "option3", "option4"],
  "correct_index": 0,   // integer 0..3 - index of correct option in the options array
  "correct_answer_text": "the correct option text exactly as in the options array",
  "explanation": "short explanation why the correct answer is correct (1-3 short sentences).",
  "subtopic": "short subtopic string (optional)"
}}

Constraints:
- Provide exactly 4 options.
- Make sure correct_index matches the correct option.
- Keep the question and options concise and suitable for a live interview.
- Avoid math-heavy phrasing for Verbal; for Reasoning, keep puzzles understandable within 30-45 seconds for 'easy' and 60-90 seconds for 'medium/hard'.
- Avoid using letters like A), B) inside the 'options' values; options should be plain text strings.
- Try not to repeat recent questions. Previous question texts: {previous_questions}

{simple_verbal_note}
"""

    # Use the GenerativeModel wrapper (works with many versions of google-generativeai)
    model = genai.GenerativeModel(MODEL_NAME, generation_config={"temperature": 0.7})

    try:
        resp = model.generate_content(prompt)
        text = getattr(resp, "text", None)
        if text is None:
            # some genai versions wrap content differently
            text = str(resp)

        parsed = _try_parse_json_from_text(text)
        if not parsed:
            # If not parseable, attempt to extract JSON-like lines and try again
            raise ValueError("Could not parse JSON from model output")

        # Basic normalization and validation
        q = parsed.get("question") or parsed.get("question_text") or parsed.get("questionText")
        options = parsed.get("options") or parsed.get("choices") or parsed.get("answers")
        correct_index = parsed.get("correct_index") if parsed.get("correct_index") is not None else parsed.get("correctOptionIndex")
        correct_text = parsed.get("correct_answer_text") or parsed.get("correct_answer") or parsed.get("correctAnswer")
        explanation = parsed.get("explanation") or parsed.get("explain") or ""

        if not q or not options or len(options) < 2:
            raise ValueError("Generated data missing required fields")

        # Normalize options to exactly 4 strings
        options = list(options)
        if len(options) != 4:
            # if model produced <4 or >4, try to trim/extend politely:
            if len(options) > 4:
                options = options[:4]
            else:
                # pad with placeholder (should rarely happen)
                while len(options) < 4:
                    options.append("None of the above")

        # Determine correct_index robustly
        if correct_index is None:
            inferred = _match_correct_index(options, correct_text)
            if inferred is None:
                # last resort: if model gave "A"/"B" or "A. option", map it
                if isinstance(correct_text, str) and re.match(r"^[A-Da-d]", correct_text.strip()):
                    letter = correct_text.strip()[0].upper()
                    correct_index = ord(letter) - ord("A")
                else:
                    correct_index = 0  # fallback to first option (should be rare)
            else:
                correct_index = inferred
        else:
            correct_index = int(correct_index)

        correct_index = max(0, min(3, int(correct_index)))
        correct_ans_text = options[correct_index].strip()

        return {
            "question": str(q).strip(),
            "options": [str(o).strip() for o in options],
            "correct_index": correct_index,
            "correct_answer_text": correct_ans_text,
            "explanation": str(explanation).strip(),
            "subtopic": parsed.get("subtopic", topic)
        }

    except Exception as e:
        # Bubble up structured error so caller can fallback
        return {"error": str(e)}
