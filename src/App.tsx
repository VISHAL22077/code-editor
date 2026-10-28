import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Language,
  CodeError,
  CodePreset,
  EditorSettings,
} from "./types";
import { CODE_PRESETS } from "./data/presets";
import { runLocalLinter, mergeErrors } from "./utils/localLinter";
import { Header } from "./components/Header";
import { CodeEditor } from "./components/CodeEditor";
import { ErrorListPanel } from "./components/ErrorListPanel";
import { SelfCorrectPanel } from "./components/SelfCorrectPanel";
import { AutoCorrectModal } from "./components/AutoCorrectModal";
import { SettingsDrawer } from "./components/SettingsDrawer";
import { OutputPanel } from "./components/OutputPanel";

const HELLO_WORLD_BY_LANGUAGE: Record<Language, string> = {
  javascript: 'console.log("Hello, World!");',
  typescript: 'console.log("Hello, World!");',
  python: 'print("Hello, World!")',
  html: '<!doctype html>\n<html>\n  <body>\n    <h1>Hello, World!</h1>\n  </body>\n</html>',
  css: 'body {\n  color: #111827;\n}',
  json: '{\n  "message": "Hello, World!"\n}',
  sql: "SELECT 'Hello, World!' AS message;",
  c: '#include <stdio.h>\n\nint main(void) {\n  printf("Hello, World!\\n");\n  return 0;\n}',
  cpp: '#include <iostream>\n\nint main() {\n  std::cout << "Hello, World!" << std::endl;\n  return 0;\n}',
  java: 'public class Main {\n  public static void main(String[] args) {\n    System.out.println("Hello, World!");\n  }\n}',
};

// GitHub Pages serves only the static frontend. Keep the local linter active
// there, but do not send POST requests to API endpoints that Pages cannot run.
const hasBackendApi =
  typeof window === "undefined" || !window.location.hostname.endsWith(".github.io");

type BrowserRunResult = { success: boolean; output: string };

function runJavaScriptInBrowser(source: string): Promise<BrowserRunResult> {
  return new Promise((resolve) => {
    const workerSource = `
      self.onmessage = ({ data }) => {
        const lines = [];
        const format = (value) => {
          if (typeof value === 'string') return value;
          try { return JSON.stringify(value); } catch { return String(value); }
        };
        const output = (...values) => lines.push(values.map(format).join(' '));
        try {
          const result = Function('console', data)({ log: output, info: output, warn: output, error: output });
          Promise.resolve(result).then((value) => {
            if (value !== undefined) output(value);
            self.postMessage({ success: true, output: lines.join('\\n') || 'Program completed with no output.' });
          }).catch((error) => self.postMessage({ success: false, output: error?.stack || String(error) }));
        } catch (error) {
          self.postMessage({ success: false, output: error?.stack || String(error) });
        }
      };
    `;
    const workerUrl = URL.createObjectURL(new Blob([workerSource], { type: "text/javascript" }));
    const worker = new Worker(workerUrl);
    const finish = (result: BrowserRunResult) => {
      clearTimeout(timeout);
      worker.terminate();
      URL.revokeObjectURL(workerUrl);
      resolve(result);
    };
    const timeout = window.setTimeout(
      () => finish({ success: false, output: "Execution stopped after 5 seconds." }),
      5_000,
    );

    worker.onmessage = (event: MessageEvent<BrowserRunResult>) => finish(event.data);
    worker.onerror = (event) => finish({ success: false, output: event.message || "Could not start the JavaScript runner." });
    worker.postMessage(source);
  });
}

function resolveErrorLineIndex(lines: string[], error: CodeError): number | null {
  const reportedIndex = error.line - 1;
  const snippet = error.codeSnippet.trim();

  if (!snippet) {
    return reportedIndex >= 0 && reportedIndex < lines.length ? reportedIndex : null;
  }

  // Never overwrite a numbered line unless it still contains the snippet that
  // was analysed. AI line numbers can become stale while the user is editing.
  if (lines[reportedIndex]?.trim() === snippet) {
    return reportedIndex;
  }

  const matchingLines = lines
    .map((line, index) => (line.trim() === snippet ? index : -1))
    .filter((index) => index !== -1);

  return matchingLines.length === 1 ? matchingLines[0] : null;
}

function moveMisplacedClosingParenthesis(lines: string[]): boolean {
  for (let closingLineIndex = 0; closingLineIndex < lines.length; closingLineIndex++) {
    if (lines[closingLineIndex].trim() !== ")") continue;

    let previousLineIndex = closingLineIndex - 1;
    while (previousLineIndex >= 0 && !lines[previousLineIndex].trim()) previousLineIndex--;
    if (previousLineIndex < 0) continue;

    const previousLine = lines[previousLineIndex];
    const statementBeforeSemicolon = previousLine.split(";", 1)[0];
    const hasUnclosedCall =
      (statementBeforeSemicolon.match(/\(/g) || []).length >
      (statementBeforeSemicolon.match(/\)/g) || []).length;

    if (!hasUnclosedCall || !/;\s*(?:\/\/.*)?$/.test(previousLine)) continue;

    lines[previousLineIndex] = previousLine.replace(/;(?=\s*(?:\/\/.*)?$)/, ");");
    lines.splice(closingLineIndex, 1);
    return true;
  }

  return false;
}

