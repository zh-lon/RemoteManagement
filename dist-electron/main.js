import { app as a, BrowserWindow as g, ipcMain as i, dialog as m, Menu as p } from "electron";
import * as u from "fs";
import * as n from "path";
import { spawn as f } from "child_process";
import { createRequire as v } from "node:module";
import { fileURLToPath as w } from "node:url";
v(import.meta.url);
const b = n.dirname(w(import.meta.url));
process.env.APP_ROOT = n.join(b, "..");
const h = process.env.VITE_DEV_SERVER_URL, j = n.join(process.env.APP_ROOT, "dist-electron"), P = n.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = h ? n.join(process.env.APP_ROOT, "public") : P;
let o;
function y() {
  const s = [
    {
      label: "视图",
      submenu: [
        {
          label: "重新加载",
          accelerator: "CmdOrCtrl+R",
          click: () => {
            o == null || o.reload();
          }
        },
        {
          label: "强制重新加载",
          accelerator: "CmdOrCtrl+Shift+R",
          click: () => {
            o == null || o.webContents.reloadIgnoringCache();
          }
        },
        {
          label: "开发者工具",
          accelerator: process.platform === "darwin" ? "Alt+Cmd+I" : "Ctrl+Shift+I",
          click: () => {
            o == null || o.webContents.toggleDevTools();
          }
        }
      ]
    },
    {
      label: "设置",
      accelerator: "CmdOrCtrl+,",
      click: () => {
        o == null || o.webContents.send("show-settings");
      }
    },
    {
      label: "帮助",
      submenu: [
        {
          label: "关于远程管理系统",
          click: () => {
            o == null || o.webContents.send("show-settings");
          }
        }
      ]
    }
  ];
  process.platform === "darwin" && (s.unshift({
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
          a.quit();
        }
      }
    ]
  }), s[4].submenu = [
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
  ]);
  const t = p.buildFromTemplate(s);
  p.setApplicationMenu(t);
}
function C() {
  o = new g({
    title: "远程管理系统",
    icon: n.join(process.env.VITE_PUBLIC, "electron-vite.svg"),
    webPreferences: {
      preload: n.join(b, "preload.mjs")
    }
  }), o.webContents.on("did-finish-load", () => {
    o == null || o.webContents.send("main-process-message", (/* @__PURE__ */ new Date()).toLocaleString());
  }), h ? o.loadURL(h) : o.loadFile(n.join(P, "index.html"));
}
a.on("window-all-closed", () => {
  process.platform !== "darwin" && (a.quit(), o = null);
});
a.on("activate", () => {
  g.getAllWindows().length === 0 && C();
});
function R() {
  i.handle("get-user-data-path", () => a.getPath("userData")), i.handle("read-file", async (s, t, r) => {
    try {
      let e;
      if (t && t.trim() !== "")
        if (n.isAbsolute(t))
          e = n.join(t, r);
        else {
          const c = a.getPath("userData");
          e = n.join(c, t, r);
        }
      else {
        const c = a.getPath("userData");
        e = n.join(c, r);
      }
      console.log("读取文件:", {
        dir: t,
        fileName: r,
        filePath: e,
        exists: u.existsSync(e)
      });
      const l = u.readFileSync(e, "utf-8");
      return console.log("文件读取成功:", {
        filePath: e,
        contentLength: l.length,
        contentPreview: l.substring(0, 100) + "..."
      }), l;
    } catch (e) {
      if (console.error("文件读取失败:", {
        dir: t,
        fileName: r,
        error: e.message
      }), e.code === "ENOENT")
        return null;
      throw e;
    }
  }), i.handle(
    "write-file",
    async (s, t, r, e) => {
      try {
        let l;
        if (n.isAbsolute(t))
          l = n.join(t, r);
        else {
          const d = a.getPath("userData");
          l = t ? n.join(d, t, r) : n.join(d, r);
        }
        const c = n.dirname(l);
        return console.log("写入文件:", {
          dir: t,
          fileName: r,
          filePath: l,
          dirPath: c,
          dataLength: e.length
        }), u.existsSync(c) || (u.mkdirSync(c, { recursive: !0 }), console.log("创建目录:", c)), u.writeFileSync(l, e, "utf-8"), console.log("文件写入成功:", l), { success: !0 };
      } catch (l) {
        return console.error("文件写入失败:", l), { success: !1, error: l.message };
      }
    }
  ), i.handle("select-file", async (s, t) => {
    try {
      const r = await m.showOpenDialog(o, {
        properties: ["openFile"],
        filters: t || [{ name: "All Files", extensions: ["*"] }]
      });
      return r.canceled ? null : r.filePaths[0];
    } catch (r) {
      throw r;
    }
  }), i.handle(
    "select-save-path",
    async (s, t, r) => {
      try {
        const e = await m.showSaveDialog(o, {
          defaultPath: t,
          filters: r || [{ name: "All Files", extensions: ["*"] }]
        });
        return console.log("文件保存对话框结果:", e), {
          filePath: e.filePath || "",
          canceled: e.canceled
        };
      } catch (e) {
        throw console.error("文件保存对话框错误:", e), e;
      }
    }
  ), i.handle(
    "launch-program",
    async (s, t, r) => {
      try {
        return console.log("启动程序:", {
          program: t,
          args: r,
          argsCount: r.length
        }), f(t, r, { detached: !0, stdio: "ignore" }).unref(), console.log("程序启动成功:", t), { success: !0 };
      } catch (e) {
        return console.error("程序启动失败:", e), { success: !1, error: e.message };
      }
    }
  ), i.handle("check-program", async (s, t) => {
    try {
      const r = f(t, ["--version"], { stdio: "ignore" });
      return new Promise((e) => {
        r.on("error", () => e(!1)), r.on("exit", (l) => e(l === 0));
      });
    } catch {
      return !1;
    }
  });
}
a.whenReady().then(() => {
  R(), y(), C();
});
export {
  j as MAIN_DIST,
  P as RENDERER_DIST,
  h as VITE_DEV_SERVER_URL
};
