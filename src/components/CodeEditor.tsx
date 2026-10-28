import React, { useRef, useState, useEffect } from "react";
import { CodeError, EditorSettings, Language } from "../types";
import { runLocalLinter } from "../utils/localLinter";
import {
  AlertCircle,
  Wand2,
  BookOpen,
  Check,
  Zap,
  Info,
  X,
} from "lucide-react";

interface CodeEditorProps {
  code: string;
  onChange: (newCode: string) => void;
  errors: CodeError[];
  selectedErrorId?: string | null;
  onSelectError: (error: CodeError) => void;
  onAutoCorrectLine: (error: CodeError) => void;
  language: Language;
  settings: EditorSettings;
  activeLine?: number | null;
  setActiveLine: (line: number | null) => void;
  onLineChange: (code: string) => void;
}

export const CodeEditor: React.FC<CodeEditorProps> = ({
  code,
  onChange,
  errors,
  selectedErrorId,
  onSelectError,
  onAutoCorrectLine,
  language,
  settings,
  activeLine,
  setActiveLine,
  onLineChange,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const gutterRef = useRef<HTMLDivElement>(null);
  const previousLineRef = useRef<number | null>(null);
  const [lineChangeError, setLineChangeError] = useState<CodeError | null>(null);

  const lines = code.split("\n");
  const lineCount = Math.max(lines.length, 1);
  const lineHeight = Math.round(settings.fontSize * 1.5);
  const editorTextStyle = {
    fontSize: `${settings.fontSize}px`,
    lineHeight: `${lineHeight}px`,
  };
  // Keep the error overlay on the exact same first-line baseline as the textarea.
  const codeSurfaceStyle = {
    ...editorTextStyle,
    paddingTop: "11px",
    paddingBottom: "13px",
  };

  // Map line number (1-based) to error
  const errorMap = new Map<number, CodeError>();
  errors.forEach((err) => {
    if (!errorMap.has(err.line)) {
      errorMap.set(err.line, err);
    }
  });

  // Handle scroll sync between textarea and line gutter
  const handleScroll = () => {
    if (textareaRef.current && gutterRef.current) {
      gutterRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  };

  // Keyboard shortcut & Tab key handler inside textarea
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Tab") {
      e.preventDefault();
      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;

      // Insert 2 spaces for tab
      const updated = code.substring(0, start) + "  " + code.substring(end);
      onChange(updated);

      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 2;
      }, 0);
    }
  };

  // Detect cursor position line number
  const handleSelectOrKeyUp = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const pos = textarea.selectionStart;
    const currentLine = textarea.value.substring(0, pos).split("\n").length;
    const previousLine = previousLineRef.current;

    // Validate the line the user has just left, not only the line they enter.
    // Reading the textarea value makes this immediate, even before the parent
    // state update and the debounced AI check have completed.
    if (previousLine && previousLine !== currentLine) {
      const immediateError = runLocalLinter(textarea.value, language).find(
        (error) => error.line === previousLine,
      );
      const knownError = errorMap.get(previousLine);
      setLineChangeError(immediateError || knownError || null);
      onLineChange(textarea.value);
    }

    previousLineRef.current = currentLine;
    setActiveLine(currentLine);

    const lineErr = errorMap.get(currentLine);
    if (lineErr) {
      onSelectError(lineErr);
    }
  };

  // Scroll to line when selected error changes externally
  useEffect(() => {
    if (selectedErrorId) {
      const err = errors.find((e) => e.id === selectedErrorId);
      if (err && textareaRef.current) {
        const lineIndex = err.line - 1;
        textareaRef.current.scrollTop = Math.max(0, lineIndex * lineHeight - 100);
      }
    }
  }, [selectedErrorId, errors, lineHeight]);

  // Do not retain an alert after its error was fixed.
  useEffect(() => {
    if (lineChangeError && !errors.some((error) => error.line === lineChangeError.line)) {
      setLineChangeError(null);
    }
  }, [errors, lineChangeError]);

  const visibleError = lineChangeError || (activeLine ? errorMap.get(activeLine) : undefined);
  const visibleErrorType = visibleError
    ? visibleError.category.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase())
    : "";

  return (
    <div className="code-editor relative flex-1 min-h-0 flex flex-col bg-[#1e1e2e] text-slate-100 font-mono overflow-hidden rounded-xl border border-slate-800 shadow-xl">
      {/* Editor Header Bar */}
      <div className="editor-toolbar flex items-center justify-between px-4 py-2 bg-[#181825] border-b border-slate-800 text-xs text-slate-400 select-none">
        <div className="flex items-center space-x-3">
          <span className="flex items-center space-x-1.5 font-medium text-slate-300">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse"></span>
            <span className="uppercase tracking-wider">{language}</span>
          </span>
          <span className="text-slate-600">|</span>
          <span>{lineCount} {lineCount === 1 ? "line" : "lines"}</span>
          <span>{code.length} chars</span>
        </div>

        <div className="flex items-center space-x-3 text-[11px]">
          {activeLine && (
            <span className="text-slate-400">
              Line <strong className="text-indigo-300">{activeLine}</strong>
            </span>
          )}
          <span className="text-slate-500 font-sans hidden sm:inline">
            Press <kbd className="px-1 py-0.5 bg-slate-800 border border-slate-700 rounded text-slate-300">Tab</kbd> to indent
          </span>
        </div>
      </div>

      {/* Main Editor Work Area */}
      <div className="relative flex-1 flex overflow-hidden">
        {/* Line Gutter */}
        <div
          ref={gutterRef}
          className="editor-gutter w-14 bg-[#181825] border-r border-slate-800/80 text-slate-500 text-right select-none py-3 overflow-hidden font-mono text-xs flex-shrink-0"
          style={editorTextStyle}
        >
          {Array.from({ length: lineCount }).map((_, idx) => {
            const lineNum = idx + 1;
            const err = errorMap.get(lineNum);
            const isActive = activeLine === lineNum;
            const isSelectedErr = err && err.id === selectedErrorId;

            return (
              <div
                key={lineNum}
                onClick={() => {
                  setActiveLine(lineNum);
                  if (err) onSelectError(err);
                }}
                className={`relative px-2 flex items-center justify-end group cursor-pointer transition-colors ${
                  isSelectedErr
                    ? "bg-rose-500/20 text-rose-300 font-bold"
                    : err
                    ? "bg-rose-950/40 text-rose-400 font-medium"
                    : isActive
                    ? "text-indigo-300 font-semibold bg-indigo-500/10"
                  : "hover:text-slate-300"
                }`}
                style={{ height: `${lineHeight}px` }}
              >
                {/* Error Badge Indicator */}
                {err && (
                  <span
                    title={`Line ${lineNum}: ${err.message}`}
                    className="absolute left-1 flex items-center justify-center text-rose-400 hover:text-rose-200 transition-transform group-hover:scale-125"
                  >
                    <AlertCircle className="w-3.5 h-3.5 fill-rose-500/20 text-rose-400" />
                  </span>
                )}
                <span>{lineNum}</span>
              </div>
            );
          })}
        </div>

        {/* Text Area Code Canvas */}
        <div className="relative flex-1 overflow-hidden">
          {/* Visual Highlight Overlay for Error Lines */}
          <div
            className="absolute inset-0 pointer-events-none py-3 font-mono overflow-hidden"
            style={codeSurfaceStyle}
          >
            {lines.map((lineContent, idx) => {
              const lineNum = idx + 1;
              const err = errorMap.get(lineNum);
              const isActive = activeLine === lineNum;

              if (!err && !isActive) {
                return <div key={idx} className="h-6" />;
              }

              return (
                <div
                  key={idx}
                  className={`w-full flex items-center transition-colors ${
                    err
                      ? "bg-rose-500/15 border-l-2 border-rose-500"
                      : isActive
                      ? "bg-indigo-500/5"
                      : ""
                  }`}
                  style={{ height: `${lineHeight}px` }}
                />
              );
            })}
          </div>

          {/* Interactive Code Textarea */}
          <textarea
            id="code-input-textarea"
            ref={textareaRef}
            value={code}
            onChange={(e) => onChange(e.target.value)}
            onScroll={handleScroll}
            onKeyDown={handleKeyDown}
            onKeyUp={handleSelectOrKeyUp}
            onClick={handleSelectOrKeyUp}
            onSelect={handleSelectOrKeyUp}
            onBlur={handleSelectOrKeyUp}
            spellCheck={false}
            autoCorrect="off"
            autoCapitalize="off"
            placeholder="Write or paste code here..."
            className="relative z-10 w-full h-full bg-transparent text-slate-200 font-mono py-3 px-4 outline-none resize-none overflow-auto whitespace-pre leading-6 selection:bg-indigo-500/30"
            style={{ ...codeSurfaceStyle, tabSize: 2 }}
          />
        </div>
      </div>

      {/* Floating Line Hover/Active Quick Fix Overlay Bar */}
      {visibleError && (
        <div
          className="bg-rose-950/95 border-t border-rose-500/50 px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs shadow-2xl backdrop-blur-md z-20"
          role="alert"
          aria-live="polite"
        >
          <div className="flex items-start space-x-2 text-rose-200 min-w-0">
            <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 animate-bounce" />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-bold text-rose-300">Error on line {visibleError.line}</p>
                <span className="rounded-full border border-rose-400/40 bg-rose-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-rose-200">
                  Type: {visibleErrorType}
                </span>
              </div>
              <p className="mt-0.5 text-rose-100 break-words">{visibleError.message}</p>
            </div>
          </div>

          <div className="flex items-center space-x-2 flex-shrink-0">
            <button
              type="button"
              onClick={() => setLineChangeError(null)}
              title="Close error message"
              aria-label="Close error message"
              className="flex items-center gap-1 px-2.5 py-1 rounded border border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-slate-100 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              <span>Close</span>
            </button>

            {/* Auto Correct This Line Button */}
            <button
              id={`auto-correct-line-${visibleError.line}`}
              onClick={() => {
                onAutoCorrectLine(visibleError);
                setLineChangeError(null);
              }}
              className="flex items-center space-x-1.5 px-2.5 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white font-medium text-xs shadow transition-all active:scale-95"
            >
              <Wand2 className="w-3.5 h-3.5" />
              <span>Auto Correct Line</span>
            </button>

            {/* Self Correct Guide Button */}
            <button
              id={`self-correct-line-${visibleError.line}`}
              onClick={() => {
                onSelectError(visibleError);
              }}
              className="flex items-center space-x-1.5 px-2.5 py-1 rounded bg-indigo-600/80 hover:bg-indigo-500 text-indigo-100 font-medium text-xs border border-indigo-400/30 transition-all active:scale-95"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Self Correct Guide</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
