// Client-side encryption utilities using Web Crypto API

export class EncryptionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EncryptionError';
  }
}

// Generate a random salt for key derivation
export const generateSalt = (): Uint8Array => {
  return crypto.getRandomValues(new Uint8Array(32));
};

// Generate a random IV for AES-GCM
export const generateIV = (): Uint8Array => {
  return crypto.getRandomValues(new Uint8Array(12));
};

// Convert ArrayBuffer to hex string
export const bufferToHex = (buffer: ArrayBuffer): string => {
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
};

// Convert hex string to ArrayBuffer
export const hexToBuffer = (hex: string): ArrayBuffer => {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes.buffer;
};

// Convert Uint8Array to ArrayBuffer safely
const uint8ArrayToArrayBuffer = (uint8Array: Uint8Array): ArrayBuffer => {
  return uint8Array.buffer.slice(uint8Array.byteOffset, uint8Array.byteOffset + uint8Array.byteLength) as ArrayBuffer;
};

// Derive encryption key from password using PBKDF2
export const deriveKeyPBKDF2 = async (
  password: string,
  salt: Uint8Array,
  iterations = 100000
): Promise<CryptoKey> => {
  try {
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      { name: 'PBKDF2' },
      false,
      ['deriveBits', 'deriveKey']
    );

    return await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: uint8ArrayToArrayBuffer(salt),
        iterations,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  } catch (error) {
    throw new EncryptionError(`Key derivation failed: ${error}`);
  }
};

// Encrypt data using AES-GCM
export const encryptData = async (
  data: ArrayBuffer,
  key: CryptoKey,
  iv: Uint8Array
): Promise<ArrayBuffer> => {
  try {
    return await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: uint8ArrayToArrayBuffer(iv)
      },
      key,
      data
    );
  } catch (error) {
    throw new EncryptionError(`Encryption failed: ${error}`);
  }
};

// Decrypt data using AES-GCM
export const decryptData = async (
  encryptedData: ArrayBuffer,
  key: CryptoKey,
  iv: Uint8Array
): Promise<ArrayBuffer> => {
  try {
    return await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: uint8ArrayToArrayBuffer(iv)
      },
      key,
      encryptedData
    );
  } catch (error) {
    throw new EncryptionError(`Decryption failed: ${error}`);
  }
};

// Encrypt a file
export const encryptFile = async (
  file: File,
  password: string,
  salt: Uint8Array
): Promise<{
  encryptedData: ArrayBuffer;
  iv: string;
  salt: string;
}> => {
  try {
    const key = await deriveKeyPBKDF2(password, salt);
    const iv = generateIV();
    const fileBuffer = await file.arrayBuffer();
    const encryptedData = await encryptData(fileBuffer, key, iv);

    return {
      encryptedData,
      iv: bufferToHex(uint8ArrayToArrayBuffer(iv)),
      salt: bufferToHex(uint8ArrayToArrayBuffer(salt))
    };
  } catch (error) {
    throw new EncryptionError(`File encryption failed: ${error}`);
  }
};

// Decrypt a file
export const decryptFile = async (
  encryptedData: ArrayBuffer,
  password: string,
  saltHex: string,
  ivHex: string
): Promise<ArrayBuffer> => {
  try {
    const salt = new Uint8Array(hexToBuffer(saltHex));
    const iv = new Uint8Array(hexToBuffer(ivHex));
    const key = await deriveKeyPBKDF2(password, salt);
    
    return await decryptData(encryptedData, key, iv);
  } catch (error) {
    throw new EncryptionError(`File decryption failed: ${error}`);
  }
};

// Generate SHA-256 hash for file integrity
export const generateFileHash = async (data: ArrayBuffer): Promise<string> => {
  const hash = await crypto.subtle.digest('SHA-256', data);
  return bufferToHex(hash);
};