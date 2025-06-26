import CryptoJS from "crypto-js";
import { ENCRYPTION_KEY_LENGTH, ENCRYPTION_IV_LENGTH } from "@/utils/constants";

/**
 * 加密服务类
 * 提供密码和敏感数据的加密/解密功能
 */
export class EncryptionService {
  private static instance: EncryptionService;
  private masterKey: string = "";
  private isInitialized: boolean = false;

  private constructor() {}

  /**
   * 获取加密服务单例
   */
  public static getInstance(): EncryptionService {
    if (!EncryptionService.instance) {
      EncryptionService.instance = new EncryptionService();
    }
    return EncryptionService.instance;
  }

  /**
   * 初始化加密服务
   * @param masterPassword 主密码
   */
  public async initialize(masterPassword?: string): Promise<void> {
    try {
      if (masterPassword) {
        // 使用用户提供的主密码
        this.masterKey = this.deriveKey(masterPassword);
      } else {
        // 使用默认密钥（基于机器信息）
        this.masterKey = await this.generateDefaultKey();
      }
      this.isInitialized = true;
    } catch (error) {
      console.error("加密服务初始化失败:", error);
      throw new Error("加密服务初始化失败");
    }
  }

  /**
   * 检查是否已初始化
   */
  public isReady(): boolean {
    return this.isInitialized && this.masterKey.length > 0;
  }

  /**
   * 加密字符串
   * @param plaintext 明文
   * @returns 加密后的字符串
   */
  public encrypt(plaintext: string): string {
    if (!this.isReady()) {
      throw new Error("加密服务未初始化");
    }

    if (!plaintext) {
      return "";
    }

    try {
      // 生成随机IV
      const iv = CryptoJS.lib.WordArray.random(ENCRYPTION_IV_LENGTH);

      // 将密钥转换为WordArray
      const keyWordArray = CryptoJS.enc.Hex.parse(this.masterKey);

      // 使用AES加密
      const encrypted = CryptoJS.AES.encrypt(plaintext, keyWordArray, {
        iv: iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7,
      });

      // 将IV和密文组合
      const combined = iv.concat(encrypted.ciphertext);

      // 返回Base64编码的结果
      return combined.toString(CryptoJS.enc.Base64);
    } catch (error) {
      console.error("加密失败:", error);
      throw new Error("加密失败");
    }
  }

  /**
   * 解密字符串
   * @param ciphertext 密文
   * @returns 解密后的字符串
   */
  public decrypt(ciphertext: string): string {
    if (!this.isReady()) {
      throw new Error("加密服务未初始化");
    }

    if (!ciphertext) {
      return "";
    }

    try {
      // 解码Base64
      const combined = CryptoJS.enc.Base64.parse(ciphertext);

      // 提取IV和密文
      const iv = CryptoJS.lib.WordArray.create(
        combined.words.slice(0, ENCRYPTION_IV_LENGTH / 4)
      );
      const encrypted = CryptoJS.lib.WordArray.create(
        combined.words.slice(ENCRYPTION_IV_LENGTH / 4)
      );

      // 将密钥转换为WordArray
      const keyWordArray = CryptoJS.enc.Hex.parse(this.masterKey);

      // 解密
      const decrypted = CryptoJS.AES.decrypt(
        { ciphertext: encrypted } as any,
        keyWordArray,
        {
          iv: iv,
          mode: CryptoJS.mode.CBC,
          padding: CryptoJS.pad.Pkcs7,
        }
      );

      // 转换为UTF-8字符串
      return decrypted.toString(CryptoJS.enc.Utf8);
    } catch (error) {
      console.error("解密失败:", error);
      throw new Error("解密失败");
    }
  }

  /**
   * 批量加密对象中的敏感字段
   * @param obj 要加密的对象
   * @param sensitiveFields 敏感字段列表
   * @returns 加密后的对象
   */
  public encryptObject<T extends Record<string, any>>(
    obj: T,
    sensitiveFields: (keyof T)[]
  ): T {
    const result = { ...obj };

    for (const field of sensitiveFields) {
      if (result[field] && typeof result[field] === "string") {
        result[field] = this.encrypt(result[field] as string) as T[keyof T];
      }
    }

    return result;
  }

