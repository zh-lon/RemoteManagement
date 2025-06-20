import { app, BrowserWindow, ipcMain, dialog, Menu } from "electron";
import * as fs from "fs";
import * as nodePath from "path";
import { spawn } from "child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
createRequire(import.meta.url);
const __dirname = nodePath.dirname(fileURLToPath(import.meta.url));
process.env.APP_ROOT = nodePath.join(__dirname, "..");
const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
const MAIN_DIST = nodePath.join(process.env.APP_ROOT, "dist-electron");
const RENDERER_DIST = nodePath.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? nodePath.join(process.env.APP_ROOT, "public") : RENDERER_DIST;
let win;
function createMenu() {
  const template = [
    {
      label: "文件",
      submenu: [
        {
          label: "新建",
          accelerator: "CmdOrCtrl+N",
          click: () => {
          }
        },
        {
          label: "打开",
          accelerator: "CmdOrCtrl+O",
          click: () => {
          }
        },
        { type: "separator" },
        {
          label: "退出",
          accelerator: process.platform === "darwin" ? "Cmd+Q" : "Ctrl+Q",
          click: () => {
            app.quit();
          }
        }
      ]
    },
    {
      label: "编辑",
      submenu: [
        {
          label: "撤销",
          accelerator: "CmdOrCtrl+Z",
          role: "undo"
        },
        {
          label: "重做",
          accelerator: "Shift+CmdOrCtrl+Z",
          role: "redo"
        },
        { type: "separator" },
        {
          label: "剪切",
          accelerator: "CmdOrCtrl+X",
          role: "cut"
        },
        {
          label: "复制",
          accelerator: "CmdOrCtrl+C",
          role: "copy"
        },
        {
          label: "粘贴",
          accelerator: "CmdOrCtrl+V",
          role: "paste"
        }
      ]
    },
    {
      label: "视图",
      submenu: [
        {
          label: "重新加载",
          accelerator: "CmdOrCtrl+R",
          click: () => {
            win == null ? void 0 : win.reload();
          }
        },
        {
          label: "强制重新加载",
          accelerator: "CmdOrCtrl+Shift+R",
          click: () => {
            win == null ? void 0 : win.webContents.reloadIgnoringCache();
          }
        },
        {
          label: "开发者工具",
          accelerator: process.platform === "darwin" ? "Alt+Cmd+I" : "Ctrl+Shift+I",
          click: () => {
            win == null ? void 0 : win.webContents.toggleDevTools();
          }
        },
        { type: "separator" },
        {
          label: "实际大小",
          accelerator: "CmdOrCtrl+0",
          role: "resetZoom"
        },
        {
          label: "放大",
          accelerator: "CmdOrCtrl+Plus",
          role: "zoomIn"
        },
        {
          label: "缩小",
          accelerator: "CmdOrCtrl+-",
          role: "zoomOut"
        },
        { type: "separator" },
        {
          label: "全屏",
          accelerator: process.platform === "darwin" ? "Ctrl+Cmd+F" : "F11",
          role: "togglefullscreen"
        }
      ]
    },
    {
      label: "窗口",
      submenu: [
        {
          label: "最小化",
          accelerator: "CmdOrCtrl+M",
          role: "minimize"
        },
        {
          label: "关闭",
          accelerator: "CmdOrCtrl+W",
          role: "close"
        }
      ]
    },
    {
      label: "帮助",
      submenu: [
        {
          label: "关于远程管理系统",
          click: () => {
          }
        }
      ]
    }
  ];
  if (process.platform === "darwin") {
    template.unshift({
      label: "远程管理系统",
      submenu: [
        {
          label: "关于远程管理系统",
          role: "about"
        },
        { type: "separator" },
        {
          label: "服务",
          role: "services",
          submenu: []
        },
        { type: "separator" },
        {
          label: "隐藏远程管理系统",
          accelerator: "Command+H",
          role: "hide"
        },
        {
          label: "隐藏其他",
          accelerator: "Command+Shift+H",
          role: "hideothers"
        },
        {
          label: "显示全部",
          role: "unhide"
        },
        { type: "separator" },
        {
          label: "退出",
          accelerator: "Command+Q",
          click: () => {
            app.quit();
          }
        }
      ]
    });
    template[4].submenu = [
      {
        label: "关闭",
        accelerator: "CmdOrCtrl+W",
        role: "close"
      },
      {
        label: "最小化",
        accelerator: "CmdOrCtrl+M",
        role: "minimize"
      },
      {
        label: "缩放",
        role: "zoom"
      },
      { type: "separator" },
      {
        label: "前置所有窗口",
        role: "front"
      }
    ];
  }
  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}
