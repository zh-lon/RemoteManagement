import { ipcRenderer, contextBridge } from "electron";

// --------- Expose some API to the Renderer process ---------
contextBridge.exposeInMainWorld("ipcRenderer", {
  on(...args: Parameters<typeof ipcRenderer.on>) {
    const [channel, listener] = args;
    return ipcRenderer.on(channel, (event, ...args) =>
      listener(event, ...args)
    );
  },
  off(...args: Parameters<typeof ipcRenderer.off>) {
    const [channel, ...omit] = args;
    return ipcRenderer.off(channel, ...omit);
  },
  send(...args: Parameters<typeof ipcRenderer.send>) {
    const [channel, ...omit] = args;
    return ipcRenderer.send(channel, ...omit);
  },
  invoke(...args: Parameters<typeof ipcRenderer.invoke>) {
    const [channel, ...omit] = args;
    return ipcRenderer.invoke(channel, ...omit);
  },

  // You can expose other APTs you need here.
  // ...
});

// --------- Expose Electron APIs for file operations ---------
contextBridge.exposeInMainWorld("electronAPI", {
  // 获取用户数据目录
  getUserDataPath: () => ipcRenderer.invoke("get-user-data-path"),

  // 读取文件
  readFile: (dir: string, fileName: string) =>
    ipcRenderer.invoke("read-file", dir, fileName),

  // 写入文件
  writeFile: (dir: string, fileName: string, data: string) =>
    ipcRenderer.invoke("write-file", dir, fileName, data),

  // 选择文件
  selectFile: (filters?: any[]) => ipcRenderer.invoke("select-file", filters),

  // 选择保存路径
  selectSavePath: (defaultName?: string, filters?: any[]) =>
    ipcRenderer.invoke("select-save-path", defaultName, filters),

  // 启动外部程序
  launchProgram: (program: string, args: string[]) =>
    ipcRenderer.invoke("launch-program", program, args),

  // 检查程序是否存在
  checkProgram: (program: string) =>
    ipcRenderer.invoke("check-program", program),
});
