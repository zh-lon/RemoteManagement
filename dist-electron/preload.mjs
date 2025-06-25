"use strict";
const electron = require("electron");
electron.contextBridge.exposeInMainWorld("ipcRenderer", {
  on(...args) {
    const [channel, listener] = args;
    return electron.ipcRenderer.on(
      channel,
      (event, ...args2) => listener(event, ...args2)
    );
  },
  off(...args) {
    const [channel, ...omit] = args;
    return electron.ipcRenderer.off(channel, ...omit);
  },
  send(...args) {
    const [channel, ...omit] = args;
    return electron.ipcRenderer.send(channel, ...omit);
  },
  invoke(...args) {
    const [channel, ...omit] = args;
    return electron.ipcRenderer.invoke(channel, ...omit);
  }
  // You can expose other APTs you need here.
  // ...
});
electron.contextBridge.exposeInMainWorld("electronAPI", {
  // 获取用户数据目录
  getUserDataPath: () => electron.ipcRenderer.invoke("get-user-data-path"),
  // 读取文件
  readFile: (dir, fileName) => electron.ipcRenderer.invoke("read-file", dir, fileName),
  // 写入文件
  writeFile: (dir, fileName, data) => electron.ipcRenderer.invoke("write-file", dir, fileName, data),
  // 选择文件
  selectFile: (filters) => electron.ipcRenderer.invoke("select-file", filters),
  // 选择保存路径
  selectSavePath: (defaultName, filters) => electron.ipcRenderer.invoke("select-save-path", defaultName, filters),
  // 启动外部程序
  launchProgram: (program, args) => electron.ipcRenderer.invoke("launch-program", program, args),
  // 检查程序是否存在
  checkProgram: (program) => electron.ipcRenderer.invoke("check-program", program)
});