function createWindow() {
  win = new BrowserWindow({
    title: "远程管理系统",
    icon: nodePath.join(process.env.VITE_PUBLIC, "electron-vite.svg"),
    webPreferences: {
      preload: nodePath.join(__dirname, "preload.mjs")
    }
  });
  win.webContents.on("did-finish-load", () => {
    win == null ? void 0 : win.webContents.send("main-process-message", (/* @__PURE__ */ new Date()).toLocaleString());
  });
  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(nodePath.join(RENDERER_DIST, "index.html"));
  }
}
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
    win = null;
  }
});
app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
function setupIpcHandlers() {
  ipcMain.handle("get-user-data-path", () => {
    return app.getPath("userData");
  });
  ipcMain.handle("read-file", async (event, dir, fileName) => {
    try {
      const filePath = dir ? nodePath.join(dir, fileName) : fileName;
      return fs.readFileSync(filePath, "utf-8");
    } catch (error) {
      if (error.code === "ENOENT") {
        return null;
      }
      throw error;
    }
  });
  ipcMain.handle(
    "write-file",
    async (event, dir, fileName, data) => {
      try {
        const filePath = dir ? nodePath.join(dir, fileName) : fileName;
        const dirPath = nodePath.dirname(filePath);
        if (!fs.existsSync(dirPath)) {
          fs.mkdirSync(dirPath, { recursive: true });
        }
        fs.writeFileSync(filePath, data, "utf-8");
      } catch (error) {
        throw error;
      }
    }
  );
  ipcMain.handle("select-file", async (event, filters) => {
    try {
      const result = await dialog.showOpenDialog(win, {
        properties: ["openFile"],
        filters: filters || [{ name: "All Files", extensions: ["*"] }]
      });
      if (result.canceled) {
        return null;
      }
      return result.filePaths[0];
    } catch (error) {
      throw error;
    }
  });
  ipcMain.handle(
    "select-save-path",
    async (event, defaultName, filters) => {
      try {
        const result = await dialog.showSaveDialog(win, {
          defaultPath: defaultName,
          filters: filters || [{ name: "All Files", extensions: ["*"] }]
        });
        if (result.canceled) {
          return null;
        }
        return result.filePath;
      } catch (error) {
        throw error;
      }
    }
  );
  ipcMain.handle(
    "launch-program",
    async (event, program, args) => {
      try {
        const child = spawn(program, args, { detached: true, stdio: "ignore" });
        child.unref();
        return { success: true };
      } catch (error) {
        return { success: false, error: error.message };
      }
    }
  );
  ipcMain.handle("check-program", async (event, program) => {
    try {
      const child = spawn(program, ["--version"], { stdio: "ignore" });
      return new Promise((resolve) => {
        child.on("error", () => resolve(false));
        child.on("exit", (code) => resolve(code === 0));
      });
    } catch (error) {
      return false;
    }
  });
}
app.whenReady().then(() => {
  setupIpcHandlers();
  createMenu();
  createWindow();
});
export {
  MAIN_DIST,
  RENDERER_DIST,
  VITE_DEV_SERVER_URL
};
