import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: "2mb" }));

// Initialize Gemini Client server-side
const apiKey = process.env.GEMINI_API_KEY;
let ai: GoogleGenAI | null = null;
if (apiKey) {
  ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

// Health check endpoint
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", geminiConfigured: !!apiKey });
});

const RUN_TIMEOUT_MS = 5_000;
const MAX_OUTPUT_LENGTH = 64_000;
const RUNNABLE_LANGUAGES = new Set(["javascript", "python", "java", "c", "cpp"]);

type ProcessResult = {
  stdout: string;
  stderr: string;
  exitCode: number | null;
  timedOut: boolean;
};

function runProcess(command: string, args: string[], cwd: string): Promise<ProcessResult> {
  return new Promise((resolve) => {
    let stdout = "";
    let stderr = "";
    let timedOut = false;

    const appendOutput = (current: string, chunk: Buffer) =>
      (current + chunk.toString()).slice(0, MAX_OUTPUT_LENGTH);

    const child = spawn(command, args, { cwd, shell: false, windowsHide: true });
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill();
    }, RUN_TIMEOUT_MS);

    child.stdout.on("data", (chunk: Buffer) => {
      stdout = appendOutput(stdout, chunk);
    });
    child.stderr.on("data", (chunk: Buffer) => {
      stderr = appendOutput(stderr, chunk);
    });
    child.on("error", (error) => {
      stderr = appendOutput(stderr, Buffer.from(error.message));
    });
    child.on("close", (exitCode) => {
      clearTimeout(timer);
      resolve({ stdout, stderr, exitCode, timedOut });
    });
  });
}

function processMessage(result: ProcessResult, action: "compile" | "run") {
  if (result.timedOut) {
    return `${action === "compile" ? "Compilation" : "Execution"} stopped after 5 seconds.`;
  }
  if (result.exitCode !== 0) {
    return result.stderr || result.stdout || `${action === "compile" ? "Compilation" : "Execution"} failed.`;
  }
  return result.stdout || result.stderr;
}

// Local runner for the languages offered in the editor. Each run is isolated in
// a fresh temporary directory and its files are removed immediately afterward.
app.post("/api/run-code", async (req, res) => {
  const { code, language } = req.body || {};
  if (typeof code !== "string" || !code.trim()) {
    return res.status(400).json({ success: false, output: "Enter code before running it." });
  }
  if (code.length > 50_000) {
    return res.status(400).json({ success: false, output: "Code is limited to 50,000 characters per run." });
  }
  if (!RUNNABLE_LANGUAGES.has(language)) {
    return res.status(400).json({ success: false, output: "This language cannot be run locally." });
  }

  let runDirectory: string | undefined;
  try {
    runDirectory = await mkdtemp(join(tmpdir(), "syntaxfix-run-"));
    let compileResult: ProcessResult | undefined;
    let runResult: ProcessResult;

    switch (language) {
      case "javascript":
        await writeFile(join(runDirectory, "main.mjs"), code, "utf8");
        runResult = await runProcess("node", ["main.mjs"], runDirectory);
        break;
      case "python":
        await writeFile(join(runDirectory, "main.py"), code, "utf8");
        runResult = await runProcess("python", ["main.py"], runDirectory);
        break;
      case "java":
        await writeFile(join(runDirectory, "Main.java"), code, "utf8");
        compileResult = await runProcess("javac", ["Main.java"], runDirectory);
        if (compileResult.exitCode !== 0 || compileResult.timedOut) {
          return res.json({ success: false, output: `Compilation error:\n${processMessage(compileResult, "compile")}` });
        }
        runResult = await runProcess("java", ["-cp", runDirectory, "Main"], runDirectory);
        break;
      case "c":
        await writeFile(join(runDirectory, "main.c"), code, "utf8");
        compileResult = await runProcess("gcc", ["main.c", "-o", "program.exe"], runDirectory);
        if (compileResult.exitCode !== 0 || compileResult.timedOut) {
          return res.json({ success: false, output: `Compilation error:\n${processMessage(compileResult, "compile")}` });
        }
        runResult = await runProcess(join(runDirectory, "program.exe"), [], runDirectory);
        break;
      case "cpp":
        await writeFile(join(runDirectory, "main.cpp"), code, "utf8");
        compileResult = await runProcess("g++", ["main.cpp", "-o", "program.exe"], runDirectory);
        if (compileResult.exitCode !== 0 || compileResult.timedOut) {
          return res.json({ success: false, output: `Compilation error:\n${processMessage(compileResult, "compile")}` });
        }
        runResult = await runProcess(join(runDirectory, "program.exe"), [], runDirectory);
        break;
      default:
        return res.status(400).json({ success: false, output: "This language cannot be run locally." });
    }

    const output = processMessage(runResult, "run");
    const success = runResult.exitCode === 0 && !runResult.timedOut;
    return res.json({
      success,
      output: success ? output || "Program completed with no output." : `Runtime error:\n${output}`,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, output: `Runner error: ${error.message}` });
  } finally {
    if (runDirectory) {
      await rm(runDirectory, { recursive: true, force: true });
    }
  }
});

