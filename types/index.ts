export interface User {
  id: string;
  email: string;
  username: string;
  firstName?: string;
  lastName?: string;
  imageUrl?: string;
  createdAt: string;
}

export interface CommitFile {
  file_name: string;
  file_path: string;
  file_content: string;
  file_type: string;
}

export interface ProjectFileData {
  id: string;
  name: string;
  path: string;
  content: string;
  file_type: string;
}

export interface DeploymentFile {
  file_name: string;
  file_path: string;
  file_content: string;
  file_type: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  userId: string;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
  deployedUrl?: string;
  lastCommitId?: string;
}

export interface ProjectFile {
  file_type: string;
  id: string;
  projectId: string;
  name: string;
  path: string;
  content: string;
  type: 'html' | 'css' | 'js';
  size: number;
  createdAt: string;
  updatedAt: string;
}

export interface Commit {
  id: string;
  projectId: string;
  message: string;
  userId: string;
  timestamp: string;
  filesSnapshot: ProjectFile[];
  parentCommitId?: string;
}

export interface DeploymentConfig {
  projectId: string;
  commitId: string;
  url: string;
  status: 'pending' | 'deployed' | 'failed';
  createdAt: string;
}

export type FileType = 'html' | 'css' | 'js';

export interface CreateProjectData {
  name: string;
  description?: string;
  isPublic: boolean;
}

export interface CommitData {
  message: string;
  files: ProjectFile[];
}


// export type CommitFile = {
//   file_name: string;
//   file_path: string;
//   file_content: string;
//   file_type: string;
// };

// export type ProjectFile = {
//   name: string;
//   path: string;
//   content: string;
//   file_type: string;
// };

export type PreviewFile = {
  name: string;
  path: string;
  content: string;
  type: string;
};