function applyAutoCorrection(code: string, error: CodeError): string | null {
  const lines = code.split("\n");

  if (error.source === "local" && error.id.startsWith("local-misplaced-close-")) {
    return moveMisplacedClosingParenthesis(lines) ? lines.join("\n") : null;
  }

  // An opening bracket left unclosed belongs at the end of its scope, not on
  // the line where it opened. Replacing the opener line was what moved code
  // outside its bracket block.
  if (error.source === "local" && error.id.startsWith("local-unclosed-open-")) {
    const closingBracket = error.message.match(/Missing '([)}\]])'/)?.[1];
    const openerLine = lines[error.line - 1] || "";
    const indentation = openerLine.match(/^\s*/)?.[0] || "";

    // The visible error can be the outer brace while the real first repair is
    // a stray `)` after a Java statement. Normalize that statement as part of
    // the same correction so the code never keeps `;` before `)`.
    moveMisplacedClosingParenthesis(lines);

    // Calls and expressions ending in `;` must close before that semicolon,
    // rather than receiving a new closing-parenthesis line at EOF.
    if (closingBracket === ")" && /;\s*(?:\/\/.*)?$/.test(openerLine)) {
      lines[error.line - 1] = openerLine.replace(/;(?=\s*(?:\/\/.*)?$)/, ");");
      return lines.join("\n");
    }

    return [...lines, `${indentation}${closingBracket || error.suggestedFix}`].join("\n");
  }

  if (!error.suggestedFix.trim()) return null;

  const targetIndex = resolveErrorLineIndex(lines, error);
  if (targetIndex === null) return null;

  lines[targetIndex] = error.suggestedFix;
  return lines.join("\n");
}

