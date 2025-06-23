import { v4 as uuidv4 } from "uuid";
import {
  ConnectionConfig,
  ConnectionGroup,
  ConnectionItem,
  AppSettings,
  OperationResult,
  TreeNode,
  isConnectionGroup,
  isConnectionItem,
} from "@/types/connection";
import { encryptionService } from "./encryption";
import {
  DEFAULT_SETTINGS,
  DATA_FILE_NAME,
  SETTINGS_FILE_NAME,
  APP_VERSION,
} from "@/utils/constants";

/**
 * 本地数据存储服务
 * 负责连接配置和应用设置的本地存储管理
 */
export class StorageService {
  private static instance: StorageService;
  private dataPath: string = "";
  private isInitialized: boolean = false;

  private constructor() {}

  /**
   * 获取存储服务单例
   */
  public static getInstance(): StorageService {
    if (!StorageService.instance) {
      StorageService.instance = new StorageService();
    }
    return StorageService.instance;
  }

  /**
   * 初始化存储服务
   */
  public async initialize(): Promise<void> {
    try {
      // 在Electron环境中获取用户数据目录
      if (window.electronAPI) {
        this.dataPath = await window.electronAPI.getUserDataPath();
      } else {
        // 开发环境使用localStorage
        this.dataPath = "localStorage";
      }

      this.isInitialized = true;

      // 确保加密服务已初始化
      if (!encryptionService.isReady()) {
        await encryptionService.initialize();
      }
    } catch (error) {
      console.error("存储服务初始化失败:", error);
      throw new Error("存储服务初始化失败");
    }
  }

  /**
   * 加载连接配置
   */
  public async loadConnections(): Promise<OperationResult<ConnectionConfig>> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      let data: string | null = null;

      if (this.dataPath === "localStorage") {
        // 开发环境使用localStorage
        data = localStorage.getItem(DATA_FILE_NAME);
      } else {
        // 生产环境读取文件
        data = await window.electronAPI.readFile(this.dataPath, DATA_FILE_NAME);
      }

      if (!data) {
        // 返回默认配置
        const defaultConfig: ConnectionConfig = {
          version: APP_VERSION,
          groups: [],
          settings: DEFAULT_SETTINGS,
        };
        return { success: true, data: defaultConfig };
      }

      const config: ConnectionConfig = JSON.parse(data);

      // 验证加密密钥
      if (!encryptionService.verifyKeyFingerprint()) {
        console.warn("加密密钥不匹配，可能导致解密失败");
      }

      // 解密敏感数据
      try {
        config.groups = this.decryptGroups(config.groups);
        console.log("连接配置解密成功");
      } catch (error) {
        console.error("解密连接配置失败:", error);
        // 如果解密失败，返回默认配置
        const defaultConfig: ConnectionConfig = {
          version: APP_VERSION,
          groups: [],
          settings: DEFAULT_SETTINGS,
        };
        return {
          success: true,
          data: defaultConfig,
          message: "解密失败，已加载默认配置",
        };
      }

