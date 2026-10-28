import { CodePreset } from "../types";

export const CODE_PRESETS: CodePreset[] = [
  {
    id: "js-syntax-bugs",
    name: "JavaScript: Syntax & Bracket Errors",
    language: "javascript",
    description: "Contains missing closing braces, syntax typos, and unclosed strings.",
    code: `function calculateTotal(items) {
  let total = 0;
  for (let i = 0; i < items.length; i++ {
    const item = items[i];
    if (item.price > 0 {
      total += item.price * item.quantity;
    }
  }
  
  const userGreeting = "Welcome back, " + userName;
  console.log("Total calculated successfully;

  return total;
}

const items = [{ name: "Laptop", price: 999, quantity: 2 ];
calculateTotal(items);`
  },
  {
    id: "python-indent-colon",
    name: "Python: Missing Colons & Indentation",
    language: "python",
    description: "Contains missing colons on if/for statements and invalid indentation.",
    code: `def process_user_data(users):
    valid_users = []
    for user in users
        if user.get("active") == True
        print(f"Processing user: {user['name']}")
        valid_users.append(user)
    
    return valid_users

users_list = [{"name": "Alice", "active": True}, {"name": "Bob", "active": False}]
result = process_user_data(users_list)`
  },
  {
    id: "ts-type-syntax",
    name: "TypeScript: Type & Syntax Errors",
    language: "typescript",
    description: "Type definition syntax errors, missing commas, and invalid arrow function syntax.",
    code: `interface UserProfile {
  id: number
  username: string
  role: "admin" | "user"
  permissions: string[]
}

const fetchUser = async (id: number): Promise<UserProfile> => {
  const response = await fetch('/api/users/' + id;
  const data = await response.json();
  
  const user = {
    id: data.id,
    username: data.username,
    role: "admin"
    permissions: ["read", "write"]
  };

  return user;
};`
  },
  {
    id: "json-broken-syntax",
    name: "JSON: Missing Quotes & Trailing Commas",
    language: "json",
    description: "Invalid JSON syntax with missing quotes around keys and trailing commas.",
    code: `{
  "name": "SyntaxFix Config",
  "version": "1.0.0",
  "settings": {
    "autoSave": true,
    "theme": "dark",
    "languages": ["javascript", "python", "typescript"],
  },
  description: "Configuration object",
  "active": true
}`
  },
  {
    id: "html-unclosed-tags",
    name: "HTML: Unclosed Tags & Mismatched Attributes",
    language: "html",
    description: "Missing closing tags, invalid attribute syntax, and unclosed divs.",
    code: `<div class="container">
  <header class="site-header">
    <h1>Welcome to CodeFix Studio<h1>
    <p class="subtitle">Real-time syntax checking for developers
  </header>
  <main class="content">
    <section class="hero">
      <img src="banner.png" alt="Hero Banner">
      <button onclick="startApp()">Get Started</button
    </section>
  </main>
</div>`
  },
  {
    id: "css-syntax-mistakes",
    name: "CSS: Missing Semicolons & Braces",
    language: "css",
    description: "Missing colons, unclosed rule blocks, and invalid property names.",
    code: `.card-container {
  display: flex;
  flex-direction: column
  padding: 16px;
  background-color: #1e1e2e;
  border-radius: 8px

.card-title {
  font-size: 1.5rem;
  font-weight: 600;
  color: #cdd6f4
  margin-bottom: 8px;
}`
  },
  {
    id: "cpp-missing-semicolon",
    name: "C++: Missing Semicolons & Brackets",
    language: "cpp",
    description: "Unclosed main function, missing semicolons, and invalid stream operators.",
    code: `#include <iostream>
#include <vector>

int main() {
    std::vector<int> numbers = {10, 20, 30, 40};
    
    for (int i = 0; i < numbers.size(); i++) {
        std::cout << "Number: " << numbers[i] << std::endl
    }

    if (numbers.size() > 0 {
        std::cout << "Vector is not empty" << std::endl;
    }

    return 0;
`
  },
  {
    id: "sql-syntax-error",
    name: "SQL: Keyword Typos & Missing Commas",
    language: "sql",
    description: "SQL query with misspelled keywords and missing field separators.",
    code: `SELECKT id, first_name last_name, email
FROM users
WHERE status = 'active' AND created_at >= '2026-01-01'
ORDER BY created_at DESC;`
  }
];
