import React from "react";
import {
  Wand2,
  Settings2,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Play,
  RotateCcw,
  BookOpen,
  Moon,
  Sun,
  FolderOpen,
  Save,
} from "lucide-react";
import { Language, CodePreset, EditorSettings } from "../types";
import { CODE_PRESETS } from "../data/presets";

interface HeaderProps {
  language: Language;
  onLanguageChange: (lang: Language) => void;
  selectedPreset: string;
  onSelectPreset: (preset: CodePreset) => void;
  errorCount: number;
  isAnalyzing: boolean;
  onAutoCorrectAll: () => void;
  onOpenSelfCorrectAll: () => void;
  onResetCode: () => void;
  onOpenSettings: () => void;
  settings: EditorSettings;
  onToggleTheme: () => void;
  onRunCode: () => void;
  canRunCode: boolean;
  isRunningCode: boolean;
  onOpenFile: () => void;
  onSaveFile: () => void;
}

const LANGUAGES: { id: Language; label: string; iconColor: string }[] = [
  { id: "javascript", label: "JavaScript (JS)", iconColor: "text-yellow-400" },
  { id: "python", label: "Python (PY)", iconColor: "text-emerald-400" },
  { id: "c", label: "C", iconColor: "text-sky-400" },
  { id: "cpp", label: "C++", iconColor: "text-indigo-400" },
  { id: "java", label: "Java", iconColor: "text-rose-400" },
];

const AVAILABLE_PRESETS = CODE_PRESETS.filter((preset) =>
  LANGUAGES.some((language) => language.id === preset.language),
);

