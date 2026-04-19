import { vi } from 'vitest';

// Mock Electron safeStorage for credential encryption tests
vi.mock('electron', () => ({
  safeStorage: {
    isEncryptionAvailable: () => true,
    encryptString: (text: string) => Buffer.from(`encrypted:${text}`),
    decryptString: (buffer: Buffer) => buffer.toString().replace('encrypted:', ''),
  },
}));
