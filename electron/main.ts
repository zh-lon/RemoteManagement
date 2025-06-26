import { app, BrowserWindow, Menu, ipcMain, dialog } from "electron";
import * as fs from "fs";
import * as nodePath from "path";
import { spawn } from "child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const __dirname = nodePath.dirname(fileURLToPath(import.meta.url));

// The built directory structure
//
// ├─┬─┬ dist
// │ │ └── index.html
// │ │
// │ ├─┬ dist-electron
// │ │ ├── main.js
// │ │ └── preload.mjs
// │
process.env.APP_ROOT = nodePath.join(__dirname, "..");

// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
export const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
export const MAIN_DIST = nodePath.join(process.env.APP_ROOT, "dist-electron");
export const RENDERER_DIST = nodePath.join(process.env.APP_ROOT, "dist");

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL
  ? nodePath.join(process.env.APP_ROOT, "public")
  : RENDERER_DIST;

let win: BrowserWindow | null;

function createMenu() {
  const template = [
    {
      label: "视图",
      submenu: [
        {
          label: "重新加载",
          accelerator: "CmdOrCtrl+R",
          click: () => {
            win?.reload();
          },
        },
        {
          label: "强制重新加载",
          accelerator: "CmdOrCtrl+Shift+R",
          click: () => {
            win?.webContents.reloadIgnoringCache();
          },
        },
        {
          label: "开发者工具",
          accelerator:
            process.platform === "darwin" ? "Alt+Cmd+I" : "Ctrl+Shift+I",
          click: () => {
            win?.webContents.toggleDevTools();
          },
        },
      ],
    },
    {
      label: "设置",
      accelerator: "CmdOrCtrl+,",
      click: () => {
        win?.webContents.send("show-settings");
      },
    },
    {
      label: "帮助",
      submenu: [
        {
          label: "关于远程管理系统",
          click: () => {
            win?.webContents.send("show-settings");
          },
        },
      ],
    },
  ];

  // macOS 特殊处理
  if (process.platform === "darwin") {
    template.unshift({
      label: "远程管理系统",
      submenu: [
        {
          label: "关于远程管理系统",
          role: "about",
        },
        { type: "separator" },
        {
          label: "服务",
          role: "services",
          submenu: [],
        },
        { type: "separator" },
        {
          label: "隐藏远程管理系统",
          accelerator: "Command+H",
          role: "hide",
        },
        {
          label: "隐藏其他",
          accelerator: "Command+Shift+H",
          role: "hideothers",
        },
        {
          label: "显示全部",
          role: "unhide",
        },
        { type: "separator" },
        {
          label: "退出",
          accelerator: "Command+Q",
          click: () => {
            app.quit();
          },
        },
      ],
    });

    // 窗口菜单
    template[4].submenu = [
      {
        label: "关闭",
        accelerator: "CmdOrCtrl+W",
        role: "close",
      },
      {
        label: "最小化",
        accelerator: "CmdOrCtrl+M",
        role: "minimize",
      },
      {
        label: "缩放",
        role: "zoom",
      },
      { type: "separator" },
      {
        label: "前置所有窗口",
        role: "front",
      },
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
      preload: nodePath.join(__dirname, "preload.mjs"),
    },
  });

  // Test active push message to Renderer-process.
  win.webContents.on("did-finish-load", () => {
    win?.webContents.send("main-process-message", new Date().toLocaleString());
  });

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    // win.loadFile('dist/index.html')
    win.loadFile(nodePath.join(RENDERER_DIST, "index.html"));
  }
}

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
    win = null;
  }
});

app.on("activate", () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// IPC处理程序
function setupIpcHandlers() {
  // 获取用户数据目录
  ipcMain.handle("get-user-data-path", () => {
    return app.getPath("userData");
  });

  // 读取文件
  ipcMain.handle("read-file", async (event, dir: string, fileName: string) => {
    try {
      let filePath: string;

      if (dir && dir.trim() !== "") {
        // 如果dir是绝对路径，直接使用
        if (nodePath.isAbsolute(dir)) {
          filePath = nodePath.join(dir, fileName);
        } else {
          // 相对于用户数据目录
          const userDataPath = app.getPath("userData");
          filePath = nodePath.join(userDataPath, dir, fileName);
        }
      } else {
        // dir为空，使用用户数据目录
        const userDataPath = app.getPath("userData");
        filePath = nodePath.join(userDataPath, fileName);
      }

      console.log("读取文件:", {
        dir,
        fileName,
        filePath,
        exists: fs.existsSync(filePath),
      });

      const content = fs.readFileSync(filePath, "utf-8");
      console.log("文件读取成功:", {
        filePath,
        contentLength: content.length,
        contentPreview: content.substring(0, 100) + "...",
      });

      return content;
    } catch (error) {
      console.error("文件读取失败:", {
        dir,
        fileName,
        error: (error as Error).message,
      });

      if ((error as any).code === "ENOENT") {
        return null; // 文件不存在
      }
      throw error;
    }
  });

  // 写入文件
  ipcMain.handle(
    "write-file",
    async (event, dir: string, fileName: string, data: string) => {
      try {
        let filePath: string;

        // 如果dir是绝对路径，直接使用
        if (nodePath.isAbsolute(dir)) {
          filePath = nodePath.join(dir, fileName);
        } else {
          // 否则使用用户数据目录
          const userDataPath = app.getPath("userData");
          filePath = dir
            ? nodePath.join(userDataPath, dir, fileName)
            : nodePath.join(userDataPath, fileName);
        }

        const dirPath = nodePath.dirname(filePath);

        console.log("写入文件:", {
          dir,
          fileName,
          filePath,
          dirPath,
          dataLength: data.length,
        });

        // 确保目录存在
        if (!fs.existsSync(dirPath)) {
          fs.mkdirSync(dirPath, { recursive: true });
          console.log("创建目录:", dirPath);
        }

        fs.writeFileSync(filePath, data, "utf-8");
        console.log("文件写入成功:", filePath);

        return { success: true };
      } catch (error) {
        console.error("文件写入失败:", error);
        return { success: false, error: (error as Error).message };
      }
    }
  );

  // 选择文件
  ipcMain.handle("select-file", async (event, filters?: any[]) => {
    try {
      const result = await dialog.showOpenDialog(win!, {
        properties: ["openFile"],
        filters: filters || [{ name: "All Files", extensions: ["*"] }],
      });

      if (result.canceled) {
        return null;
      }

      return result.filePaths[0];
    } catch (error) {
      throw error;
    }
  });

  // 选择保存路径
  ipcMain.handle(
    "select-save-path",
    async (event, defaultName?: string, filters?: any[]) => {
      try {
        const result = await dialog.showSaveDialog(win!, {
          defaultPath: defaultName,
          filters: filters || [{ name: "All Files", extensions: ["*"] }],
        });

        console.log("文件保存对话框结果:", result);

        return {
          filePath: result.filePath || "",
          canceled: result.canceled,
        };
      } catch (error) {
        console.error("文件保存对话框错误:", error);
        throw error;
      }
    }
  );

  // 启动外部程序
  ipcMain.handle(
    "launch-program",
    async (event, program: string, args: string[]) => {
      try {
        console.log("启动程序:", {
          program,
          args,
          argsCount: args.length,
        });

        const child = spawn(program, args, { detached: true, stdio: "ignore" });
        child.unref();

        console.log("程序启动成功:", program);
        return { success: true };
      } catch (error) {
        console.error("程序启动失败:", error);
        return { success: false, error: (error as Error).message };
      }
    }
  );

  // 检查程序是否存在
  ipcMain.handle("check-program", async (event, program: string) => {
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
