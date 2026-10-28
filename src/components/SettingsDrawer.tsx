import React from "react";
import { EditorSettings } from "../types";
import { X, Sliders, Type, Clock, Zap, Eye, Moon, Sun } from "lucide-react";

interface SettingsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  settings: EditorSettings;
  onUpdateSettings: (newSettings: Partial<EditorSettings>) => void;
}

export const SettingsDrawer: React.FC<SettingsDrawerProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex justify-end">
      <div className="bg-slate-900 border-l border-slate-800 w-full max-w-sm h-full flex flex-col p-6 shadow-2xl animate-in slide-in-from-right duration-200 text-slate-100">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <Sliders className="w-5 h-5 text-indigo-400" />
            <h3 className="font-bold text-base text-slate-100">Editor Settings</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-6 space-y-6 text-xs">
          {/* Theme */}
          <div className="space-y-2">
            <label className="font-semibold text-slate-300 flex items-center space-x-2">
              {settings.theme === "dark" ? <Moon className="w-4 h-4 text-slate-400" /> : <Sun className="w-4 h-4 text-amber-400" />}
              <span>Appearance</span>
            </label>
            <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-800/70 p-1 border border-slate-700/70">
              {(["dark", "light"] as const).map((theme) => {
                const isActive = settings.theme === theme;
                return (
                  <button
                    key={theme}
                    onClick={() => onUpdateSettings({ theme })}
                    className={`flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 font-semibold capitalize transition-colors ${
                      isActive ? "bg-indigo-600 text-white shadow-sm" : "text-slate-400 hover:bg-slate-700 hover:text-slate-200"
                    }`}
                  >
                    {theme === "dark" ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
                    {theme}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Font Size */}
          <div className="space-y-2">
            <label className="font-semibold text-slate-300 flex items-center justify-between">
              <span className="flex items-center space-x-2">
                <Type className="w-4 h-4 text-slate-400" />
                <span>Font Size</span>
              </span>
              <span className="text-indigo-400 font-mono">{settings.fontSize}px</span>
            </label>
            <input
              type="range"
              min="12"
              max="22"
              value={settings.fontSize}
              onChange={(e) => onUpdateSettings({ fontSize: parseInt(e.target.value, 10) })}
              className="w-full accent-indigo-500 cursor-pointer"
            />
          </div>

          {/* Real-time Analysis Debounce Speed */}
          <div className="space-y-2">
            <label className="font-semibold text-slate-300 flex items-center justify-between">
              <span className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-slate-400" />
                <span>AI Analysis Pause Speed</span>
              </span>
              <span className="text-indigo-400 font-mono">{settings.debounceMs}ms</span>
            </label>
            <input
              type="range"
              min="200"
              max="1500"
              step="100"
              value={settings.debounceMs}
              onChange={(e) => onUpdateSettings({ debounceMs: parseInt(e.target.value, 10) })}
              className="w-full accent-indigo-500 cursor-pointer"
            />
            <p className="text-[11px] text-slate-500">
              Triggers real-time AI syntax analysis after you stop typing for this duration.
            </p>
          </div>

          {/* Show Line Numbers Toggle */}
          <div className="flex items-center justify-between pt-2">
            <span className="font-semibold text-slate-300 flex items-center space-x-2">
              <Eye className="w-4 h-4 text-slate-400" />
              <span>Show Line Numbers</span>
            </span>
            <input
              type="checkbox"
              checked={settings.showLineNumbers}
              onChange={(e) => onUpdateSettings({ showLineNumbers: e.target.checked })}
              className="w-4 h-4 accent-indigo-500 cursor-pointer rounded"
            />
          </div>

          {/* Live Auto-Fix on Pause Toggle */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-800">
            <div>
              <span className="font-semibold text-slate-300 flex items-center space-x-2">
                <Zap className="w-4 h-4 text-amber-400" />
                <span>Live Auto-Correct</span>
              </span>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Automatically fix simple syntax bugs as you pause typing.
              </p>
            </div>
            <input
              type="checkbox"
              checked={settings.liveAutoFix}
              onChange={(e) => onUpdateSettings({ liveAutoFix: e.target.checked })}
              className="w-4 h-4 accent-indigo-500 cursor-pointer rounded"
            />
          </div>
        </div>

        <div className="pt-4 border-t border-slate-800">
          <button
            onClick={onClose}
            className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-semibold transition-colors text-xs"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