export default function App() {
  // Begin with a clean, friendly example; syntax-error samples remain available in presets.
  const [code, setCode] = useState<string>(HELLO_WORLD_BY_LANGUAGE.javascript);
  const [language, setLanguage] = useState<Language>("javascript");
  const [selectedPresetId, setSelectedPresetId] = useState<string>("");

  const [errors, setErrors] = useState<CodeError[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [fullFixedCode, setFullFixedCode] = useState<string>("");
  const [selectedErrorId, setSelectedErrorId] = useState<string | null>(null);
  const [activeLine, setActiveLine] = useState<number | null>(null);

  const [isSelfCorrectOpen, setIsSelfCorrectOpen] = useState<boolean>(false);
  const [isAutoCorrectModalOpen, setIsAutoCorrectModalOpen] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isRunningCode, setIsRunningCode] = useState(false);
  const [runOutput, setRunOutput] = useState("");
  const [hasRunError, setHasRunError] = useState(false);

  const [settings, setSettings] = useState<EditorSettings>(() => {
    try {
      const saved = localStorage.getItem("syntaxfix_settings");
      if (saved) return JSON.parse(saved);
    } catch (e) {
      // ignore
    }
    return {
      fontSize: 14,
      showLineNumbers: true,
      debounceMs: 500,
      liveAutoFix: false,
      theme: "dark",
    };
  });

  // Save settings
  useEffect(() => {
    try {
      localStorage.setItem("syntaxfix_settings", JSON.stringify(settings));
    } catch (e) {
      // ignore
    }
  }, [settings]);

  // Ref to hold current code and prevent stale closures
  const codeRef = useRef(code);
  codeRef.current = code;

  // Real-time analysis runner
  const analyzeCode = useCallback(async (currentCode: string, currentLang: Language) => {
    if (!currentCode.trim()) {
      setErrors([]);
      setFullFixedCode("");
      setIsAnalyzing(false);
      return;
    }

    // 1. Instant 0ms local client-side linter check
    const localErrs = runLocalLinter(currentCode, currentLang);
    setErrors(localErrs);

    if (!hasBackendApi) {
      setFullFixedCode(currentCode);
      setIsAnalyzing(false);
      return;
    }

    // 2. Call server AI linter for deep line-by-line syntax & semantic checks
    setIsAnalyzing(true);
    try {
      const res = await fetch("/api/analyze-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: currentCode, language: currentLang }),
      });

      if (res.ok) {
        const data = await res.json();
        const aiErrors: CodeError[] = (data.errors || []).map((err: any) => ({
          ...err,
          source: "ai" as const,
        }));

        // Merge local & AI errors seamlessly
        const combined = mergeErrors(localErrs, aiErrors);
        setErrors(combined);
        setFullFixedCode(data.fullFixedCode || currentCode);

        // If live auto fix is enabled and errors are found
        if (settings.liveAutoFix && combined.length > 0 && data.fullFixedCode) {
          // Keep comments & fix syntax
        }
      }
    } catch (err) {
      console.error("AI Analysis error:", err);
    } finally {
      setIsAnalyzing(false);
    }
  }, [settings.liveAutoFix]);

  // A line is validated only after the cursor leaves it. This avoids showing
  // transient errors while a person is still in the middle of typing.
  const handleLineChange = useCallback((updatedCode: string) => {
    analyzeCode(updatedCode, language);
  }, [analyzeCode, language]);

  const handleRunCode = async () => {
    setIsRunningCode(true);
    setRunOutput("");
    setHasRunError(false);

    if (!hasBackendApi) {
      if (language === "javascript") {
        const result = await runJavaScriptInBrowser(code);
        setRunOutput(result.output);
        setHasRunError(!result.success);
      } else {
        setRunOutput("GitHub Pages can run JavaScript in the browser. Java, Python, C, and C++ need the SyntaxFix server; use the desktop app or a server-hosted deployment for those languages.");
        setHasRunError(true);
      }
      setIsRunningCode(false);
      return;
    }

    try {
      const response = await fetch("/api/run-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, language }),
      });
      const responseText = await response.text();
      let result: { success?: boolean; output?: string } = {};
      try {
        result = JSON.parse(responseText);
      } catch {
        // Keep the server response visible instead of reporting a misleading
        // connection error when a proxy or server returns non-JSON text.
      }

      setRunOutput(result.output || responseText || `Runner returned HTTP ${response.status}.`);
      setHasRunError(!response.ok || !result.success);
    } catch (error) {
      const detail = error instanceof Error ? error.message : "Unknown network error";
      setRunOutput(`Could not reach the local code runner. Make sure the SyntaxFix server is running on this device.\n\n${detail}`);
      setHasRunError(true);
    } finally {
      setIsRunningCode(false);
    }
  };

  // Handle Preset Load
  const handleSelectPreset = (preset: CodePreset) => {
    setSelectedPresetId(preset.id);
    setLanguage(preset.language);
    setCode(preset.code);
    setSelectedErrorId(null);
    setIsSelfCorrectOpen(false);
  };

  // Handle Language Change
  const handleLanguageChange = (newLang: Language) => {
    setLanguage(newLang);
    setCode(HELLO_WORLD_BY_LANGUAGE[newLang]);
    setSelectedPresetId("");
  };

  // Handle Reset / Clear Code
  const handleResetCode = () => {
    setCode("");
    setErrors([]);
    setFullFixedCode("");
    setSelectedErrorId(null);
    setIsSelfCorrectOpen(false);
  };

  // File extension map per language
  const FILE_EXTENSIONS: Record<Language, string> = {
    javascript: "js",
    typescript: "ts",
    python: "py",
    html: "html",
    css: "css",
    json: "json",
    sql: "sql",
    c: "c",
    cpp: "cpp",
    java: "java",
  };

  // Open File from computer
  const handleOpenFile = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".js,.ts,.py,.html,.css,.json,.sql,.c,.cpp,.java,.txt";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const content = ev.target?.result as string;
        setCode(content);
        setErrors([]);
        setFullFixedCode("");
        setSelectedErrorId(null);
        setIsSelfCorrectOpen(false);
        // Auto-detect language from file extension
        const ext = file.name.split(".").pop()?.toLowerCase();
        const extToLang: Record<string, Language> = {
          js: "javascript", ts: "typescript", py: "python",
          html: "html", css: "css", json: "json", sql: "sql",
          c: "c", cpp: "cpp", java: "java",
        };
        if (ext && extToLang[ext]) {
          setLanguage(extToLang[ext]);
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  // Save File to computer
  const handleSaveFile = () => {
    const ext = FILE_EXTENSIONS[language] || "txt";
    const filename = language === "java" ? `Main.${ext}` : `code.${ext}`;
    const blob = new Blob([code], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Auto-Correct a single specific line
  const handleAutoCorrectLine = (errorToFix: CodeError) => {
    const correctedCode = applyAutoCorrection(code, errorToFix);
    if (correctedCode !== null) {
      setCode(correctedCode);

      // Remove fixed error from state
      setErrors((prev) => prev.filter((e) => e.id !== errorToFix.id));
      if (selectedErrorId === errorToFix.id) {
        setIsSelfCorrectOpen(false);
        setSelectedErrorId(null);
      }
    }
  };

  // Manual Fix from Self-Correct Panel
  const handleApplyManualFix = (lineNum: number, fixedLine: string) => {
    const lines = code.split("\n");
    if (lineNum >= 1 && lineNum <= lines.length) {
      lines[lineNum - 1] = fixedLine;
      setCode(lines.join("\n"));
      setIsSelfCorrectOpen(false);
      setSelectedErrorId(null);
    }
  };

  // Auto-Correct All Errors
  const handleConfirmAutoCorrectAll = () => {
    if (fullFixedCode) {
      setCode(fullFixedCode);
      setErrors([]);
      setSelectedErrorId(null);
      setIsSelfCorrectOpen(false);
    } else {
      // Fallback line by line replacement
      let updatedCode = code;
      errors.forEach((err) => {
        const correctedCode = applyAutoCorrection(updatedCode, err);
        if (correctedCode !== null) updatedCode = correctedCode;
      });
      setCode(updatedCode);
      setErrors([]);
      setSelectedErrorId(null);
      setIsSelfCorrectOpen(false);
    }
  };

  // Currently selected error for Self-Correct view
  const selectedError = errors.find((e) => e.id === selectedErrorId) || errors[0];

  return (
    <div className={`app-shell theme-${settings.theme} flex flex-col h-screen w-screen bg-slate-950 text-slate-100 overflow-hidden font-sans`}>
      {/* Top Application Navigation & Toolbar */}
      <Header
        language={language}
        onLanguageChange={handleLanguageChange}
        selectedPreset={selectedPresetId}
        onSelectPreset={handleSelectPreset}
        errorCount={errors.length}
        isAnalyzing={isAnalyzing}
        onAutoCorrectAll={() => setIsAutoCorrectModalOpen(true)}
        onOpenSelfCorrectAll={() => {
          if (errors.length > 0) {
            setSelectedErrorId(errors[0].id);
            setIsSelfCorrectOpen(true);
          }
        }}
        onResetCode={handleResetCode}
        onOpenSettings={() => setIsSettingsOpen(true)}
        settings={settings}
        onToggleTheme={() => setSettings((prev) => ({ ...prev, theme: prev.theme === "dark" ? "light" : "dark" }))}
        onRunCode={handleRunCode}
        canRunCode={Boolean(code.trim()) && errors.length === 0 && !isAnalyzing}
        isRunningCode={isRunningCode}
        onOpenFile={handleOpenFile}
        onSaveFile={handleSaveFile}
      />

      {/* Main Workspace: Code Editor & Side Panel */}
      <main className="flex-1 flex overflow-hidden p-2 sm:p-3 gap-2 sm:gap-3">
        {/* Left/Center Code Editor Canvas */}
        <div className="flex-1 flex flex-col min-w-0 h-full gap-3">
          <CodeEditor
            code={code}
            onChange={setCode}
            errors={errors}
            selectedErrorId={selectedErrorId}
            onSelectError={(err) => {
              setSelectedErrorId(err.id);
              setIsSelfCorrectOpen(true);
            }}
            onAutoCorrectLine={handleAutoCorrectLine}
            language={language}
            settings={settings}
            activeLine={activeLine}
            setActiveLine={setActiveLine}
            onLineChange={handleLineChange}
          />
          <OutputPanel output={runOutput} isRunning={isRunningCode} isError={hasRunError} />
        </div>

        {/* Right Sidebar: Error List Panel OR Self-Correct Educational Panel */}
        <div className="w-80 md:w-96 lg:w-[420px] h-full flex-shrink-0 flex flex-col">
          {isSelfCorrectOpen && selectedError ? (
            <SelfCorrectPanel
              error={selectedError}
              onClose={() => setIsSelfCorrectOpen(false)}
              onAutoCorrectLine={handleAutoCorrectLine}
              onApplyManualFix={handleApplyManualFix}
            />
          ) : (
            <ErrorListPanel
              errors={errors}
              selectedErrorId={selectedErrorId}
              onSelectError={(err) => {
                setSelectedErrorId(err.id);
                setIsSelfCorrectOpen(true);
              }}
              onAutoCorrectLine={handleAutoCorrectLine}
              onAutoCorrectAll={() => setIsAutoCorrectModalOpen(true)}
              isAnalyzing={isAnalyzing}
            />
          )}
        </div>
      </main>

      {/* Auto Correct All Diff Modal */}
      <AutoCorrectModal
        isOpen={isAutoCorrectModalOpen}
        onClose={() => setIsAutoCorrectModalOpen(false)}
        originalCode={code}
        correctedCode={fullFixedCode || code}
        errorCount={errors.length}
        onConfirmApply={handleConfirmAutoCorrectAll}
      />

      {/* Settings Drawer */}
      <SettingsDrawer
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onUpdateSettings={(newSet) => setSettings((prev) => ({ ...prev, ...newSet }))}
      />
    </div>
  );
}
