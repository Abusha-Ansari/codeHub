import { FileType } from '@/types';

export const ALLOWED_FILE_TYPES: FileType[] = ['html', 'css', 'js'];
export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
export const MAX_PROJECT_NAME_LENGTH = 50;
export const MAX_DESCRIPTION_LENGTH = 500;
export const MAX_COMMIT_MESSAGE_LENGTH = 200;

export function validateFileName(name: string): { valid: boolean; error?: string } {
  if (!name || name.trim().length === 0) {
    return { valid: false, error: 'File name is required' };
  }

  if (name.length > 100) {
    return { valid: false, error: 'File name too long (max 100 characters)' };
  }

  const extension = name.split('.').pop()?.toLowerCase();
  if (!extension || !ALLOWED_FILE_TYPES.includes(extension as FileType)) {
    return { valid: false, error: 'Only .html, .css, and .js files are allowed' };
  }

  // Check for invalid characters
  const invalidChars = /[<>:"|?*\x00-\x1f]/;
  if (invalidChars.test(name)) {
    return { valid: false, error: 'File name contains invalid characters' };
  }

  return { valid: true };
}

export function validateFileContent(content: string, type: FileType): { valid: boolean; error?: string } {
  if (content.length > MAX_FILE_SIZE) {
    return { valid: false, error: 'File size exceeds 5MB limit' };
  }

  // Basic content validation based on file type
  switch (type) {
    case 'html':
      // Check for basic HTML structure (optional but recommended)
      break;
    case 'css':
      // Basic CSS syntax check could be added here
      break;
    case 'js':
      // Basic JS syntax check could be added here
      break;
  }

  return { valid: true };
}

export function validateProjectName(name: string): { valid: boolean; error?: string } {
  if (!name || name.trim().length === 0) {
    return { valid: false, error: 'Project name is required' };
  }

  if (name.length > MAX_PROJECT_NAME_LENGTH) {
    return { valid: false, error: `Project name too long (max ${MAX_PROJECT_NAME_LENGTH} characters)` };
  }

  // Check for valid project name (alphanumeric, spaces, hyphens, underscores)
  const validNamePattern = /^[a-zA-Z0-9\s\-_]+$/;
  if (!validNamePattern.test(name)) {
    return { valid: false, error: 'Project name can only contain letters, numbers, spaces, hyphens, and underscores' };
  }

  return { valid: true };
}

export function validateCommitMessage(message: string): { valid: boolean; error?: string } {
  if (!message || message.trim().length === 0) {
    return { valid: false, error: 'Commit message is required' };
  }

  if (message.length > MAX_COMMIT_MESSAGE_LENGTH) {
    return { valid: false, error: `Commit message too long (max ${MAX_COMMIT_MESSAGE_LENGTH} characters)` };
  }

  return { valid: true };
}

export function getFileTypeFromExtension(filename: string): FileType | null {
  const extension = filename.split('.').pop()?.toLowerCase();
  if (extension && ALLOWED_FILE_TYPES.includes(extension as FileType)) {
    return extension as FileType;
  }
  return null;
}