      return { success: true, data: config };
    } catch (error) {
      console.error("加载连接配置失败:", error);
      return {
        success: false,
        error: "加载连接配置失败",
        message: error instanceof Error ? error.message : "未知错误",
      };
    }
  }

  /**
   * 保存连接配置
   */
  public async saveConnections(
    config: ConnectionConfig
  ): Promise<OperationResult> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      // 创建副本并加密敏感数据
      const configToSave: ConnectionConfig = {
        ...config,
        groups: this.encryptGroups(config.groups),
      };

      const data = JSON.stringify(configToSave, null, 2);

      if (this.dataPath === "localStorage") {
        // 开发环境使用localStorage
        localStorage.setItem(DATA_FILE_NAME, data);
      } else {
        // 生产环境写入文件
        await window.electronAPI.writeFile(this.dataPath, DATA_FILE_NAME, data);
      }

      return { success: true, message: "保存成功" };
    } catch (error) {
      console.error("保存连接配置失败:", error);
      return {
        success: false,
        error: "保存连接配置失败",
        message: error instanceof Error ? error.message : "未知错误",
      };
    }
  }

  /**
   * 加载应用设置
   */
  public async loadSettings(): Promise<OperationResult<AppSettings>> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      let data: string | null = null;

      if (this.dataPath === "localStorage") {
        data = localStorage.getItem(SETTINGS_FILE_NAME);
      } else {
        data = await window.electronAPI.readFile(
          this.dataPath,
          SETTINGS_FILE_NAME
        );
      }

      if (!data) {
        return { success: true, data: DEFAULT_SETTINGS };
      }

      const settings: AppSettings = JSON.parse(data);

      // 合并默认设置（处理新增的设置项）
      const mergedSettings = { ...DEFAULT_SETTINGS, ...settings };

      return { success: true, data: mergedSettings };
    } catch (error) {
      console.error("加载应用设置失败:", error);
      return {
        success: false,
        error: "加载应用设置失败",
        data: DEFAULT_SETTINGS,
      };
    }
  }

  /**
   * 保存应用设置
   */
  public async saveSettings(settings: AppSettings): Promise<OperationResult> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      const data = JSON.stringify(settings, null, 2);

      if (this.dataPath === "localStorage") {
        localStorage.setItem(SETTINGS_FILE_NAME, data);
      } else {
        await window.electronAPI.writeFile(
          this.dataPath,
          SETTINGS_FILE_NAME,
          data
        );
      }

      return { success: true, message: "设置保存成功" };
    } catch (error) {
      console.error("保存应用设置失败:", error);
      return {
        success: false,
        error: "保存应用设置失败",
        message: error instanceof Error ? error.message : "未知错误",
      };
    }
  }

  /**
   * 导出连接配置
   */
  public async exportConnections(
    config: ConnectionConfig,
    filePath: string,
    includePasswords: boolean = false
  ): Promise<OperationResult> {
    try {
      let exportData = { ...config };

      if (!includePasswords) {
        // 移除密码信息
        exportData.groups = this.removePasswords(exportData.groups);
      }

      const data = JSON.stringify(exportData, null, 2);

      if (this.dataPath === "localStorage") {
        // 开发环境下载文件
        const blob = new Blob([data], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "connections.json";
        a.click();
        URL.revokeObjectURL(url);
      } else {
        await window.electronAPI.writeFile("", filePath, data);
      }

      return { success: true, message: "导出成功" };
    } catch (error) {
      console.error("导出连接配置失败:", error);
      return {
        success: false,
        error: "导出连接配置失败",
        message: error instanceof Error ? error.message : "未知错误",
      };
    }
  }

  /**
   * 导入连接配置
   */
  public async importConnections(
    filePath: string
  ): Promise<OperationResult<ConnectionConfig>> {
    try {
      let data: string;

      if (this.dataPath === "localStorage") {
        // 开发环境处理文件上传
        return { success: false, error: "开发环境不支持文件导入" };
      } else {
        data = await window.electronAPI.readFile("", filePath);
      }

      const config: ConnectionConfig = JSON.parse(data);

      // 验证配置格式
      if (!this.validateConfig(config)) {
        return { success: false, error: "配置文件格式无效" };
      }

      // 为导入的项目生成新的ID
      config.groups = this.regenerateIds(config.groups);

      return { success: true, data: config, message: "导入成功" };
    } catch (error) {
      console.error("导入连接配置失败:", error);
      return {
        success: false,
        error: "导入连接配置失败",
        message: error instanceof Error ? error.message : "未知错误",
      };
    }
  }

  /**
   * 创建备份
   */
  public async createBackup(): Promise<OperationResult> {
    try {
      const result = await this.loadConnections();
      if (!result.success || !result.data) {
        return { success: false, error: "无法加载配置进行备份" };
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const backupFileName = `backup-${timestamp}.json`;

      return await this.exportConnections(result.data, backupFileName, true);
    } catch (error) {
      console.error("创建备份失败:", error);
      return {
        success: false,
        error: "创建备份失败",
        message: error instanceof Error ? error.message : "未知错误",
      };
    }
  }

  /**
   * 加密分组数据
   */
  private encryptGroups(groups: ConnectionGroup[]): ConnectionGroup[] {
    return groups.map((group) => ({
      ...group,
      children: group.children.map((child) => {
        if (isConnectionGroup(child)) {
          return this.encryptGroups([child])[0];
        } else {
          return encryptionService.encryptObject(child, ["password"]);
        }
      }),
    }));
  }

  /**
   * 解密分组数据
   */
  private decryptGroups(groups: ConnectionGroup[]): ConnectionGroup[] {
    return groups.map((group) => ({
      ...group,
      children: group.children.map((child) => {
        if (isConnectionGroup(child)) {
          return this.decryptGroups([child])[0];
        } else {
          return encryptionService.decryptObject(child, ["password"]);
        }
      }),
    }));
  }

  /**
   * 移除密码信息
   */
  private removePasswords(groups: ConnectionGroup[]): ConnectionGroup[] {
    return groups.map((group) => ({
      ...group,
      children: group.children.map((child) => {
        if (isConnectionGroup(child)) {
          return this.removePasswords([child])[0];
        } else {
          return { ...child, password: "" };
        }
      }),
    }));
  }

  /**
   * 重新生成ID
   */
  private regenerateIds(groups: ConnectionGroup[]): ConnectionGroup[] {
    return groups.map((group) => ({
      ...group,
      id: uuidv4(),
      children: group.children.map((child) => {
        if (isConnectionGroup(child)) {
          return this.regenerateIds([child])[0];
        } else {
          return { ...child, id: uuidv4() };
        }
      }),
    }));
  }

  /**
   * 验证配置格式
   */
  private validateConfig(config: any): config is ConnectionConfig {
    return (
      config &&
      typeof config === "object" &&
      Array.isArray(config.groups) &&
      config.settings &&
      typeof config.settings === "object"
    );
  }

  /**
   * 清理存储服务
   */
  public cleanup(): void {
    this.isInitialized = false;
    this.dataPath = "";
  }
}

// 扩展Window接口以支持Electron API
declare global {
  interface Window {
    electronAPI?: {
      getUserDataPath(): Promise<string>;
      readFile(dir: string, fileName: string): Promise<string>;
      writeFile(dir: string, fileName: string, data: string): Promise<void>;
    };
  }
}

// 导出单例实例
export const storageService = StorageService.getInstance();
