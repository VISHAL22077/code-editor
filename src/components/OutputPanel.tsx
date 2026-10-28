import React from "react";
import { CheckCircle2, CircleAlert, Terminal } from "lucide-react";

interface OutputPanelProps {
  output: string;
  isRunning: boolean;
  isError: boolean;
}

export const OutputPanel: React.FC<OutputPanelProps> = ({ output, isRunning, isError }) => {
  return (
    <section className="flex h-44 flex-shrink-0 flex-col overflow-hidden rounded-xl border border-slate-800 bg-slate-900 shadow-xl">
      <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950/70 px-4 py-2 text-xs">
        <div className="flex items-center gap-2 font-semibold text-slate-200">
          <Terminal className="h-4 w-4 text-indigo-400" />
          <span>OUTPUT</span>
        </div>
        {isRunning ? (
          <span className="text-amber-400">Compiling and running…</span>
        ) : output ? (
          <span className={`flex items-center gap-1.5 ${isError ? "text-rose-400" : "text-emerald-400"}`}>
            {isError ? <CircleAlert className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
            {isError ? "Failed" : "Completed"}
          </span>
        ) : (
          <span className="text-slate-500">Ready</span>
        )}
      </div>

      <pre className={`flex-1 overflow-auto whitespace-pre-wrap break-words p-4 font-mono text-xs leading-6 ${isError ? "text-rose-300" : "text-slate-300"}`}>
        {isRunning ? "Compiling and running your code…" : output || "Run valid code to see its output here."}
      </pre>
    </section>
  );
};