  /**
   * 批量解密对象中的敏感字段
   * @param obj 要解密的对象
   * @param sensitiveFields 敏感字段列表
   * @returns 解密后的对象
   */
  public decryptObject<T extends Record<string, any>>(
    obj: T,
    sensitiveFields: (keyof T)[]
  ): T {
    const result = { ...obj };

    for (const field of sensitiveFields) {
      if (result[field] && typeof result[field] === "string") {
        const fieldValue = result[field] as string;

        // 检查是否是加密数据（Base64格式且长度合理）
        if (this.isEncryptedData(fieldValue)) {
          try {
            console.log(
              `开始解密字段 ${String(field)}，加密值长度: ${
                fieldValue.length
              }，加密值预览: ${fieldValue.substring(0, 20)}...`
            );
            const decrypted = this.decrypt(fieldValue);
            console.log(
              `解密字段 ${String(field)} 成功，解密后长度: ${
                decrypted.length
              }，解密后预览: ${decrypted.substring(0, 10)}...，内容: ${
                decrypted ? "***" : "(空)"
              }`
            );
            result[field] = decrypted as T[keyof T];
          } catch (error) {
            console.warn(`解密字段 ${String(field)} 失败:`, error);
            // 如果解密失败，清空该字段而不是保持加密值
            result[field] = "" as T[keyof T];
          }
        } else {
          // 如果不是加密数据，检查是否是错误的加密字符串
          if (
            field === "password" &&
            fieldValue.length > 10 &&
            /^[A-Za-z0-9+/=]+$/.test(fieldValue)
          ) {
            console.warn(
              `字段 ${String(field)} 疑似错误的加密字符串，长度: ${
                fieldValue.length
              }，清空处理`
            );
            result[field] = "" as T[keyof T];
          } else {
            // 如果不是加密数据，保持原值（可能是明文密码）
            console.log(
              `字段 ${String(field)} 不是加密数据，原值长度: ${
                fieldValue.length
              }，保持原值`
            );
          }
        }
      }
    }

    return result;
  }

  /**
   * 检查密码是否已加密
   * @param password 要检查的密码
   * @returns 是否已加密
   */
  public isPasswordEncrypted(password: string): boolean {
    return this.isEncryptedData(password);
  }

  /**
   * 检查字符串是否是加密数据
   * @param data 要检查的字符串
   * @returns 是否是加密数据
   */
  private isEncryptedData(data: string): boolean {
    try {
      // 检查是否是有效的Base64字符串
      if (!/^[A-Za-z0-9+/]*={0,2}$/.test(data)) {
        return false;
      }

      // 检查长度是否合理（加密数据通常比较长）
      if (data.length < 20) {
        return false;
      }

      // 尝试解码Base64
      const decoded = CryptoJS.enc.Base64.parse(data);

      // 检查解码后的长度是否合理（至少包含IV）
      return decoded.words.length >= ENCRYPTION_IV_LENGTH / 4;
    } catch (error) {
      return false;
    }
  }

  /**
   * 生成密码哈希（用于验证）
   * @param password 密码
   * @param salt 盐值
   * @returns 哈希值
   */
  public hashPassword(password: string, salt?: string): string {
    const saltToUse = salt || CryptoJS.lib.WordArray.random(128 / 8).toString();
    const hash = CryptoJS.PBKDF2(password, saltToUse, {
      keySize: 256 / 32,
      iterations: 10000,
    });
    return saltToUse + ":" + hash.toString();
  }

  /**
   * 验证密码
   * @param password 密码
   * @param hash 存储的哈希值
   * @returns 是否匹配
   */
  public verifyPassword(password: string, hash: string): boolean {
    try {
      const [salt, storedHash] = hash.split(":");
      const computedHash = CryptoJS.PBKDF2(password, salt, {
        keySize: 256 / 32,
        iterations: 10000,
      }).toString();
      return computedHash === storedHash;
    } catch (error) {
      return false;
    }
  }

  /**
   * 生成随机密码
   * @param length 密码长度
   * @param includeSymbols 是否包含特殊字符
   * @returns 随机密码
   */
  public generateRandomPassword(
    length: number = 16,
    includeSymbols: boolean = true
  ): string {
    const lowercase = "abcdefghijklmnopqrstuvwxyz";
    const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const numbers = "0123456789";
    const symbols = "!@#$%^&*()_+-=[]{}|;:,.<>?";

    let charset = lowercase + uppercase + numbers;
    if (includeSymbols) {
      charset += symbols;
    }

    let password = "";
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }

