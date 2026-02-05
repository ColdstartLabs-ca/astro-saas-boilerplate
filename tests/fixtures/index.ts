import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// ESM-compatible __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const fixturesPath = __dirname;

export const getFixturePath = (filename: string): string => {
  return join(fixturesPath, filename);
};

export const loadFixture = <T>(filename: string): T => {
  const content = readFileSync(join(fixturesPath, filename), 'utf-8');
  return JSON.parse(content) as T;
};

export interface IMockUpscaleResponse {
  imageData: string;
  creditsUsed: number;
  mode: string;
}

export const mockUpscaleSuccessResponse: IMockUpscaleResponse = {
  imageData:
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  creditsUsed: 1,
  mode: 'standard',
};

export const mockUpscaleErrorResponses = {
  insufficientCredits: {
    error: 'Insufficient credits',
    code: 'INSUFFICIENT_CREDITS',
    creditsRequired: 1,
    creditsAvailable: 0,
  },
  unauthorized: {
    error: 'Authentication required',
    code: 'UNAUTHORIZED',
  },
  serverError: {
    error: 'AI service temporarily unavailable',
    code: 'SERVICE_ERROR',
  },
  invalidFile: {
    error: 'Invalid file format. Only JPG, PNG, and WEBP are supported.',
    code: 'INVALID_FILE',
  },
  fileTooLarge: {
    error: 'File size exceeds the 5MB limit',
    code: 'FILE_TOO_LARGE',
  },
};

// Plan fixtures for centralized plan configuration in tests
export * from './plan-fixtures.js';