export const Header: React.FC<HeaderProps> = ({
  language,
  onLanguageChange,
  selectedPreset,
  onSelectPreset,
  errorCount,
  isAnalyzing,
  onAutoCorrectAll,
  onOpenSelfCorrectAll,
  onResetCode,
  onOpenSettings,
  settings,
  onToggleTheme,
  onRunCode,
  canRunCode,
  isRunningCode,
  onOpenFile,
  onSaveFile,
}) => {
  return (
    <header className="app-header bg-slate-900 border-b border-slate-800 text-slate-100 px-4 py-3 flex flex-wrap items-center justify-between gap-3 shadow-md select-none sticky top-0 z-30">
      {/* App Branding */}
      <div className="flex items-center space-x-3">
        <div className="app-logo p-2 rounded-xl shadow-lg shadow-black/30 flex items-center justify-center" aria-label="SyntaxFix logo">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Brain outline */}
            <path d="M9 3C7.5 3 6 4 5.5 5.5C4.5 5.5 3 6.5 3 8C3 9 3.5 9.8 4.5 10.3C4.2 10.8 4 11.4 4 12C4 13.1 4.5 14 5.5 14.5C5.5 15.8 6.5 17 8 17.3V20H10V17.3C10.6 17.1 11.1 16.8 11.5 16.4" stroke="white" strokeWidth="1.3" strokeLinecap="round"/>
            <path d="M15 3C16.5 3 18 4 18.5 5.5C19.5 5.5 21 6.5 21 8C21 9 20.5 9.8 19.5 10.3C19.8 10.8 20 11.4 20 12C20 13.1 19.5 14 18.5 14.5C18.5 15.8 17.5 17 16 17.3V20H14V17.3C13.4 17.1 12.9 16.8 12.5 16.4" stroke="white" strokeWidth="1.3" strokeLinecap="round"/>
            {/* Center divider */}
            <line x1="12" y1="3.5" x2="12" y2="17" stroke="white" strokeWidth="1" strokeDasharray="1.5 1.5" strokeLinecap="round" opacity="0.6"/>
            {/* Circuit nodes */}
            <circle cx="7.5" cy="8" r="1" fill="#93c5fd"/>
            <circle cx="16.5" cy="8" r="1" fill="#93c5fd"/>
            <circle cx="7" cy="12" r="1" fill="#c4b5fd"/>
            <circle cx="17" cy="12" r="1" fill="#c4b5fd"/>
            <circle cx="12" cy="7" r="1" fill="white"/>
            <circle cx="12" cy="13" r="1" fill="white"/>
            {/* Connection lines */}
            <line x1="7.5" y1="8" x2="12" y2="7" stroke="#93c5fd" strokeWidth="0.8" opacity="0.7"/>
            <line x1="16.5" y1="8" x2="12" y2="7" stroke="#93c5fd" strokeWidth="0.8" opacity="0.7"/>
            <line x1="7" y1="12" x2="12" y2="13" stroke="#c4b5fd" strokeWidth="0.8" opacity="0.7"/>
            <line x1="17" y1="12" x2="12" y2="13" stroke="#c4b5fd" strokeWidth="0.8" opacity="0.7"/>
          </svg>
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="app-title font-bold text-lg tracking-tight">
              SyntaxFix
            </h1>
            <span className="text-[10px] font-semibold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded-full">
              Real-time AI Linter
            </span>
          </div>
          <p className="text-xs text-slate-400 hidden sm:block">
            Instant line-by-line syntax error detection &amp; smart auto/self correction
          </p>
        </div>
      </div>

      {/* Language & Preset Controls */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Language Selector */}
        <div className="relative">
          <select
            id="language-select"
            value={language}
            onChange={(e) => onLanguageChange(e.target.value as Language)}
            aria-label="Select Programming Language"
            className="bg-slate-800/90 hover:bg-slate-800 text-slate-200 text-xs font-medium rounded-lg px-3 py-1.5 border border-slate-700/80 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all cursor-pointer"
          >
            {LANGUAGES.map((lang) => (
              <option key={lang.id} value={lang.id} className="bg-slate-900 text-slate-200">
                {lang.label}
              </option>
            ))}
          </select>
        </div>

        {/* Buggy Sample Presets */}
        <div className="relative">
          <select
            id="preset-select"
            value={selectedPreset}
            aria-label="Load Sample Code with Syntax Bugs"
            onChange={(e) => {
              const preset = CODE_PRESETS.find((p) => p.id === e.target.value);
              if (preset) onSelectPreset(preset);
            }}
            className="bg-slate-800/90 hover:bg-slate-800 text-indigo-300 text-xs font-medium rounded-lg px-3 py-1.5 border border-indigo-500/30 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all cursor-pointer max-w-[180px] sm:max-w-[220px] truncate"
          >
            <option value="" disabled className="bg-slate-900 text-slate-400">
              Load Buggy Preset...
            </option>
            {AVAILABLE_PRESETS.map((preset) => (
              <option key={preset.id} value={preset.id} className="bg-slate-900 text-slate-200">
                {preset.name}
              </option>
            ))}
          </select>
        </div>

        {/* Reset Code */}
        <button
          id="reset-code-button"
          onClick={onResetCode}
          title="Reset or Clear Code"
          className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors border border-slate-800"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        {/* Open File */}
        <button
          id="open-file-btn"
          onClick={onOpenFile}
          title="Open File from Computer"
          className="flex items-center space-x-1.5 text-xs font-medium px-2.5 py-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors border border-slate-700/60"
        >
          <FolderOpen className="w-4 h-4 text-amber-400" />
          <span className="hidden sm:inline">Open</span>
        </button>

        {/* Save File */}
        <button
          id="save-file-btn"
          onClick={onSaveFile}
          title="Save File to Computer"
          className="flex items-center space-x-1.5 text-xs font-medium px-2.5 py-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors border border-slate-700/60"
        >
          <Save className="w-4 h-4 text-emerald-400" />
          <span className="hidden sm:inline">Save</span>
        </button>
      </div>

      {/* Analysis Status & Action Buttons */}
      <div className="flex items-center space-x-2">
        {/* Status Indicator Badge */}
        <div className="flex items-center px-2.5 py-1 rounded-full text-xs font-medium border bg-slate-800/80 transition-all">
          {isAnalyzing ? (
            <span className="flex items-center text-amber-400 space-x-1.5">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span className="hidden md:inline">Analyzing Code...</span>
            </span>
          ) : errorCount > 0 ? (
            <span className="flex items-center text-rose-400 space-x-1.5">
              <AlertTriangle className="w-3.5 h-3.5 animate-pulse" />
              <span>
                {errorCount} {errorCount === 1 ? "Error" : "Errors"}
              </span>
            </span>
          ) : (
            <span className="flex items-center text-emerald-400 space-x-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Syntax Clean</span>
            </span>
          )}
        </div>

        {/* Self Correct Mode Button */}
        {errorCount > 0 && (
          <button
            id="self-correct-all-btn"
            onClick={onOpenSelfCorrectAll}
            className="hidden lg:flex items-center space-x-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-indigo-500/40 transition-all active:scale-95 shadow-sm"
          >
            <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
            <span>Self Correct Guide</span>
          </button>
        )}

        {/* Auto Correct All Primary Action */}
        <button
          id="run-code-btn"
          onClick={onRunCode}
          disabled={!canRunCode || isRunningCode}
          className={`flex items-center space-x-1.5 text-xs font-bold px-3.5 py-1.5 rounded-lg shadow-md transition-all active:scale-95 ${
            canRunCode && !isRunningCode
              ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30 cursor-pointer"
              : "bg-slate-800 text-slate-500 border border-slate-700/50 cursor-not-allowed opacity-60"
          }`}
        >
          <Play className={`w-3.5 h-3.5 ${isRunningCode ? "animate-pulse" : ""}`} />
          <span>{isRunningCode ? "Running…" : "Run Code"}</span>
        </button>

        <button
          id="auto-correct-all-btn"
          onClick={onAutoCorrectAll}
          disabled={errorCount === 0 && !isAnalyzing}
          className={`flex items-center space-x-1.5 text-xs font-bold px-3.5 py-1.5 rounded-lg shadow-md transition-all active:scale-95 ${
            errorCount > 0
              ? "bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white shadow-indigo-600/30 cursor-pointer"
              : "bg-slate-800 text-slate-500 border border-slate-700/50 cursor-not-allowed opacity-60"
          }`}
        >
          <Wand2 className="w-3.5 h-3.5" />
          <span>Auto Correct All</span>
          {errorCount > 0 && (
            <span className="ml-1 px-1.5 py-0.2 bg-white/20 text-white text-[10px] rounded-full">
              {errorCount}
            </span>
          )}
        </button>

        {/* Settings Toggle */}
        <button
          id="theme-toggle-btn"
          onClick={onToggleTheme}
          title={`Switch to ${settings.theme === "dark" ? "light" : "dark"} mode`}
          aria-label={`Switch to ${settings.theme === "dark" ? "light" : "dark"} mode`}
          className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors border border-slate-800"
        >
          {settings.theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        <button
          id="open-settings-btn"
          onClick={onOpenSettings}
          title="Editor Settings"
          className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors border border-slate-800"
        >
          <Settings2 className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