    return password;
  }

  /**
   * 从主密码派生密钥
   * @param masterPassword 主密码
   * @returns 派生的密钥
   */
  private deriveKey(masterPassword: string): string {
    const salt = "RemoteManagementSystem"; // 固定盐值
    const key = CryptoJS.PBKDF2(masterPassword, salt, {
      keySize: ENCRYPTION_KEY_LENGTH / 4,
      iterations: 10000,
    });
    return key.toString();
  }

  /**
   * 存储密钥指纹
   */
  private async storeKeyFingerprint(fingerprint: string): Promise<void> {
    try {
      if (window.electronAPI) {
        await window.electronAPI.writeFile(
          "",
          "encryption-key-fingerprint.txt",
          fingerprint
        );
      }
    } catch (error) {
      console.warn("存储密钥指纹失败:", error);
    }
  }

  /**
   * 获取存储的密钥指纹
   */
  private async getStoredKeyFingerprint(): Promise<string | null> {
    try {
      if (window.electronAPI) {
        return await window.electronAPI.readFile(
          "",
          "encryption-key-fingerprint.txt"
        );
      }
      return null;
    } catch (error) {
      // 文件不存在或读取失败
      return null;
    }
  }

  /**
   * 生成默认密钥（基于机器信息）
   * @returns 默认密钥
   */
  private async generateDefaultKey(): Promise<string> {
    try {
      // 使用更稳定的机器信息生成密钥
      // 避免使用可能变化的信息如屏幕分辨率和userAgent
      const stableMachineInfo = [
        navigator.platform,
        navigator.language,
        new Date().getTimezoneOffset().toString(),
        "RemoteManagementSystem-v1.0", // 版本标识
      ].join("|");

      console.log("生成默认密钥，机器信息:", stableMachineInfo);

      const key = CryptoJS.SHA256(stableMachineInfo)
        .toString()
        .substring(0, ENCRYPTION_KEY_LENGTH);

      // 存储密钥指纹用于验证
      const keyFingerprint = CryptoJS.SHA256(key).toString().substring(0, 8);
      await this.storeKeyFingerprint(keyFingerprint);

      return key;
    } catch (error) {
      // 如果无法获取机器信息，使用固定密钥
      console.warn("无法生成机器特定密钥，使用固定密钥");
      const fallbackKey = CryptoJS.SHA256("DefaultRemoteManagementKey-Fallback")
        .toString()
        .substring(0, ENCRYPTION_KEY_LENGTH);

      // 存储回退密钥指纹
      const keyFingerprint = CryptoJS.SHA256(fallbackKey)
        .toString()
        .substring(0, 8);
      await this.storeKeyFingerprint(keyFingerprint);

      return fallbackKey;
    }
  }

  /**
   * 验证当前密钥是否与存储的指纹匹配
   * @returns 是否匹配
   */
  public async verifyKeyFingerprint(): Promise<boolean> {
    try {
      const storedFingerprint = await this.getStoredKeyFingerprint();
      if (!storedFingerprint) {
        return true; // 如果没有存储指纹，认为是首次使用
      }

      const currentFingerprint = CryptoJS.SHA256(this.masterKey)
        .toString()
        .substring(0, 8);
      const matches = currentFingerprint === storedFingerprint;

      if (!matches) {
        console.warn("密钥指纹不匹配，可能需要重新生成密钥");
        console.log("存储的指纹:", storedFingerprint);
        console.log("当前指纹:", currentFingerprint);
      }

      return matches;
    } catch (error) {
      console.error("验证密钥指纹失败:", error);
      return false;
    }
  }

  /**
   * 更改主密码
   * @param oldPassword 旧密码
   * @param newPassword 新密码
   * @returns 是否成功
   */
  public async changeMasterPassword(
    oldPassword: string,
    newPassword: string
  ): Promise<boolean> {
    try {
      const oldKey = this.deriveKey(oldPassword);
      if (oldKey !== this.masterKey) {
        return false;
      }

      this.masterKey = this.deriveKey(newPassword);
      return true;
    } catch (error) {
      console.error("更改主密码失败:", error);
      return false;
    }
  }

  /**
   * 清理敏感数据
   */
  public cleanup(): void {
    this.masterKey = "";
    this.isInitialized = false;
  }
}

// 导出单例实例
export const encryptionService = EncryptionService.getInstance();
