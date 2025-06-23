// 全局类型定义

// Electron API 接口
interface ElectronAPI {
  // 文件操作
  getUserDataPath(): Promise<string>;
  readFile(dir: string, fileName: string): Promise<string>;
  writeFile(
    dir: string,
    fileName: string,
    data: string
  ): Promise<{ success: boolean; error?: string }>;

  // 文件对话框
  selectFile(
    filters?: Array<{ name: string; extensions: string[] }>
  ): Promise<string | null>;
  selectSavePath(
    defaultName?: string,
    filters?: Array<{ name: string; extensions: string[] }>
  ): Promise<string | null>;

  // 程序启动
  launchProgram(
    program: string,
    args: string[]
  ): Promise<{ success: boolean; error?: string }>;
  checkProgram(program: string): Promise<boolean>;
}

// IPC Renderer 接口
interface IpcRenderer {
  on(channel: string, listener: (event: any, ...args: any[]) => void): void;
  off(channel: string, listener?: (...args: any[]) => void): void;
  send(channel: string, ...args: any[]): void;
  invoke(channel: string, ...args: any[]): Promise<any>;
}

// 扩展 Window 接口
declare global {
  interface Window {
    electronAPI?: ElectronAPI;
    ipcRenderer?: IpcRenderer;
  }
}

export {};
