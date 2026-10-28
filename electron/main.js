const { app, BrowserWindow, shell } = require("electron");
const path = require("path");
const { spawn } = require("child_process");
const http = require("http");

let mainWindow = null;
let backendProcess = null;
const PORT = 3000;

function startBackend() {
  const rootDir = path.join(__dirname, "..");
  const serverPath = path.join(rootDir, "dist", "server.cjs");
  backendProcess = spawn(process.execPath, [serverPath], {
    cwd: rootDir,
    env: { ...process.env, ELECTRON_RUN_AS_NODE: "1", NODE_ENV: "production", PORT: String(PORT) },
    windowsHide: true,
  });
  backendProcess.stdout.on("data", (d) => console.log("[backend]", d.toString().trim()));
  backendProcess.stderr.on("data", (d) => console.error("[backend err]", d.toString().trim()));
  backendProcess.on("exit", (code) => console.log("[backend] exited with code", code));
}

function waitForServer(retries = 30, delay = 500) {
  return new Promise((resolve, reject) => {
    const attempt = (n) => {
      http.get(`http://localhost:${PORT}/api/health`, (res) => {
        if (res.statusCode === 200) resolve();
        else attempt(n - 1);
      }).on("error", () => {
        if (n <= 0) return reject(new Error("Server did not start"));
        setTimeout(() => attempt(n - 1), delay);
      });
    };
    attempt(retries);
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: "SyntaxFix",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
    backgroundColor: "#0f172a",
    show: false,
  });

  mainWindow.loadURL(`http://localhost:${PORT}`);

  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
    mainWindow.focus();
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.on("closed", () => { mainWindow = null; });
}

app.whenReady().then(async () => {
  startBackend();
  try {
    await waitForServer();
    createWindow();
  } catch (err) {
    console.error("Could not connect to backend:", err.message);
    app.quit();
  }

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", () => {
  if (backendProcess) { backendProcess.kill(); backendProcess = null; }
});
