import React, { useState } from "react";
import { CodeError } from "../types";
import {
  BookOpen,
  CheckCircle2,
  HelpCircle,
  Lightbulb,
  Wand2,
  X,
  ChevronRight,
  ArrowRight,
  CheckSquare,
  Square,
  Sparkles,
} from "lucide-react";

interface SelfCorrectPanelProps {
  error: CodeError;
  onClose: () => void;
  onAutoCorrectLine: (error: CodeError) => void;
  onApplyManualFix: (lineNum: number, fixedLine: string) => void;
}

export const SelfCorrectPanel: React.FC<SelfCorrectPanelProps> = ({
  error,
  onClose,
  onAutoCorrectLine,
  onApplyManualFix,
}) => {
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [userAttemptCode, setUserAttemptCode] = useState(error.codeSnippet);
  const [showSolutionHint, setShowSolutionHint] = useState(false);
  const [fixSuccess, setFixSuccess] = useState(false);

  const steps = error.explanation.howToFixStepByStep || [
    "Identify the missing or invalid syntax symbol.",
    "Edit line content to follow language rules.",
    "Verify closing brackets/quotes match."
  ];

  const toggleStep = (index: number) => {
    if (completedSteps.includes(index)) {
      setCompletedSteps(completedSteps.filter((i) => i !== index));
    } else {
      setCompletedSteps([...completedSteps, index]);
    }
  };

  const handleTestFix = () => {
    if (userAttemptCode.trim() === error.suggestedFix.trim() || userAttemptCode.trim().length > 0) {
      setFixSuccess(true);
      onApplyManualFix(error.line, userAttemptCode);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-900/95 border-l border-indigo-500/30 text-slate-100 overflow-y-auto font-sans p-5 shadow-2xl backdrop-blur-lg">
      {/* Panel Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div className="flex items-center space-x-2">
          <div className="p-2 rounded-lg bg-indigo-500/20 border border-indigo-500/30 text-indigo-300">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-bold text-base text-slate-100">
              Self Correction Guide
            </h2>
            <p className="text-xs text-indigo-300 font-medium">
              Line {error.line} • {error.category.toUpperCase()} ERROR
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Code Snippet Comparison Box */}
      <div className="my-4 bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-xs space-y-3">
        <div>
          <div className="text-[10px] uppercase font-bold text-rose-400 mb-1 flex items-center justify-between">
            <span>Current Line {error.line} (Broken)</span>
          </div>
          <div className="bg-rose-950/40 p-2.5 rounded border border-rose-500/30 text-rose-200">
            {error.codeSnippet}
          </div>
        </div>

        <div>
          <div className="text-[10px] uppercase font-bold text-emerald-400 mb-1 flex items-center justify-between">
            <span>Target Correction</span>
            <button
              onClick={() => setShowSolutionHint(!showSolutionHint)}
              className="text-[10px] font-sans text-indigo-400 hover:underline"
            >
              {showSolutionHint ? "Hide Hint" : "Reveal Solution"}
            </button>
          </div>
          <div className="bg-emerald-950/30 p-2.5 rounded border border-emerald-500/30 text-emerald-300">
            {showSolutionHint ? error.suggestedFix : "•••••••••••••••••••••••••••••••••"}
          </div>
        </div>
      </div>

      {/* Deep Error Explanation */}
      <div className="space-y-4 mb-6">
        {/* What Went Wrong */}
        <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700/80 space-y-1.5">
          <div className="flex items-center space-x-2 text-indigo-300 font-semibold text-xs uppercase tracking-wider">
            <HelpCircle className="w-4 h-4 text-indigo-400" />
            <span>What Went Wrong</span>
          </div>
          <p className="text-xs text-slate-200 leading-relaxed font-normal">
            {error.explanation.whatIsWrong}
          </p>
        </div>

        {/* Why It Happened */}
        <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700/80 space-y-1.5">
          <div className="flex items-center space-x-2 text-indigo-300 font-semibold text-xs uppercase tracking-wider">
            <Lightbulb className="w-4 h-4 text-amber-400" />
            <span>Why Syntax Rules Enforce This</span>
          </div>
          <p className="text-xs text-slate-200 leading-relaxed font-normal">
            {error.explanation.whyItHappened}
          </p>
        </div>

        {/* Concept Tip */}
        {error.explanation.conceptTip && (
          <div className="bg-indigo-950/40 p-3.5 rounded-xl border border-indigo-500/30 text-xs text-indigo-200 flex items-start space-x-2.5">
            <Sparkles className="w-4 h-4 text-indigo-400 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block text-indigo-300 mb-0.5">
                Pro Concept Rule
              </span>
              <p className="text-slate-300 leading-relaxed">
                {error.explanation.conceptTip}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Guided Step-by-Step Fix Checklist */}
      <div className="mb-6 bg-slate-800/50 p-4 rounded-xl border border-slate-700/60">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-3 flex items-center justify-between">
          <span>Step-by-Step Fix Checklist</span>
          <span className="text-indigo-400 text-[11px]">
            {completedSteps.length}/{steps.length} completed
          </span>
        </h3>

        <div className="space-y-2">
          {steps.map((stepText, idx) => {
            const isDone = completedSteps.includes(idx);
            return (
              <div
                key={idx}
                onClick={() => toggleStep(idx)}
                className={`p-2.5 rounded-lg border text-xs flex items-start space-x-2.5 cursor-pointer transition-all ${
                  isDone
                    ? "bg-emerald-950/30 border-emerald-500/40 text-emerald-200"
                    : "bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700"
                }`}
              >
                {isDone ? (
                  <CheckSquare className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                ) : (
                  <Square className="w-4 h-4 text-slate-500 flex-shrink-0 mt-0.5" />
                )}
                <span className={isDone ? "line-through text-slate-400" : ""}>
                  {stepText}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Interactive Try-It-Yourself Practice Box */}
      <div className="bg-slate-950 p-4 rounded-xl border border-indigo-500/30 mb-6 space-y-3">
        <h4 className="text-xs font-bold text-indigo-300 flex items-center justify-between">
          <span>Try Self-Fixing Line {error.line}</span>
        </h4>

        <textarea
          value={userAttemptCode}
          onChange={(e) => {
            setUserAttemptCode(e.target.value);
            setFixSuccess(false);
          }}
          rows={2}
          className="w-full bg-slate-900 text-xs font-mono text-slate-100 p-2.5 rounded-lg border border-slate-700 focus:outline-none focus:border-indigo-500"
          placeholder="Edit line to fix error..."
        />

        <div className="flex items-center justify-between">
          <button
            onClick={handleTestFix}
            className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md transition-all active:scale-95 flex items-center space-x-1.5"
          >
            <span>Apply My Solution</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>

          {fixSuccess && (
            <span className="text-xs font-bold text-emerald-400 flex items-center space-x-1 animate-pulse">
              <CheckCircle2 className="w-4 h-4" />
              <span>Fix Applied to Editor!</span>
            </span>
          )}
        </div>
      </div>

      {/* Fallback Auto Correct Button */}
      <div className="mt-auto pt-4 border-t border-slate-800 flex items-center justify-between">
        <span className="text-xs text-slate-400">Prefer instant correction?</span>
        <button
          onClick={() => onAutoCorrectLine(error)}
          className="flex items-center space-x-1.5 text-xs font-bold px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white shadow transition-all active:scale-95"
        >
          <Wand2 className="w-3.5 h-3.5" />
          <span>Auto Correct Line</span>
        </button>
      </div>
    </div>
  );
};
