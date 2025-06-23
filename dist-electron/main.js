import { app as c, BrowserWindow as f, ipcMain as a, dialog as m, Menu as h } from "electron";
import * as i from "fs";
import * as l from "path";
import { spawn as p } from "child_process";
import { createRequire as g } from "node:module";
import { fileURLToPath as v } from "node:url";
g(import.meta.url);
const b = l.dirname(v(import.meta.url));
process.env.APP_ROOT = l.join(b, "..");
const d = process.env.VITE_DEV_SERVER_URL, T = l.join(process.env.APP_ROOT, "dist-electron"), C = l.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = d ? l.join(process.env.APP_ROOT, "public") : C;
let e;
function y() {
  const n = [
    {
      label: "视图",
      submenu: [
        {
          label: "重新加载",
          accelerator: "CmdOrCtrl+R",
          click: () => {
            e == null || e.reload();
          }
        },
        {
          label: "强制重新加载",
          accelerator: "CmdOrCtrl+Shift+R",
          click: () => {
            e == null || e.webContents.reloadIgnoringCache();
          }
        },
        {
          label: "开发者工具",
          accelerator: process.platform === "darwin" ? "Alt+Cmd+I" : "Ctrl+Shift+I",
          click: () => {
            e == null || e.webContents.toggleDevTools();
          }
        }
      ]
    },
    {
      label: "设置",
      accelerator: "CmdOrCtrl+,",
      click: () => {
        e == null || e.webContents.send("show-settings");
      }
    },
    {
      label: "帮助",
      submenu: [
        {
          label: "关于远程管理系统",
          click: () => {
            e == null || e.webContents.send("show-settings");
          }
        }
      ]
    }
  ];
  process.platform === "darwin" && (n.unshift({
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
          c.quit();
        }
      }
    ]
  }), n[4].submenu = [
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
  const o = h.buildFromTemplate(n);
  h.setApplicationMenu(o);
}
function w() {
  e = new f({
    title: "远程管理系统",
    icon: l.join(process.env.VITE_PUBLIC, "electron-vite.svg"),
    webPreferences: {
      preload: l.join(b, "preload.mjs")
    }
  }), e.webContents.on("did-finish-load", () => {
    e == null || e.webContents.send("main-process-message", (/* @__PURE__ */ new Date()).toLocaleString());
  }), d ? e.loadURL(d) : e.loadFile(l.join(C, "index.html"));
}
c.on("window-all-closed", () => {
  process.platform !== "darwin" && (c.quit(), e = null);
});
c.on("activate", () => {
  f.getAllWindows().length === 0 && w();
});
function P() {
  a.handle("get-user-data-path", () => c.getPath("userData")), a.handle("read-file", async (n, o, r) => {
    try {
      const t = o ? l.join(o, r) : r;
      return i.readFileSync(t, "utf-8");
    } catch (t) {
      if (t.code === "ENOENT")
        return null;
      throw t;
    }
  }), a.handle(
    "write-file",
    async (n, o, r, t) => {
      try {
        const s = o ? l.join(o, r) : r, u = l.dirname(s);
        i.existsSync(u) || i.mkdirSync(u, { recursive: !0 }), i.writeFileSync(s, t, "utf-8");
      } catch (s) {
        throw s;
      }
    }
  ), a.handle("select-file", async (n, o) => {
    try {
      const r = await m.showOpenDialog(e, {
        properties: ["openFile"],
        filters: o || [{ name: "All Files", extensions: ["*"] }]
      });
      return r.canceled ? null : r.filePaths[0];
    } catch (r) {
      throw r;
    }
  }), a.handle(
    "select-save-path",
    async (n, o, r) => {
      try {
        const t = await m.showSaveDialog(e, {
          defaultPath: o,
          filters: r || [{ name: "All Files", extensions: ["*"] }]
        });
        return t.canceled ? null : t.filePath;
      } catch (t) {
        throw t;
      }
    }
  ), a.handle(
    "launch-program",
    async (n, o, r) => {
      try {
        return p(o, r, { detached: !0, stdio: "ignore" }).unref(), { success: !0 };
      } catch (t) {
        return { success: !1, error: t.message };
      }
    }
  ), a.handle("check-program", async (n, o) => {
    try {
      const r = p(o, ["--version"], { stdio: "ignore" });
      return new Promise((t) => {
        r.on("error", () => t(!1)), r.on("exit", (s) => t(s === 0));
      });
    } catch {
      return !1;
    }
  });
}
c.whenReady().then(() => {
  P(), y(), w();
});
export {
  T as MAIN_DIST,
  C as RENDERER_DIST,
  d as VITE_DEV_SERVER_URL
};
