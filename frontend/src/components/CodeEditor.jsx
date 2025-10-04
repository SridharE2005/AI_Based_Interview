import React, { useState, useEffect, useRef } from "react";
import * as monaco from "monaco-editor";

const languages = [
  { id: 71, name: "Python", mode: "python" },
  { id: 62, name: "Java", mode: "java" },
  { id: 54, name: "C++", mode: "cpp" },
  { id: 63, name: "JavaScript", mode: "javascript" },
  { id: 50, name: "C", mode: "c" },
  { id: 51, name: "C#", mode: "csharp" },
  { id: 68, name: "PHP", mode: "php" },
  { id: 72, name: "Ruby", mode: "ruby" },
  { id: 83, name: "Swift", mode: "swift" },
  { id: 78, name: "Kotlin", mode: "kotlin" },
  { id: 60, name: "Go", mode: "go" },
  { id: 74, name: "TypeScript", mode: "typescript" },
];

const CodeEditor = ({ onSubmitCode }) => {
  const [language, setLanguage] = useState(languages[0]);
  const [editorInstance, setEditorInstance] = useState(null);
  const [output, setOutput] = useState("Output will be displayed here...");
  const [isLoading, setIsLoading] = useState(false);
  const editorRef = useRef(null);

  const API_KEY = "c55f84df8fmsh4ca8fb606400d22p1bd087jsne152976d3bd4";
  const JUDGE0_URL = "https://judge0-ce.p.rapidapi.com/submissions";

  useEffect(() => {
    if (editorRef.current) {
      const editor = monaco.editor.create(editorRef.current, {
        language: language.mode,
        theme: "vs-dark",
        fontSize: 16,
        minimap: { enabled: false },
        wordWrap: "on",
        automaticLayout: true,
      });
      setEditorInstance(editor);
      return () => editor.dispose();
    }
  }, []);

  useEffect(() => {
    if (editorInstance) {
      monaco.editor.setModelLanguage(editorInstance.getModel(), language.mode);
    }
  }, [language, editorInstance]);

  const runCode = async () => {
    if (!editorInstance) return;
    setIsLoading(true);
    setOutput("Executing code...");
    const code = editorInstance.getValue();

    try {
      const response = await fetch(`${JUDGE0_URL}?base64_encoded=false&wait=true`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-RapidAPI-Key": API_KEY,
          "X-RapidAPI-Host": "judge0-ce.p.rapidapi.com",
        },
        body: JSON.stringify({ language_id: language.id, source_code: code, stdin: "" }),
      });
      const data = await response.json();
      if (data.stdout) setOutput(data.stdout);
      else if (data.stderr) setOutput(`Error:\n${data.stderr}`);
      else if (data.compile_output) setOutput(`Compilation Error:\n${data.compile_output}`);
      else setOutput("Execution finished with no output.");
    } catch (error) {
      console.error("Error running code:", error);
      setOutput("An error occurred while trying to run the code.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitCode = () => {
    if (!editorInstance) return;
    const code = editorInstance.getValue().trim();
    if (!code) return alert("Code editor is empty. Please write some code before submitting.");
    onSubmitCode(code);
  };

  return (
    <div className="flex flex-col h-[80vh] w-full text-white bg-slate-800 p-4 rounded-lg">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Code Compiler</h2>
        <div className="flex items-center gap-3">
          <label htmlFor="language" className="font-medium">Language:</label>
          <select
            id="language"
            className="bg-slate-700 p-2 rounded-md border-slate-600 focus:ring-2 focus:ring-indigo-500 outline-none"
            onChange={(e) => {
              const selectedLang = languages.find(lang => lang.id === parseInt(e.target.value));
              setLanguage(selectedLang);
            }}
          >
            {languages.map((lang) => (
              <option key={lang.id} value={lang.id}>{lang.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Editor + Output */}
      <div className="flex-1 flex gap-4 overflow-hidden">
        <div className="flex-1 rounded-md overflow-hidden" ref={editorRef} style={{ minHeight: 0 }}></div>
        <div className="flex-1 flex flex-col bg-slate-900 rounded-md p-3 overflow-hidden">
          <p className="font-bold text-base mb-2">Output:</p>
          <pre className="flex-1 bg-black/50 rounded p-3 text-sm text-green-400 whitespace-pre-wrap overflow-y-auto">
            {output}
          </pre>
        </div>
      </div>

      {/* Buttons */}
      <div className="flex justify-end items-center gap-4 mt-4">
        <button
          className="bg-slate-600 text-white py-2 px-5 rounded-lg font-semibold transition-colors hover:bg-slate-500 disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={runCode}
          disabled={isLoading}
        >
          {isLoading ? "Running..." : "Run Code"}
        </button>
        <button
          className="bg-indigo-600 text-white py-2 px-5 rounded-lg font-semibold transition-colors hover:bg-indigo-500"
          onClick={handleSubmitCode}
        >
          Submit Code
        </button>
      </div>
    </div>
  );
};

export default CodeEditor;
