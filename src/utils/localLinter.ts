import { CodeError, Language } from "../types";

/**
 * Instant client-side linter that evaluates code line-by-line in 0ms.
 * Checks for bracket imbalance, unclosed strings, invalid keywords, JSON validity, Python missing colons, etc.
 */
export function runLocalLinter(code: string, language: Language): CodeError[] {
  const errors: CodeError[] = [];
  const lines = code.split("\n");

  // 1. Line-by-line basic checks
  lines.forEach((lineText, index) => {
    const lineNum = index + 1;
    const trimmed = lineText.trim();

    if (!trimmed || trimmed.startsWith("//") || trimmed.startsWith("#")) {
      return;
    }

    // Unclosed string literals on a single line
    let singleQuotes = 0;
    let doubleQuotes = 0;
    let backticks = 0;
    let escaped = false;

    for (let i = 0; i < lineText.length; i++) {
      const char = lineText[i];
      if (escaped) {
        escaped = false;
        continue;
      }
      if (char === "\\") {
        escaped = true;
        continue;
      }
      if (char === "'") singleQuotes++;
      if (char === '"') doubleQuotes++;
      if (char === "`") backticks++;
    }

    if (singleQuotes % 2 !== 0 && !lineText.includes("`") && language !== "python") {
      errors.push({
        id: `local-str-single-${lineNum}`,
        line: lineNum,
        severity: "error",
        category: "syntax",
        message: "Unclosed single quote (') on this line.",
        codeSnippet: lineText,
        suggestedFix: lineText + "'",
        source: "local",
        explanation: {
          whatIsWrong: "The string starting with a single quote was not closed before the line ended.",
          whyItHappened: "Strings in most languages cannot span across newlines without proper escapes or backticks.",
          howToFixStepByStep: [
            "Add a closing single quote ' at the end of the string.",
            "If you intended a multi-line string, use template backticks (`) or string concatenation."
          ],
          conceptTip: "Always pair opening quotes with a matching closing quote on the same line."
        }
      });
    } else if (doubleQuotes % 2 !== 0 && !lineText.includes("`")) {
      errors.push({
        id: `local-str-double-${lineNum}`,
        line: lineNum,
        severity: "error",
        category: "syntax",
        message: "Unclosed double quote (\") on this line.",
        codeSnippet: lineText,
        suggestedFix: lineText + '"',
        source: "local",
        explanation: {
          whatIsWrong: "Double quote (\") is missing a matching closing double quote.",
          whyItHappened: "A string literal was started but never terminated.",
          howToFixStepByStep: [
            "Add a matching double quote \" at the end of the string.",
            "Verify there are no unescaped quotes inside the string."
          ],
          conceptTip: "String literals require matching opening and closing quotation marks."
        }
      });
    }

    // Bracket checks for C-style control statements.
    if (["javascript", "typescript", "java", "c", "cpp"].includes(language)) {
      if (/\bfor\s*\([^)]*\{/.test(lineText) && !/\bfor\s*\([^)]*\)\s*\{/.test(lineText)) {
        errors.push({
          id: `local-for-paren-${lineNum}`,
          line: lineNum,
          severity: "error",
          category: "bracket",
          message: "Missing closing parenthesis ')' in for loop condition.",
          codeSnippet: lineText,
          suggestedFix: lineText.replace(/\{/, ") {"),
          source: "local",
          explanation: {
            whatIsWrong: "For loop condition is missing a closing parenthesis before the opening brace '{'.",
            whyItHappened: "JavaScript syntax requires loop conditions to be enclosed in parentheses `for (...)`.",
            howToFixStepByStep: [
              "Insert a closing parenthesis ')' after the loop control clauses.",
              "Ensure the block brace '{' follows the parenthesis."
            ],
            conceptTip: "In JavaScript/TypeScript, control structure conditions like if, for, while must end with ')'."
          }
        });
      }

      if (/\bif\s*\([^)]*\{/.test(lineText) && !/\bif\s*\([^)]*\)\s*\{/.test(lineText)) {
        errors.push({
          id: `local-if-paren-${lineNum}`,
          line: lineNum,
          severity: "error",
          category: "bracket",
          message: "Missing closing parenthesis ')' in if condition.",
          codeSnippet: lineText,
          suggestedFix: lineText.replace(/\{/, ") {"),
          source: "local",
          explanation: {
            whatIsWrong: "The 'if' statement condition is missing a closing parenthesis ')' before the block.",
            whyItHappened: "Syntax error: if conditions must be wrapped in `( condition )`.",
            howToFixStepByStep: [
              "Add ')' right after the conditional expression.",
              "Make sure the statement block starts with '{'."
            ],
            conceptTip: "Syntax rule: `if (condition) { statements }`."
          }
        });
      }

      // A lone closing parenthesis immediately after a completed statement is
      // almost always a previous auto-fix placed on the wrong line. For
      // example, `println("Hi";` followed by `)` must become `println("Hi");`.
      if (trimmed === ")") {
        const previousNonEmptyIndex = (() => {
          for (let previous = index - 1; previous >= 0; previous--) {
            if (lines[previous].trim()) return previous;
          }
          return -1;
        })();
        const previousLine = previousNonEmptyIndex >= 0 ? lines[previousNonEmptyIndex] : "";

        const statementBeforeSemicolon = previousLine.split(";", 1)[0];
        const hasUnclosedCall =
          (statementBeforeSemicolon.match(/\(/g) || []).length >
          (statementBeforeSemicolon.match(/\)/g) || []).length;

        if (/;\s*(?:\/\/.*)?$/.test(previousLine) && hasUnclosedCall) {
          errors.push({
            id: `local-misplaced-close-${lineNum}`,
            line: lineNum,
            severity: "error",
            category: "bracket",
            message: `Closing ')' belongs before the semicolon on line ${previousNonEmptyIndex + 1}.`,
            codeSnippet: lineText,
            suggestedFix: previousLine.replace(/;(?=\s*(?:\/\/.*)?$)/, ");"),
            source: "local",
            explanation: {
              whatIsWrong: "This closing parenthesis was placed on a separate line after the statement ended.",
              whyItHappened: "Method-call parentheses must close before the statement's final semicolon.",
              howToFixStepByStep: [
                "Move ')' to the end of the previous statement.",
                "Place it immediately before the semicolon.",
              ],
              conceptTip: "Use `method(arguments);`, not `method(arguments;` followed by `)`.",
            },
          });
        }
      }
    }

    // Java, C, and C++ require semicolons at the end of ordinary statements.
    // This deliberately ignores block/control lines so it can give immediate,
    // helpful feedback without waiting for an external compiler.
    if (["java", "c", "cpp"].includes(language)) {
      const isControlOrBlockLine =
        /^(if|for|while|switch|catch|else|try|do)\b/.test(trimmed) ||
        /^(public|private|protected)?\s*(static\s+)?(class|interface|enum|struct)\b/.test(trimmed) ||
        trimmed.startsWith("#") ||
        trimmed.startsWith("//") ||
        trimmed.startsWith("/*") ||
        trimmed.startsWith("*") ||
        trimmed.startsWith("}") ||
        trimmed === ")" ||
        trimmed === "]";
      const isFunctionSignature = /^(?:[A-Za-z_][\w:<>,\s*&]+)\s+[A-Za-z_]\w*\s*\([^)]*\)$/.test(trimmed);
      const hasStatementEnding = /[;{},:]$/.test(trimmed);

      if (!isControlOrBlockLine && !isFunctionSignature && !hasStatementEnding) {
        errors.push({
          id: `local-missing-semicolon-${language}-${lineNum}`,
          line: lineNum,
          severity: "error",
          category: "missing_symbol",
          message: `Missing semicolon ';' at the end of this ${language === "cpp" ? "C++" : language.toUpperCase()} statement.`,
          codeSnippet: lineText,
          suggestedFix: `${lineText};`,
          source: "local",
          explanation: {
            whatIsWrong: "This statement does not end with a semicolon.",
            whyItHappened: `${language === "java" ? "Java" : language === "cpp" ? "C++" : "C"} uses semicolons to mark the end of most statements.`,
            howToFixStepByStep: [
              "Place the cursor at the end of the statement.",
              "Add a semicolon ';' before moving to the next line.",
            ],
            conceptTip: "Block declarations use braces, but ordinary statements such as method calls, assignments, and return statements need semicolons.",
          },
        });
      }
    }

    // Python specific checks
    if (language === "python") {
      if (
        /^(def|if|elif|else|for|while|class|try|except|with|finally)\b/.test(trimmed) &&
        !trimmed.endsWith(":") &&
        !trimmed.includes("#")
      ) {
        errors.push({
          id: `local-py-colon-${lineNum}`,
          line: lineNum,
          severity: "error",
          category: "missing_symbol",
          message: "Missing colon ':' at the end of Python statement.",
          codeSnippet: lineText,
          suggestedFix: lineText + ":",
          source: "local",
          explanation: {
            whatIsWrong: "Python block headers (def, if, for, etc.) must end with a colon ':'.",
            whyItHappened: "Python uses colons to indicate the start of an indented code block.",
            howToFixStepByStep: [
              "Add a colon ':' at the end of the line.",
              "Ensure the following lines are indented by 4 spaces."
            ],
            conceptTip: "All compound statements in Python require a trailing colon before their indented block."
          }
        });
      }
    }

    // SQL specific checks
    if (language === "sql") {
      if (/\bSELECKT\b/i.test(lineText)) {
        errors.push({
          id: `local-sql-seleckt-${lineNum}`,
          line: lineNum,
          severity: "error",
          category: "syntax",
          message: "Typo in keyword: 'SELECKT' should be 'SELECT'.",
          codeSnippet: lineText,
          suggestedFix: lineText.replace(/SELECKT/i, "SELECT"),
          source: "local",
          explanation: {
            whatIsWrong: "Unrecognized SQL keyword 'SELECKT'.",
            whyItHappened: "Misspelled the primary SQL query keyword 'SELECT'.",
            howToFixStepByStep: ["Replace 'SELECKT' with 'SELECT'."],
            conceptTip: "SQL keywords must be spelled correctly (e.g. SELECT, FROM, WHERE, JOIN)."
          }
        });
      }
    }
  });

  // 2. Global Bracket/Brace Stack Matcher for the entire file
  const stack: { char: string; line: number; col: number }[] = [];
  for (let r = 0; r < lines.length; r++) {
    const line = lines[r];
    for (let c = 0; c < line.length; c++) {
      const char = line[c];
      if (char === "(" || char === "[" || char === "{") {
        stack.push({ char, line: r + 1, col: c + 1 });
      } else if (char === ")" || char === "]" || char === "}") {
        if (stack.length === 0) {
          errors.push({
            id: `local-unmatched-close-${r + 1}-${c}`,
            line: r + 1,
            column: c + 1,
            severity: "error",
            category: "bracket",
            message: `Unmatched closing bracket '${char}' with no opening match.`,
            codeSnippet: line,
            suggestedFix: line.slice(0, c) + line.slice(c + 1),
            source: "local",
            explanation: {
              whatIsWrong: `Found closing '${char}' without a corresponding opening bracket earlier in code.`,
              whyItHappened: "An extra bracket was typed or an opening bracket was deleted.",
              howToFixStepByStep: [
                `Remove the redundant closing '${char}'`,
                "Or add the matching opening bracket earlier in your code."
              ],
              conceptTip: "Brackets must always balance in pairs: (), [], {}."
            }
          });
        } else {
          const top = stack[stack.length - 1];
          const matches =
            (top.char === "(" && char === ")") ||
            (top.char === "[" && char === "]") ||
            (top.char === "{" && char === "}");
          if (matches) {
            stack.pop();
          } else {
            errors.push({
              id: `local-mismatched-bracket-${r + 1}`,
              line: r + 1,
              column: c + 1,
              severity: "error",
              category: "bracket",
              message: `Mismatched bracket: expected closing for '${top.char}' from line ${top.line}, but found '${char}'.`,
              codeSnippet: line,
              suggestedFix: line.slice(0, c) + (top.char === "(" ? ")" : top.char === "[" ? "]" : "}") + line.slice(c + 1),
              source: "local",
              explanation: {
                whatIsWrong: `Closing '${char}' does not match opening '${top.char}' from line ${top.line}.`,
                whyItHappened: "Interleaved or wrong type of bracket was used.",
                howToFixStepByStep: [
                  `Replace '${char}' with the correct matching bracket for '${top.char}'.`
                ],
                conceptTip: "Brackets must close in strict reverse order of how they were opened (LIFO)."
              }
            });
            stack.pop();
          }
        }
      }
    }
  }

  // If unclosed opening brackets remain at EOF
  if (stack.length > 0) {
    // Close the most recently opened item first. This preserves nesting when
    // more than one bracket is missing at the end of a file.
    [...stack].reverse().forEach((unclosed) => {
      const expectedClose = unclosed.char === "(" ? ")" : unclosed.char === "[" ? "]" : "}";
      // Only push if not already covered by line specific error
      if (!errors.some((e) => e.line === unclosed.line && e.category === "bracket")) {
        errors.push({
          id: `local-unclosed-open-${unclosed.line}`,
          line: unclosed.line,
          column: unclosed.col,
          severity: "error",
          category: "bracket",
          message: `Unclosed opening bracket '${unclosed.char}'. Missing '${expectedClose}'.`,
          codeSnippet: lines[unclosed.line - 1] || "",
          suggestedFix: (lines[unclosed.line - 1] || "") + expectedClose,
          source: "local",
          explanation: {
            whatIsWrong: `Opening '${unclosed.char}' on line ${unclosed.line} is never closed.`,
            whyItHappened: "Missing closing bracket before end of block or file.",
            howToFixStepByStep: [
              `Add '${expectedClose}' at the end of the block or line.`
            ],
            conceptTip: "Every opening bracket must have a matching closing bracket."
          }
        });
      }
    });
  }

  // 3. JSON Validation
  if (language === "json") {
    try {
      JSON.parse(code);
    } catch (err: any) {
      const msg = err.message || "Invalid JSON syntax.";
      let lineNum = 1;
      const match = msg.match(/at position (\d+)/) || msg.match(/line (\d+) column (\d+)/);
      if (match) {
        if (match[1] && !match[2]) {
          const pos = parseInt(match[1], 10);
          lineNum = code.substring(0, pos).split("\n").length;
        } else if (match[1]) {
          lineNum = parseInt(match[1], 10);
        }
      }
      if (!errors.some((e) => e.line === lineNum)) {
        errors.push({
          id: `local-json-parse-${lineNum}`,
          line: lineNum,
          severity: "error",
          category: "syntax",
          message: `JSON Syntax Error: ${msg}`,
          codeSnippet: lines[lineNum - 1] || "",
          suggestedFix: lines[lineNum - 1] || "",
          source: "local",
          explanation: {
            whatIsWrong: "The JSON document contains invalid syntax near this location.",
            whyItHappened: "Common causes: unquoted property keys, trailing commas, or single quotes.",
            howToFixStepByStep: [
              "Ensure all keys use double quotes \"likeThis\".",
              "Remove trailing commas after the last array/object item.",
              "Replace single quotes with double quotes."
            ],
            conceptTip: "JSON specifications require strict double quotes and forbid trailing commas."
          }
        });
      }
    }
  }

  return errors;
}

/**
 * Merges local instant errors and AI errors cleanly without duplicates on the same line.
 */
export function mergeErrors(localErrors: CodeError[], aiErrors: CodeError[]): CodeError[] {
  const mergedMap = new Map<number, CodeError>();

  // AI errors take precedence for deeper context, but keep local if no AI on line
  aiErrors.forEach((err) => {
    mergedMap.set(err.line, err);
  });

  localErrors.forEach((err) => {
    if (!mergedMap.has(err.line)) {
      mergedMap.set(err.line, err);
    }
  });

  return Array.from(mergedMap.values()).sort((a, b) => a.line - b.line);
}