// Real-time Line-by-Line Syntax Error Analysis Endpoint
app.post("/api/analyze-code", async (req, res) => {
  try {
    const { code, language } = req.body;

    if (!code || typeof code !== "string" || code.trim() === "") {
      return res.json({ errors: [], fullFixedCode: code || "" });
    }

    if (!ai) {
      // Fallback response if no API key is provided
      return res.status(503).json({
        error: "GEMINI_API_KEY is not configured.",
        errors: [],
      });
    }

    const prompt = `Analyze the following ${language || "javascript"} code strictly line-by-line for syntax errors, structural mistakes, typos, missing symbols (like missing parentheses, brackets, braces, semicolons, quotes, colons), invalid keywords, or obvious type/reference errors.

Code to analyze:
\`\`\`${language || "javascript"}
${code}
\`\`\`

Return a JSON object containing:
1. "errors": An array of syntax errors found in the code. Each error MUST include:
   - "line": 1-based integer line number where the error occurs.
   - "column": approximate 1-based column integer where error starts (optional or 1).
   - "severity": "error" or "warning" or "info".
   - "category": one of "syntax", "bracket", "missing_symbol", "indentation", "type", "semantic".
   - "message": A clear, concise 1-sentence error message describing the exact mistake on this line.
   - "codeSnippet": The exact original text of line ${"${line}"}.
   - "suggestedFix": The corrected version of line ${"${line}"} (or relevant snippet replacement).
   - "explanation": An object detailing:
     - "whatIsWrong": Plain language description of the error.
     - "whyItHappened": Why this syntax is invalid in ${language || "javascript"}.
     - "howToFixStepByStep": Array of 2-3 clear step-by-step instructions for the user to fix it manually.
     - "conceptTip": A short educational tip or rule regarding this syntax feature.

2. "fullFixedCode": The entire code updated with all syntax errors auto-corrected cleanly.
3. "summary": A brief 1-sentence overview of the code quality or errors detected.

Be precise with line numbers (1-indexed). If a line has no error, do not list it. If there are no errors, return an empty errors array and fullFixedCode identical to input code.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            fullFixedCode: { type: Type.STRING },
            errors: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  line: { type: Type.INTEGER },
                  column: { type: Type.INTEGER },
                  severity: { type: Type.STRING },
                  category: { type: Type.STRING },
                  message: { type: Type.STRING },
                  codeSnippet: { type: Type.STRING },
                  suggestedFix: { type: Type.STRING },
                  explanation: {
                    type: Type.OBJECT,
                    properties: {
                      whatIsWrong: { type: Type.STRING },
                      whyItHappened: { type: Type.STRING },
                      howToFixStepByStep: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING },
                      },
                      conceptTip: { type: Type.STRING },
                    },
                    required: ["whatIsWrong", "whyItHappened", "howToFixStepByStep", "conceptTip"],
                  },
                },
                required: [
                  "line",
                  "severity",
                  "category",
                  "message",
                  "codeSnippet",
                  "suggestedFix",
                  "explanation",
                ],
              },
            },
          },
          required: ["errors", "fullFixedCode", "summary"],
        },
      },
    });

    const resultText = response.text || "{}";
    const parsed = JSON.parse(resultText);

    // Format errors with stable unique IDs
    const formattedErrors = (parsed.errors || []).map((err: any, idx: number) => ({
      id: `err-${err.line}-${idx}-${Date.now()}`,
      line: Math.max(1, err.line || 1),
      column: err.column || 1,
      severity: err.severity || "error",
      category: err.category || "syntax",
      message: err.message || "Syntax error detected",
      codeSnippet: err.codeSnippet || "",
      suggestedFix: err.suggestedFix || "",
      explanation: err.explanation || {
        whatIsWrong: err.message || "Syntax error on this line.",
        whyItHappened: "The syntax violates language rules.",
        howToFixStepByStep: ["Review the line", "Apply the suggested fix"],
        conceptTip: "Ensure all brackets, quotes, and keywords match language standards.",
      },
    }));

    return res.json({
      errors: formattedErrors,
      fullFixedCode: parsed.fullFixedCode || code,
      summary: parsed.summary || (formattedErrors.length ? `Found ${formattedErrors.length} issues` : "No syntax errors detected."),
    });
  } catch (error: any) {
    console.error("Error analyzing code:", error);
    res.status(500).json({
      error: "Failed to analyze code",
      details: error.message,
    });
  }
});

// Auto-Correct Endpoint
app.post("/api/auto-correct", async (req, res) => {
  try {
    const { code, language, errorsToFix } = req.body;

    if (!code) {
      return res.json({ correctedCode: "", fixedCount: 0 });
    }

    if (!ai) {
      return res.status(503).json({ error: "GEMINI_API_KEY is not configured." });
    }

    const prompt = `You are an expert compiler and linter. Automatically correct all syntax, grammatical, and typographical errors in the following ${language || "javascript"} code while strictly preserving comments, variable names, logic, and intended formatting.

Code:
\`\`\`${language || "javascript"}
${code}
\`\`\`

${
  errorsToFix && errorsToFix.length > 0
    ? `Pay special attention to these reported line errors: ${JSON.stringify(errorsToFix)}`
    : "Fix all syntax errors."
}

Return JSON with:
1. "correctedCode": The complete updated string of corrected code.
2. "changes": An array of objects describing each fix made:
   - "line": integer line number
   - "description": 1-sentence summary of what was fixed on that line.
   - "original": original line
   - "fixed": corrected line`;

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            correctedCode: { type: Type.STRING },
            changes: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  line: { type: Type.INTEGER },
                  description: { type: Type.STRING },
                  original: { type: Type.STRING },
                  fixed: { type: Type.STRING },
                },
              },
            },
          },
          required: ["correctedCode", "changes"],
        },
      },
    });

    const parsed = JSON.parse(response.text || "{}");
    return res.json({
      correctedCode: parsed.correctedCode || code,
      changes: parsed.changes || [],
      fixedCount: (parsed.changes || []).length,
    });
  } catch (error: any) {
    console.error("Auto-correct error:", error);
    res.status(500).json({ error: "Auto-correct failed", details: error.message });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`SyntaxFix server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
