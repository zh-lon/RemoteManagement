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
        }
      ]
    },
    {
      label: "设置",
      accelerator: "CmdOrCtrl+,",
      click: () => {
        win == null ? void 0 : win.webContents.send("show-settings");
      }
    },
    {
      label: "帮助",
      submenu: [
        {
          label: "关于远程管理系统",
          click: () => {
            win == null ? void 0 : win.webContents.send("show-settings");
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
        const userDataPath = app.getPath("userData");
        const filePath = dir ? nodePath.join(userDataPath, dir, fileName) : nodePath.join(userDataPath, fileName);
        const dirPath = nodePath.dirname(filePath);
        console.log("写入文件:", {
          dir,
          fileName,
          filePath,
          dirPath,
          dataLength: data.length
        });
        if (!fs.existsSync(dirPath)) {
          fs.mkdirSync(dirPath, { recursive: true });
          console.log("创建目录:", dirPath);
        }
        fs.writeFileSync(filePath, data, "utf-8");
        console.log("文件写入成功:", filePath);
        return { success: true };
      } catch (error) {
        console.error("文件写入失败:", error);
        return { success: false, error: error.message };
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
        console.log("启动程序:", {
          program,
          args,
          argsCount: args.length
        });
        const child = spawn(program, args, { detached: true, stdio: "ignore" });
        child.unref();
        console.log("程序启动成功:", program);
        return { success: true };
      } catch (error) {
        console.error("程序启动失败:", error);
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
