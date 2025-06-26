import { v4 as uuidv4 } from "uuid";
import {
  ConnectionConfig,
  ConnectionGroup,
  AppSettings,
  OperationResult,
  ConflictInfo,
  MergeResult,
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
import { v4 as uuidv4 } from "uuid";

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
   * 强制重置存储服务（用于环境切换）
   */
  public forceReset(): void {
    console.log("🔄 强制重置存储服务");
    this.isInitialized = false;
    this.dataPath = "";
  }

  /**
   * 初始化存储服务
   */
  public async initialize(): Promise<void> {
    try {
      console.log("📋 存储服务初始化开始，当前状态:", {
        isInitialized: this.isInitialized,
        currentDataPath: this.dataPath,
      });

      // 获取Electron用户数据目录
      if (!window.electronAPI) {
        throw new Error("此应用只能在Electron桌面环境中运行");
      }

      const baseDataPath = await window.electronAPI.getUserDataPath();

      // 紧急解决方案：临时禁用环境分离
      console.log("🔍 开始环境检测...");
      const isDevelopment = this.isDevelopmentMode();
      console.log("🎯 环境检测结果:", isDevelopment ? "开发环境" : "生产环境");

      // 紧急方案：禁用环境分离，统一使用生产环境路径
      console.log("⚠️ 紧急方案：禁用环境分离");
      this.dataPath = baseDataPath;
      console.log("✅ 统一使用生产环境数据目录:", this.dataPath);

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
   * 检测是否为开发环境
   */
  private isDevelopmentMode(): boolean {
    try {
      console.log("环境检测调试信息:", {
        hasImportMeta: typeof import.meta !== "undefined",
        hasImportMetaEnv:
          typeof import.meta !== "undefined" && !!import.meta.env,
        importMetaEnvDev:
          typeof import.meta !== "undefined" && import.meta.env
            ? import.meta.env.DEV
            : undefined,
        hasProcess: typeof process !== "undefined",
        hasProcessEnv: typeof process !== "undefined" && !!process.env,
        processEnvNodeEnv:
          typeof process !== "undefined" && process.env
            ? process.env.NODE_ENV
            : undefined,
      });

      // 检查是否在开发服务器环境中运行（通过URL检测）
      if (typeof window !== "undefined" && window.location) {
        console.log("当前URL信息:", {
          hostname: window.location.hostname,
          port: window.location.port,
          href: window.location.href,
        });

        const isDevServer =
          window.location.hostname === "localhost" &&
          (window.location.port === "5173" || window.location.port === "5174");
        if (isDevServer) {
          console.log("✅ 检测到开发服务器环境:", window.location.href);
          return true;
        } else {
          console.log("❌ 不是开发服务器环境");
        }
      } else {
        console.log("❌ 无法访问window.location");
      }

      // 检查Vite开发环境标识
      if (typeof import.meta !== "undefined" && import.meta.env) {
        const isDev = import.meta.env.DEV === true;
        console.log("Vite环境检测结果:", isDev);
        return isDev;
      }

      // 检查Node.js环境变量
      if (typeof process !== "undefined" && process.env) {
        const isDev = process.env.NODE_ENV === "development";
        console.log("Node.js环境检测结果:", isDev);
        return isDev;
      }

      // 默认为生产环境
      console.log("使用默认环境：生产环境");
      return false;
    } catch (error) {
      console.warn("检测开发环境时出错，默认为生产环境:", error);
      return false;
    }
  }

  /**
   * 加载连接配置
   */
  public async loadConnections(): Promise<OperationResult<ConnectionConfig>> {
    try {
      console.log("📖 开始加载连接配置...");
      if (!this.isInitialized) {
        console.log("🔧 存储服务未初始化，开始初始化...");
        await this.initialize();
      }

      console.log("📁 当前数据路径:", this.dataPath);

      let data: string | null = null;

      // 读取文件
      if (!window.electronAPI) {
        throw new Error("Electron API 不可用");
      }

      console.log("📄 读取文件:", DATA_FILE_NAME);
      data = await window.electronAPI.readFile("", DATA_FILE_NAME);
      console.log("📊 文件读取结果:", {
        hasData: !!data,
        dataLength: data?.length || 0,
        dataPreview: data?.substring(0, 100) + "...",
      });

      if (!data) {
        // 返回默认配置
        const defaultConfig: ConnectionConfig = {
          version: APP_VERSION,
          groups: [],
          settings: DEFAULT_SETTINGS,
        };
        return { success: true, data: defaultConfig };
      }

      console.log("🔍 解析JSON数据...");
      const config: ConnectionConfig = JSON.parse(data);
      console.log("📋 解析后的配置:", {
        version: config.version,
        groupsCount: config.groups?.length || 0,
        hasSettings: !!config.settings,
        groupsPreview: config.groups?.map((g) => ({
          id: g.id,
          name: g.name,
          childrenCount: g.children?.length || 0,
        })),
      });

      // 验证加密密钥
      console.log("🔐 验证加密密钥...");
      const keyValid = await encryptionService.verifyKeyFingerprint();
      console.log("🔑 密钥验证结果:", keyValid);
      if (!keyValid) {
        console.warn("⚠️ 加密密钥不匹配，可能导致解密失败");
      }

      // 解密敏感数据
      try {
        console.log("🔓 开始解密连接数据...");
        const originalGroupsCount = config.groups?.length || 0;
        config.groups = this.decryptGroups(config.groups);
        const decryptedGroupsCount = config.groups?.length || 0;
        console.log("✅ 连接配置解密成功:", {
          originalGroupsCount,
          decryptedGroupsCount,
          decryptedGroups: config.groups?.map((g) => ({
            id: g.id,
            name: g.name,
            childrenCount: g.children?.length || 0,
          })),
        });
      } catch (error) {
        console.error("❌ 解密连接配置失败:", error);
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

      // 写入文件
      if (!window.electronAPI) {
        throw new Error("Electron API 不可用");
      }
      await window.electronAPI.writeFile("", DATA_FILE_NAME, data);

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

      // 读取设置文件
      if (!window.electronAPI) {
        throw new Error("Electron API 不可用");
      }
      data = await window.electronAPI.readFile("", SETTINGS_FILE_NAME);

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

      // 写入设置文件
      if (!window.electronAPI) {
        throw new Error("Electron API 不可用");
      }
      await window.electronAPI.writeFile("", SETTINGS_FILE_NAME, data);

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
      // 只导出连接相关的数据，不包含应用设置
      const exportData = {
        version: config.version,
        groups: includePasswords
          ? config.groups
          : this.removePasswords(config.groups),
      };

      console.log("导出连接数据:", {
        groupsCount: exportData.groups.length,
        version: exportData.version,
        includePasswords,
      });

      const data = JSON.stringify(exportData, null, 2);

      // 导出文件
      if (!window.electronAPI) {
        throw new Error("Electron API 不可用");
      }

      // 验证文件路径
      if (!filePath || typeof filePath !== "string") {
        throw new Error("无效的文件路径");
      }

      // 分离目录和文件名
      const lastSlashIndex = Math.max(
        filePath.lastIndexOf("/"),
        filePath.lastIndexOf("\\")
      );
      const fileName =
        lastSlashIndex >= 0 ? filePath.substring(lastSlashIndex + 1) : filePath;
      const dirPath =
        lastSlashIndex >= 0 ? filePath.substring(0, lastSlashIndex) : "";

      console.log("导出文件路径信息:", { filePath, dirPath, fileName });

      // 使用完整路径写入文件
      await window.electronAPI.writeFile(dirPath, fileName, data);

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
   * 导出连接配置（包含明文密码，可跨机器使用）
   */
  public async exportConnectionsWithPasswords(
    config: ConnectionConfig,
    filePath: string
  ): Promise<OperationResult> {
    try {
      // 只导出连接相关的数据，不包含应用设置
      const exportData = {
        version: config.version,
        groups: this.decryptPasswordsForExport(config.groups),
        exportInfo: {
          exportedAt: new Date().toISOString(),
          exportedBy: "RemoteManagement",
          version: config.version,
          passwordEncrypted: false,
          note: "此文件包含明文密码，可在其他机器上导入使用，请妥善保管",
        },
      };

      console.log("导出连接数据:", {
        groupsCount: exportData.groups.length,
        version: exportData.version,
        hasExportInfo: !!exportData.exportInfo,
      });

      const data = JSON.stringify(exportData, null, 2);

      // 导出文件
      if (!window.electronAPI) {
        throw new Error("Electron API 不可用");
      }

      // 验证文件路径
      if (!filePath || typeof filePath !== "string") {
        throw new Error("无效的文件路径");
      }

      // 分离目录和文件名
      const lastSlashIndex = Math.max(
        filePath.lastIndexOf("/"),
        filePath.lastIndexOf("\\")
      );
      const fileName =
        lastSlashIndex >= 0 ? filePath.substring(lastSlashIndex + 1) : filePath;
      const dirPath =
        lastSlashIndex >= 0 ? filePath.substring(0, lastSlashIndex) : "";

      console.log("导出文件路径信息:", { filePath, dirPath, fileName });

      // 使用完整路径写入文件
      await window.electronAPI.writeFile(dirPath, fileName, data);

      return {
        success: true,
        message: "导出成功（包含明文密码）",
      };
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
          console.log("🔍 解密连接项:", {
            name: child.name,
            hasPassword: !!child.password,
            passwordLength: child.password?.length || 0,
            passwordPreview: child.password?.substring(0, 10) + "...",
          });

          const decrypted = encryptionService.decryptObject(child, [
            "password",
          ]);

          console.log("🔓 解密结果:", {
            name: decrypted.name,
            hasPassword: !!decrypted.password,
            passwordLength: decrypted.password?.length || 0,
            passwordPreview: decrypted.password ? "***" : "无",
          });

          return decrypted;
        }
      }),
    }));
  }

  /**
   * 为导出解密密码（明文导出）
   */
  private decryptPasswordsForExport(
    groups: ConnectionGroup[]
  ): ConnectionGroup[] {
    return groups.map((group) => ({
      ...group,
      children: group.children.map((child) => {
        if (isConnectionGroup(child)) {
          // 递归处理子分组
          return this.decryptPasswordsForExport([child])[0];
        } else if (isConnectionItem(child) && child.password) {
          // 密码在loadConnections时已经被解密，直接使用明文密码
          console.log("📋 导出连接密码:", {
            connectionName: child.name,
            hasPassword: !!child.password,
            passwordLength: child.password?.length || 0,
            passwordPreview: child.password ? "***" : "空",
          });

          return {
            ...child,
            password: child.password, // 直接使用已解密的密码
          };
        } else {
          return child;
        }
      }),
    }));
  }

  /**
   * 导入连接配置
   */
  public async importConnections(
    filePath: string
  ): Promise<OperationResult<{ conflicts: ConflictInfo[]; imported: number }>> {
    try {
      console.log("📥 开始导入连接配置:", filePath);

      // 读取导入文件
      if (!window.electronAPI) {
        throw new Error("Electron API 不可用");
      }

      // 分离目录和文件名
      const lastSlashIndex = Math.max(
        filePath.lastIndexOf("/"),
        filePath.lastIndexOf("\\")
      );
      const fileName =
        lastSlashIndex >= 0 ? filePath.substring(lastSlashIndex + 1) : filePath;
      const dirPath =
        lastSlashIndex >= 0 ? filePath.substring(0, lastSlashIndex) : "";

      console.log("📄 读取导入文件:", { filePath, dirPath, fileName });

      const importData = await window.electronAPI.readFile(dirPath, fileName);
      if (!importData) {
        throw new Error("无法读取导入文件");
      }

      // 解析导入数据
      const importConfig = JSON.parse(importData);
      console.log("📋 导入配置解析:", {
        version: importConfig.version,
        groupsCount: importConfig.groups?.length || 0,
        hasExportInfo: !!importConfig.exportInfo,
      });

      // 验证导入数据格式
      if (!importConfig.groups || !Array.isArray(importConfig.groups)) {
        throw new Error("导入文件格式不正确：缺少groups数组");
      }

      // 加载当前配置
      const currentResult = await this.loadConnections();
      if (!currentResult.success || !currentResult.data) {
        throw new Error("无法加载当前配置");
      }

      // 合并配置并检测冲突
      const mergeResult = this.mergeConfigurations(
        currentResult.data,
        importConfig
      );

      console.log("🔄 配置合并结果:", {
        conflictsCount: mergeResult.conflicts.length,
        importedCount: mergeResult.imported,
        conflicts: mergeResult.conflicts.map((c) => ({
          type: c.type,
          name: c.existing.name,
          action: c.action,
        })),
      });

      // 保存合并后的配置
      const saveResult = await this.saveConnections(mergeResult.mergedConfig);
      if (!saveResult.success) {
        throw new Error("保存合并配置失败: " + saveResult.error);
      }

      console.log("✅ 连接配置导入成功");
      return {
        success: true,
        data: {
          conflicts: mergeResult.conflicts,
          imported: mergeResult.imported,
        },
      };
    } catch (error) {
      console.error("❌ 导入连接配置失败:", error);
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  /**
   * 合并两个配置，检测并处理冲突
   */
  private mergeConfigurations(
    currentConfig: ConnectionConfig,
    importConfig: any
  ): MergeResult {
    const conflicts: ConflictInfo[] = [];
    let imported = 0;

    // 创建合并后的配置副本
    const mergedConfig: ConnectionConfig = {
      ...currentConfig,
      groups: [...currentConfig.groups],
    };

    // 处理导入的分组
    for (const importGroup of importConfig.groups) {
      const result = this.mergeGroup(mergedConfig.groups, importGroup, "");
      conflicts.push(...result.conflicts);
      imported += result.imported;
    }

    return {
      mergedConfig,
      conflicts,
      imported,
    };
  }

  /**
   * 合并分组
   */
  private mergeGroup(
    targetGroups: ConnectionGroup[],
    importGroup: any,
    parentPath: string
  ): MergeResult {
    const conflicts: ConflictInfo[] = [];
    let imported = 0;

    const groupPath = parentPath
      ? `${parentPath}/${importGroup.name}`
      : importGroup.name;

    // 检查分组是否已存在
    const existingGroup = targetGroups.find((g) => g.name === importGroup.name);

    if (existingGroup) {
      // 分组已存在，合并子项
      console.log(`📁 分组已存在，合并子项: ${groupPath}`);

      for (const child of importGroup.children || []) {
        if (isConnectionGroup(child)) {
          // 递归处理子分组
          const result = this.mergeGroup(
            existingGroup.children as ConnectionGroup[],
            child,
            groupPath
          );
          conflicts.push(...result.conflicts);
          imported += result.imported;
        } else {
          // 处理连接项
          const result = this.mergeConnection(existingGroup, child, groupPath);
          if (result.conflict) {
            conflicts.push(result.conflict);
          }
          if (result.imported) {
            imported++;
          }
        }
      }
    } else {
      // 新分组，直接添加
      console.log(`📁 添加新分组: ${groupPath}`);

      const newGroup: ConnectionGroup = {
        id: uuidv4(),
        name: importGroup.name,
        children: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // 处理分组中的子项
      for (const child of importGroup.children || []) {
        if (isConnectionGroup(child)) {
          // 递归处理子分组
          const childGroup: ConnectionGroup = {
            id: uuidv4(),
            name: child.name,
            children: [],
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          newGroup.children.push(childGroup);

          const result = this.mergeGroup([childGroup], child, groupPath);
          conflicts.push(...result.conflicts);
          imported += result.imported;
        } else {
          // 添加连接项
          const newConnection: ConnectionItem = {
            ...child,
            id: uuidv4(),
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          // 密码处理：保持明文状态，让saveConnections统一加密
          if (child.password) {
            if (!encryptionService.isPasswordEncrypted(child.password)) {
              console.log("📝 保持明文密码:", {
                connectionName: child.name,
                passwordLength: child.password.length,
              });
              newConnection.password = child.password; // 保持明文
            } else {
              console.log("🔓 解密已加密密码:", {
                connectionName: child.name,
                passwordLength: child.password.length,
              });
              // 如果是加密密码，先解密为明文
              newConnection.password = encryptionService.decrypt(
                child.password
              );
            }
          }

          newGroup.children.push(newConnection);
          imported++;
        }
      }

      targetGroups.push(newGroup);
      imported++; // 分组本身也算导入项
    }

    return { mergedConfig: null as any, conflicts, imported };
  }

  /**
   * 合并连接项
   */
  private mergeConnection(
    targetGroup: ConnectionGroup,
    importConnection: any,
    groupPath: string
  ): { conflict?: ConflictInfo; imported: boolean } {
    const connectionPath = `${groupPath}/${importConnection.name}`;

    // 检查连接是否已存在（按名称和主机）
    const existingConnection = targetGroup.children.find(
      (child) =>
        !isConnectionGroup(child) &&
        child.name === importConnection.name &&
        child.host === importConnection.host
    ) as ConnectionItem;

    if (existingConnection) {
      // 连接已存在，创建冲突信息
      console.log(`⚠️ 连接冲突: ${connectionPath}`);

      const conflict: ConflictInfo = {
        type: "connection",
        path: connectionPath,
        existing: existingConnection,
        imported: importConnection,
        action: "skip", // 默认跳过
      };

      return { conflict, imported: false };
    } else {
      // 新连接，直接添加
      console.log(`🔗 添加新连接: ${connectionPath}`);

      const newConnection: ConnectionItem = {
        ...importConnection,
        id: uuidv4(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // 密码处理：保持明文状态，让saveConnections统一加密
      if (importConnection.password) {
        if (!encryptionService.isPasswordEncrypted(importConnection.password)) {
          console.log("📝 保持明文密码:", {
            connectionName: importConnection.name,
            passwordLength: importConnection.password.length,
          });
          newConnection.password = importConnection.password; // 保持明文
        } else {
          console.log("🔓 解密已加密密码:", {
            connectionName: importConnection.name,
            passwordLength: importConnection.password.length,
          });
          // 如果是加密密码，先解密为明文
          newConnection.password = encryptionService.decrypt(
            importConnection.password
          );
        }
      }

      targetGroup.children.push(newConnection);
      return { imported: true };
    }
  }

  /**
   * 检查配置是否包含明文密码
   */
  private checkForPlaintextPasswords(config: ConnectionConfig): boolean {
    // 检查是否有导出信息标识
    const exportInfo = (config as any).exportInfo;
    if (exportInfo && exportInfo.passwordEncrypted === false) {
      return true;
    }

    // 如果没有导出信息，尝试检测密码格式
    // 加密的密码通常是Base64格式，明文密码通常不是
    return this.hasPlaintextPasswordsInGroups(config.groups);
  }

  /**
   * 检查分组中是否有明文密码
   */
  private hasPlaintextPasswordsInGroups(groups: ConnectionGroup[]): boolean {
    for (const group of groups) {
      for (const child of group.children) {
        if (isConnectionGroup(child)) {
          if (this.hasPlaintextPasswordsInGroups([child])) {
            return true;
          }
        } else if (isConnectionItem(child) && child.password) {
          // 简单检测：如果密码不像Base64编码，可能是明文
          if (!this.looksLikeEncryptedPassword(child.password)) {
            return true;
          }
        }
      }
    }
    return false;
  }

  /**
   * 检查密码是否看起来像加密的
   */
  private looksLikeEncryptedPassword(password: string): boolean {
    // 加密的密码通常是Base64格式，长度较长且包含特定字符
    const base64Regex = /^[A-Za-z0-9+/]+=*$/;
    return password.length > 20 && base64Regex.test(password);
  }

  /**
   * 加密明文密码
   */
  private encryptPlaintextPasswords(
    groups: ConnectionGroup[]
  ): ConnectionGroup[] {
    return groups.map((group) => ({
      ...group,
      children: group.children.map((child) => {
        if (isConnectionGroup(child)) {
          return this.encryptPlaintextPasswords([child])[0];
        } else if (isConnectionItem(child) && child.password) {
          // 如果是明文密码，进行加密
          if (!this.looksLikeEncryptedPassword(child.password)) {
            return {
              ...child,
              password: encryptionService.encrypt(child.password),
            };
          }
        }
        return child;
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
