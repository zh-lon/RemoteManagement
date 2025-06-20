import CryptoJS from 'crypto-js';
import { ENCRYPTION_KEY_LENGTH, ENCRYPTION_IV_LENGTH } from '@/utils/constants';

/**
 * 加密服务类
 * 提供密码和敏感数据的加密/解密功能
 */
export class EncryptionService {
  private static instance: EncryptionService;
  private masterKey: string = '';
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
      console.error('加密服务初始化失败:', error);
      throw new Error('加密服务初始化失败');
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
      throw new Error('加密服务未初始化');
    }

    if (!plaintext) {
      return '';
    }

    try {
      // 生成随机IV
      const iv = CryptoJS.lib.WordArray.random(ENCRYPTION_IV_LENGTH);
      
      // 使用AES加密
      const encrypted = CryptoJS.AES.encrypt(plaintext, this.masterKey, {
        iv: iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
      });

      // 将IV和密文组合
      const combined = iv.concat(encrypted.ciphertext);
      
      // 返回Base64编码的结果
      return combined.toString(CryptoJS.enc.Base64);
    } catch (error) {
      console.error('加密失败:', error);
      throw new Error('加密失败');
    }
  }

  /**
   * 解密字符串
   * @param ciphertext 密文
   * @returns 解密后的字符串
   */
  public decrypt(ciphertext: string): string {
    if (!this.isReady()) {
      throw new Error('加密服务未初始化');
    }

    if (!ciphertext) {
      return '';
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

      // 解密
      const decrypted = CryptoJS.AES.decrypt(
        { ciphertext: encrypted } as any,
        this.masterKey,
        {
          iv: iv,
          mode: CryptoJS.mode.CBC,
          padding: CryptoJS.pad.Pkcs7
        }
      );

      // 转换为UTF-8字符串
      return decrypted.toString(CryptoJS.enc.Utf8);
    } catch (error) {
      console.error('解密失败:', error);
      throw new Error('解密失败');
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
      if (result[field] && typeof result[field] === 'string') {
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
      if (result[field] && typeof result[field] === 'string') {
        try {
          result[field] = this.decrypt(result[field] as string) as T[keyof T];
        } catch (error) {
          console.warn(`解密字段 ${String(field)} 失败:`, error);
          // 保持原值，可能是未加密的数据
        }
      }
    }
    
    return result;
  }

  /**
   * 生成密码哈希（用于验证）
   * @param password 密码
   * @param salt 盐值
   * @returns 哈希值
   */
  public hashPassword(password: string, salt?: string): string {
    const saltToUse = salt || CryptoJS.lib.WordArray.random(128/8).toString();
    const hash = CryptoJS.PBKDF2(password, saltToUse, {
      keySize: 256/32,
      iterations: 10000
    });
    return saltToUse + ':' + hash.toString();
  }

  /**
   * 验证密码
   * @param password 密码
   * @param hash 存储的哈希值
   * @returns 是否匹配
   */
  public verifyPassword(password: string, hash: string): boolean {
    try {
      const [salt, storedHash] = hash.split(':');
      const computedHash = CryptoJS.PBKDF2(password, salt, {
        keySize: 256/32,
        iterations: 10000
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
  public generateRandomPassword(length: number = 16, includeSymbols: boolean = true): string {
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';
    
    let charset = lowercase + uppercase + numbers;
    if (includeSymbols) {
      charset += symbols;
    }
    
    let password = '';
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
    const salt = 'RemoteManagementSystem'; // 固定盐值
    const key = CryptoJS.PBKDF2(masterPassword, salt, {
      keySize: ENCRYPTION_KEY_LENGTH / 4,
      iterations: 10000
    });
    return key.toString();
  }

  /**
   * 生成默认密钥（基于机器信息）
   * @returns 默认密钥
   */
  private async generateDefaultKey(): Promise<string> {
    try {
      // 在Electron环境中，可以使用机器信息生成密钥
      const machineInfo = [
        navigator.userAgent,
        navigator.platform,
        screen.width.toString(),
        screen.height.toString(),
        new Date().getTimezoneOffset().toString()
      ].join('|');
      
      const key = CryptoJS.SHA256(machineInfo).toString().substring(0, ENCRYPTION_KEY_LENGTH);
      return key;
    } catch (error) {
      // 如果无法获取机器信息，使用固定密钥
      console.warn('无法生成机器特定密钥，使用默认密钥');
      return CryptoJS.SHA256('DefaultRemoteManagementKey').toString().substring(0, ENCRYPTION_KEY_LENGTH);
    }
  }

  /**
   * 更改主密码
   * @param oldPassword 旧密码
   * @param newPassword 新密码
   * @returns 是否成功
   */
  public async changeMasterPassword(oldPassword: string, newPassword: string): Promise<boolean> {
    try {
      const oldKey = this.deriveKey(oldPassword);
      if (oldKey !== this.masterKey) {
        return false;
      }
      
      this.masterKey = this.deriveKey(newPassword);
      return true;
    } catch (error) {
      console.error('更改主密码失败:', error);
      return false;
    }
  }

  /**
   * 清理敏感数据
   */
  public cleanup(): void {
    this.masterKey = '';
    this.isInitialized = false;
  }
}

// 导出单例实例
export const encryptionService = EncryptionService.getInstance();
