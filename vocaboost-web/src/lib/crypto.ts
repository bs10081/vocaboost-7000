import type { LearningProgress, StudySession, Settings } from '@/types/vocabulary'

/**
 * Web Crypto API based encryption utilities for zero-knowledge sync
 *
 * Security:
 * - PBKDF2 with 100,000 iterations for key derivation
 * - AES-256-GCM for encryption
 * - Random salt and IV for each encryption
 * - SHA-256 for PIN hashing
 */

// Constants
const PBKDF2_ITERATIONS = 100000
const KEY_LENGTH = 256 // bits
const SALT_LENGTH = 16 // bytes
const IV_LENGTH = 12 // bytes (96 bits for GCM)

export interface SyncData {
  progress: [number, LearningProgress][]
  sessions: StudySession[]
  settings: Settings
  username: string | null
  exportedAt: string
  version: string
}

export interface EncryptionResult {
  encryptedData: string // Base64
  iv: string // Base64
  salt: string // Base64
}

/**
 * Derive an encryption key from PIN using PBKDF2
 */
async function deriveKey(pin: string, salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder()
  const pinBuffer = encoder.encode(pin)

  // Import PIN as key material
  const keyMaterial = await crypto.subtle.importKey('raw', pinBuffer, 'PBKDF2', false, ['deriveKey'])

  // Derive AES-GCM key
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: KEY_LENGTH },
    false,
    ['encrypt', 'decrypt']
  )
}

/**
 * Encrypt data with AES-GCM
 */
export async function encryptData(data: SyncData, pin: string): Promise<EncryptionResult> {
  // Generate random salt and IV
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH))
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH))

  // Derive key from PIN
  const key = await deriveKey(pin, salt)

  // Encode data as JSON
  const encoder = new TextEncoder()
  const dataBuffer = encoder.encode(JSON.stringify(data))

  // Encrypt with AES-GCM
  const encryptedBuffer = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, dataBuffer)

  // Convert to Base64 for transmission
  return {
    encryptedData: arrayBufferToBase64(encryptedBuffer),
    iv: arrayBufferToBase64(iv),
    salt: arrayBufferToBase64(salt),
  }
}

/**
 * Decrypt data with AES-GCM
 */
export async function decryptData(
  encryptedDataB64: string,
  ivB64: string,
  saltB64: string,
  pin: string
): Promise<SyncData> {
  // Decode from Base64
  const encryptedBuffer = base64ToArrayBuffer(encryptedDataB64)
  const iv = base64ToArrayBuffer(ivB64)
  const salt = base64ToArrayBuffer(saltB64)

  // Derive key from PIN
  const key = await deriveKey(pin, new Uint8Array(salt))

  // Decrypt with AES-GCM
  const decryptedBuffer = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: new Uint8Array(iv) }, key, encryptedBuffer)

  // Decode JSON
  const decoder = new TextDecoder()
  const jsonString = decoder.decode(decryptedBuffer)

  return JSON.parse(jsonString)
}

/**
 * Create SHA-256 hash of PIN for server validation
 */
export async function hashPin(pin: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(pin)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  return arrayBufferToHex(hashBuffer)
}

/**
 * Validate PIN format (6 digits)
 */
export function validatePin(pin: string): boolean {
  return /^\d{6}$/.test(pin)
}

/**
 * Parse full ID into username and tag
 */
export function parseFullId(fullId: string): { username: string; tag: string } | null {
  const match = fullId.match(/^(.+)#([A-Z0-9]{6})$/)
  if (!match) return null
  return {
    username: match[1],
    tag: match[2],
  }
}

/**
 * Format username and tag into full ID
 */
export function formatFullId(username: string, tag: string): string {
  return `${username}#${tag}`
}

// Utility functions

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes.buffer
}

function arrayBufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}
