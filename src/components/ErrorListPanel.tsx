import React, { useState } from "react";
import { CodeError } from "../types";
import {
  AlertCircle,
  AlertTriangle,
  Info,
  Wand2,
  BookOpen,
  Search,
  CheckCircle2,
  ChevronRight,
  Filter,
  Sparkles,
} from "lucide-react";

interface ErrorListPanelProps {
  errors: CodeError[];
  selectedErrorId?: string | null;
  onSelectError: (error: CodeError) => void;
  onAutoCorrectLine: (error: CodeError) => void;
  onAutoCorrectAll: () => void;
  isAnalyzing: boolean;
}

export const ErrorListPanel: React.FC<ErrorListPanelProps> = ({
  errors,
  selectedErrorId,
  onSelectError,
  onAutoCorrectLine,
  onAutoCorrectAll,
  isAnalyzing,
}) => {
  const [filterSeverity, setFilterSeverity] = useState<"all" | "error" | "warning">("all");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredErrors = errors.filter((err) => {
    if (filterSeverity !== "all" && err.severity !== filterSeverity) {
      return false;
    }
    if (searchQuery.trim() !== "") {
      const q = searchQuery.toLowerCase();
      return (
        err.message.toLowerCase().includes(q) ||
        err.codeSnippet.toLowerCase().includes(q) ||
        `line ${err.line}`.includes(q)
      );
    }
    return true;
  });

  const errorCount = errors.filter((e) => e.severity === "error").length;
  const warningCount = errors.filter((e) => e.severity === "warning").length;

  return (
    <div className="flex flex-col h-full bg-slate-900 border-l border-slate-800/80 text-slate-100 overflow-hidden">
      {/* Panel Title & Summary Header */}
      <div className="p-4 bg-slate-950/60 border-b border-slate-800/80 select-none">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            <h2 className="font-bold text-sm tracking-wide text-slate-200">
              Detected Syntax Issues
            </h2>
          </div>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
            {errors.length} {errors.length === 1 ? "Issue" : "Issues"}
          </span>
        </div>

        {/* Filter Bar & Search */}
        <div className="flex items-center space-x-2">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-500" />
            <input
              type="text"
              placeholder="Search error or line..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-800/90 text-xs text-slate-200 pl-8 pr-3 py-1.5 rounded-lg border border-slate-700/60 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          {/* Severity Filter Tabs */}
          <div className="flex bg-slate-800 p-0.5 rounded-lg text-xs font-medium border border-slate-700/60">
            <button
              onClick={() => setFilterSeverity("all")}
              className={`px-2 py-1 rounded ${
                filterSeverity === "all"
                  ? "bg-slate-700 text-slate-100 shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilterSeverity("error")}
              className={`px-2 py-1 rounded flex items-center space-x-1 ${
                filterSeverity === "error"
                  ? "bg-rose-950 text-rose-300 border border-rose-500/40"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <span>Errors</span>
              {errorCount > 0 && <span className="text-[10px]">({errorCount})</span>}
            </button>
          </div>
        </div>
      </div>

      {/* Error Cards List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5 font-sans">
        {isAnalyzing && errors.length === 0 ? (
          <div className="py-12 text-center text-slate-400 space-y-3">
            <div className="inline-block p-3 rounded-full bg-slate-800 text-indigo-400 animate-spin">
              <Sparkles className="w-6 h-6" />
            </div>
            <p className="text-xs">Analyzing code syntax line-by-line...</p>
          </div>
        ) : errors.length === 0 ? (
          <div className="py-12 text-center text-slate-400 space-y-3 border border-dashed border-slate-800 rounded-xl p-6 bg-slate-950/30">
            <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
            <h3 className="font-semibold text-slate-200 text-sm">No Syntax Errors Found!</h3>
            <p className="text-xs text-slate-400 leading-relaxed max-w-xs mx-auto">
              Your code syntax is clean. As you type new lines, SyntaxFix will check for errors in real time.
            </p>
          </div>
        ) : filteredErrors.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-xs">
            No issues match your current filter.
          </div>
        ) : (
          filteredErrors.map((err) => {
            const isSelected = selectedErrorId === err.id;

            return (
              <div
                key={err.id}
                onClick={() => onSelectError(err)}
                className={`p-3 rounded-xl border transition-all cursor-pointer group relative ${
                  isSelected
                    ? "bg-slate-800/95 border-indigo-500 shadow-lg shadow-indigo-500/10 ring-1 ring-indigo-500/30"
                    : "bg-slate-800/50 hover:bg-slate-800 border-slate-700/60 hover:border-slate-600"
                }`}
              >
                {/* Header Badge */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <span className="flex items-center space-x-1 text-xs font-bold px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                      <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                      <span>Line {err.line}</span>
                    </span>

                    <span className="text-[10px] uppercase font-semibold text-slate-400 bg-slate-900/80 px-2 py-0.5 rounded border border-slate-700">
                      {err.category}
                    </span>
                  </div>

                  <ChevronRight
                    className={`w-4 h-4 text-slate-500 transition-transform ${
                      isSelected ? "rotate-90 text-indigo-400" : "group-hover:translate-x-0.5"
                    }`}
                  />
                </div>

                {/* Error Message */}
                <p className="text-xs font-medium text-slate-200 mb-2 leading-snug">
                  {err.message}
                </p>

                {/* Code Snippet Box */}
                {err.codeSnippet && (
                  <div className="bg-slate-950/80 p-2 rounded-lg border border-slate-800 font-mono text-[11px] text-slate-300 mb-2 overflow-x-auto">
                    <span className="text-slate-500 mr-2 select-none">{err.line}|</span>
                    <span className="text-rose-300 font-semibold">{err.codeSnippet}</span>
                  </div>
                )}

                {/* Quick Fix Preview */}
                {err.suggestedFix && (
                  <div className="text-[11px] text-emerald-400 bg-emerald-950/30 p-1.5 rounded border border-emerald-500/20 mb-2.5 font-mono truncate">
                    <span className="text-emerald-500 font-sans font-bold mr-1">Fix:</span>
                    {err.suggestedFix}
                  </div>
                )}

                {/* Action Buttons: Auto Correct Line & Self Correct */}
                <div className="flex items-center justify-end space-x-2 pt-1 border-t border-slate-700/40">
                  <button
                    id={`btn-autofix-${err.id}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onAutoCorrectLine(err);
                    }}
                    className="flex items-center space-x-1 text-[11px] font-semibold px-2.5 py-1 rounded-md bg-rose-600 hover:bg-rose-500 text-white shadow-sm transition-all active:scale-95"
                  >
                    <Wand2 className="w-3 h-3" />
                    <span>Auto Correct</span>
                  </button>

                  <button
                    id={`btn-selfcorrect-${err.id}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectError(err);
                    }}
                    className="flex items-center space-x-1 text-[11px] font-medium px-2.5 py-1 rounded-md bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 transition-all"
                  >
                    <BookOpen className="w-3 h-3" />
                    <span>Self Correct</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer Auto Correct All Banner */}
      {errors.length > 0 && (
        <div className="p-3 bg-slate-950/90 border-t border-slate-800 flex items-center justify-between">
          <div className="text-xs text-slate-400">
            <span>Fix all {errors.length} errors instantly</span>
          </div>
          <button
            id="panel-autofix-all"
            onClick={onAutoCorrectAll}
            className="flex items-center space-x-1.5 text-xs font-bold px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30 transition-all active:scale-95"
          >
            <Wand2 className="w-3.5 h-3.5" />
            <span>Fix All ({errors.length})</span>
          </button>
        </div>
      )}
    </div>
  );
};
