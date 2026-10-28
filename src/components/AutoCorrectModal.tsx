import React from "react";
import { Wand2, Check, X, ArrowRight, ShieldCheck } from "lucide-react";

interface AutoCorrectModalProps {
  isOpen: boolean;
  onClose: () => void;
  originalCode: string;
  correctedCode: string;
  errorCount: number;
  onConfirmApply: () => void;
}

export const AutoCorrectModal: React.FC<AutoCorrectModalProps> = ({
  isOpen,
  onClose,
  originalCode,
  correctedCode,
  errorCount,
  onConfirmApply,
}) => {
  if (!isOpen) return null;

  const originalLines = originalCode.split("\n");
  const correctedLines = correctedCode.split("\n");

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
              <Wand2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-100">
                Auto-Correct Preview
              </h3>
              <p className="text-xs text-slate-400">
                Review automated syntax fixes before applying ({errorCount} issues detected)
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Diff Comparison Body */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs">
          {/* Before Column */}
          <div className="bg-slate-950 p-4 rounded-xl border border-rose-500/30 flex flex-col">
            <div className="text-rose-400 font-sans font-bold text-xs mb-3 flex items-center justify-between border-b border-slate-800 pb-2">
              <span>Original (With Errors)</span>
              <span className="text-[10px] bg-rose-950 px-2 py-0.5 rounded text-rose-300">
                Broken
              </span>
            </div>
            <pre className="flex-1 text-slate-300 whitespace-pre-wrap overflow-x-auto leading-6">
              {originalLines.map((line, idx) => (
                <div key={idx} className="hover:bg-slate-900/50 px-1 rounded">
                  <span className="text-slate-600 mr-3 select-none">{idx + 1}</span>
                  {line}
                </div>
              ))}
            </pre>
          </div>

          {/* After Column */}
          <div className="bg-slate-950 p-4 rounded-xl border border-emerald-500/30 flex flex-col">
            <div className="text-emerald-400 font-sans font-bold text-xs mb-3 flex items-center justify-between border-b border-slate-800 pb-2">
              <span>Auto-Corrected Code</span>
              <span className="text-[10px] bg-emerald-950 px-2 py-0.5 rounded text-emerald-300">
                Fixed
              </span>
            </div>
            <pre className="flex-1 text-slate-200 whitespace-pre-wrap overflow-x-auto leading-6">
              {correctedLines.map((line, idx) => (
                <div key={idx} className="hover:bg-slate-900/50 px-1 rounded">
                  <span className="text-slate-600 mr-3 select-none">{idx + 1}</span>
                  {line}
                </div>
              ))}
            </pre>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2 text-xs text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Comments &amp; logic structure preserved</span>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                onConfirmApply();
                onClose();
              }}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white shadow-lg shadow-indigo-600/30 flex items-center space-x-2 transition-all active:scale-95"
            >
              <Check className="w-4 h-4" />
              <span>Apply All Corrections</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
