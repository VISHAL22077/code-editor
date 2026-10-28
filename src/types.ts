export type Language =
  | "javascript"
  | "typescript"
  | "python"
  | "html"
  | "css"
  | "json"
  | "sql"
  | "c"
  | "cpp"
  | "java";

export type Severity = "error" | "warning" | "info";

export type Category =
  | "syntax"
  | "bracket"
  | "missing_symbol"
  | "indentation"
  | "type"
  | "semantic";

export interface CodeExplanation {
  whatIsWrong: string;
  whyItHappened: string;
  howToFixStepByStep: string[];
  conceptTip: string;
}

export interface CodeError {
  id: string;
  line: number; // 1-indexed
  column?: number;
  severity: Severity;
  category: Category;
  message: string;
  codeSnippet: string;
  suggestedFix: string;
  explanation: CodeExplanation;
  source?: "local" | "ai";
}

export interface CodePreset {
  id: string;
  name: string;
  language: Language;
  description: string;
  code: string;
}

export interface AnalysisResult {
  errors: CodeError[];
  fullFixedCode: string;
  summary: string;
}

export interface EditorSettings {
  fontSize: number;
  showLineNumbers: boolean;
  debounceMs: number;
  liveAutoFix: boolean;
  theme: "dark" | "light";
}
