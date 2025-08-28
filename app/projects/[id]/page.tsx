'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { CodeEditor } from '@/components/ui/code-editor';
import { FileUpload } from '@/components/ui/file-upload';
import { Navbar } from '@/components/navbar';
import {
  ArrowLeft,
  FileText,
  Plus,
  Trash2,
  Eye,
  History,
  Clock,
  Rocket,
  ExternalLink,
  Globe,
  Lock,
  GitCommit,
  Upload,
  GitFork,
  AlertCircle,
} from 'lucide-react';
import Link from 'next/link';

interface ProjectFile {
  id: string;
  name: string;
  path: string;
  content: string;
  file_type: string;
  size: number;
  created_at: string;
  updated_at: string;
}

interface Commit {
  id: string;
  message: string;
  created_at: string;
  commit_files?: { count: number }[];
}

interface Deployment {
  id: string;
  url: string;
  status: string;
  created_at: string;
  commits?: {
    id: string;
    message: string;
    created_at: string;
  };
}

interface Project {
  id: string;
  name: string;
  description: string | null;
  is_public: boolean;
  deployed_url: string | null;
  created_at: string;
  updated_at: string;
  user_id: string;
  project_files: ProjectFile[];
}

export default function ProjectEditorPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useUser();
  const projectId = params.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [activeFile, setActiveFile] = useState<ProjectFile | null>(null);
  const [fileContent, setFileContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [, setSaving] = useState(false);
  const [, setHasUnsavedChanges] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showNewFileForm, setShowNewFileForm] = useState(false);
  const [showFileUpload, setShowFileUpload] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [commits, setCommits] = useState<Commit[]>([]);
  const [showCommitForm, setShowCommitForm] = useState(false);
  const [commitMessage, setCommitMessage] = useState('');
  const [committing, setCommitting] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [fileContents, setFileContents] = useState<Record<string, string>>({});
  const [, setDeployments] = useState<Deployment[]>([]);
  const [deploying, setDeploying] = useState(false);
  const [updatingVisibility, setUpdatingVisibility] = useState(false);
  const [forking, setForking] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [, setCurrentUserId] = useState<string | null>(null);

  /** -----------------------------
   *  Wrapped fetchers in useCallback
   *  ----------------------------- */
  const fetchProject = useCallback(async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch project');
      }
      const data = await response.json();
      setProject(data);

      // Check ownership
      if (user?.id && data.user_id) {
        // Get current user's database ID
        const userResponse = await fetch('/api/user');
        if (userResponse.ok) {
          const userData = await userResponse.json();
          setCurrentUserId(userData.id);
          setIsOwner(userData.id === data.user_id);
        }
      }

      // Initialize file contents map
      const contents: Record<string, string> = {};
      data.project_files?.forEach((file: ProjectFile) => {
        contents[file.id] = file.content;
      });
      setFileContents(contents);

      // Set the first file as active by default
      if (data.project_files && data.project_files.length > 0) {
        const indexFile =
          data.project_files.find((f: ProjectFile) => f.name === 'index.html') ||
          data.project_files[0];
        setActiveFile(indexFile);
        setFileContent(indexFile.content);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load project');
    } finally {
      setLoading(false);
    }
  }, [projectId, user?.id]);

  const fetchCommits = useCallback(async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/commits`);
      if (response.ok) {
        const data = await response.json();
        setCommits(data);
      }
    } catch (err) {
      console.error('Failed to fetch commits:', err);
    }
  }, [projectId]);

  const fetchDeployments = useCallback(async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/deploy`);
      if (response.ok) {
        const data = await response.json();
        setDeployments(data);
      }
    } catch (err) {
      console.error('Failed to fetch deployments:', err);
    }
  }, [projectId]);

  /** -----------------------------
   *  Effect runs once per projectId
   *  ----------------------------- */
  useEffect(() => {
    if (projectId) {
      fetchProject();
      fetchCommits();
      fetchDeployments();
    }
  }, [projectId, fetchProject, fetchCommits, fetchDeployments]);

  const saveAllFiles = async () => {
    if (!project || !project.project_files) return;
    
    setSaving(true);
    try {
      const savePromises = project.project_files.map(async (file) => {
        // Get the current content for this file from fileContents map
        const currentContent = fileContents[file.id] || file.content;
        
        const response = await fetch(`/api/projects/${projectId}/files/${file.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            content: currentContent,
          }),
        });

        if (!response.ok) {
          throw new Error(`Failed to save ${file.name}`);
        }

        return response.json();
      });

      const updatedFiles = await Promise.all(savePromises);
      
      // Update all files in the project
      setProject({
        ...project,
        project_files: updatedFiles,
      });

      // Update file contents map
      const newContents: Record<string, string> = {};
      updatedFiles.forEach(file => {
        newContents[file.id] = file.content;
      });
      setFileContents(newContents);

      // Update active file if it was one of the saved files
      if (activeFile) {
        const updatedActiveFile = updatedFiles.find(f => f.id === activeFile.id);
        if (updatedActiveFile) {
          setActiveFile(updatedActiveFile);
          setFileContent(updatedActiveFile.content);
        }
      }

      setHasUnsavedChanges(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save files');
    } finally {
      setSaving(false);
    }
  };

  const createFile = async () => {
    if (!newFileName.trim()) return;

    try {
      const response = await fetch(`/api/projects/${projectId}/files`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newFileName.trim(),
          content: getDefaultContent(newFileName.trim()),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create file');
      }

      // Add the new file to the project
      if (project) {
        setProject({
          ...project,
          project_files: [...project.project_files, data],
        });
      }

      setNewFileName('');
      setShowNewFileForm(false);
      setActiveFile(data);
      setFileContent(data.content);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create file');
    }
  };

  const handleFileUpload = async (file: File, content: string) => {
    try {
      const response = await fetch(`/api/projects/${projectId}/files`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: file.name,
          content: content,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to upload file');
      }

      // Add the new file to the project
      if (project) {
        setProject({
          ...project,
          project_files: [...project.project_files, data],
        });
      }

      setShowFileUpload(false);
      setActiveFile(data);
      setFileContent(data.content);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to upload file');
    }
  };

  const deleteFile = async (fileId: string, fileName: string) => {
    if (!confirm(`Are you sure you want to delete ${fileName}?`)) return;

    try {
      const response = await fetch(`/api/projects/${projectId}/files/${fileId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete file');
      }

      // Remove the file from the project
      if (project) {
        const updatedFiles = project.project_files.filter(f => f.id !== fileId);
        setProject({
          ...project,
          project_files: updatedFiles,
        });

        // If the deleted file was active, switch to another file
        if (activeFile?.id === fileId) {
          const nextFile = updatedFiles[0] || null;
          setActiveFile(nextFile);
          setFileContent(nextFile?.content || '');
        }
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete file');
    }
  };

  const createCommit = async () => {
    if (!commitMessage.trim()) return;

    setCommitting(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/commits`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: commitMessage.trim(),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create commit');
      }

      const newCommit = await response.json();
      setCommits([newCommit, ...commits]);
      setCommitMessage('');
      setShowCommitForm(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create commit');
    } finally {
      setCommitting(false);
    }
  };

  const restoreCommit = async (commitId: string) => {
    if (!confirm('Are you sure you want to restore to this commit? This will overwrite your current files.')) {
      return;
    }

    try {
      const response = await fetch(`/api/projects/${projectId}/commits/${commitId}`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to restore commit');
      }

      // Refresh project data
      await fetchProject();
      alert('Project restored to commit successfully!');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to restore commit');
    }
  };

  const openPreview = () => {
    const previewUrl = `/api/projects/${projectId}/preview`;
    window.open(previewUrl, '_blank');
  };

  const deployProject = async (commitId?: string) => {
    setDeploying(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/deploy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          commitId: commitId || null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to deploy project');
      }

      const deployment = await response.json();
      
      // Update deployments list
      await fetchDeployments();
      
      // Update project with new deployed URL
      await fetchProject();
      
      // Open the deployed site in a new tab
      window.open(deployment.url, '_blank');
      alert(`Project deployed successfully! URL: ${deployment.url}`);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to deploy project');
    } finally {
      setDeploying(false);
    }
  };

  const toggleProjectVisibility = async () => {
    if (!project || !isOwner) return;
    
    setUpdatingVisibility(true);
    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          is_public: !project.is_public,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update project visibility');
      }

      // Refresh project data
      await fetchProject();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update project visibility');
    } finally {
      setUpdatingVisibility(false);
    }
  };

  const forkProject = async () => {
    if (!project || isOwner) return;
    
    setForking(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/fork`, {
        method: 'POST',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to fork project');
      }

      const forkedProject = await response.json();
      
      // Redirect to the forked project
      router.push(`/projects/${forkedProject.id}`);
      alert('Project forked successfully! You can now edit your copy.');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to fork project');
    } finally {
      setForking(false);
    }
  };

  const getDefaultContent = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'html':
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${fileName.replace('.html', '')}</title>
</head>
<body>
    <h1>Hello World!</h1>
</body>
</html>`;
      case 'css':
        return `/* ${fileName} */
body {
    font-family: Arial, sans-serif;
    margin: 0;
    padding: 20px;
}`;
      case 'js':
        return `// ${fileName}
console.log('Hello from ${fileName}!');`;
      default:
        return '';
    }
  };

  const getFileIcon = (fileType: string) => {
    switch (fileType) {
      case 'html':
        return '🌐';
      case 'css':
        return '🎨';
      case 'js':
        return '⚡';
      default:
        return '📄';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-12">
            <p className="text-destructive mb-4">{error || 'Project not found'}</p>
            <Link href="/dashboard">
              <Button>Back to Dashboard</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="h-screen flex flex-col">
        {/* Header */}
        <div className="border-b bg-card px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/dashboard" className="text-muted-foreground hover:text-foreground">
                <ArrowLeft className="h-4 w-4" />
              </Link>
              <div>
                <h1 className="font-semibold text-lg">{project.name}</h1>
                <p className="text-sm text-muted-foreground">{project.description || 'No description'}</p>
                {!isOwner && (
                  <div className="flex items-center gap-1 mt-1">
                    <AlertCircle className="h-3 w-3 text-orange-500" />
                    <span className="text-xs text-orange-600">Read-only mode - Fork to edit</span>
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={openPreview}>
                <Eye className="h-4 w-4 mr-2" />
                Preview
              </Button>
              
              {!isOwner ? (
                <Button 
                  variant="default" 
                  size="sm" 
                  onClick={forkProject}
                  disabled={forking}
                >
                  <GitFork className="h-4 w-4 mr-2" />
                  {forking ? 'Forking...' : 'Fork Project'}
                </Button>
              ) : (
                <>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setShowCommitForm(true)}
                  >
                    <GitCommit className="h-4 w-4 mr-2" />
                    Commit
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setShowHistory(!showHistory)}
                  >
                    <History className="h-4 w-4 mr-2" />
                    History ({commits.length})
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => deployProject()}
                    disabled={deploying}
                  >
                    <Rocket className="h-4 w-4 mr-2" />
                    {deploying ? 'Deploying...' : 'Deploy'}
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={toggleProjectVisibility}
                    disabled={updatingVisibility}
                  >
                    {project.is_public ? (
                      <>
                        <Globe className="h-4 w-4 mr-2" />
                        Public
                      </>
                    ) : (
                      <>
                        <Lock className="h-4 w-4 mr-2" />
                        Private
                      </>
                    )}
                  </Button>
                </>
              )}
              
              {project.deployed_url && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => window.open(project.deployed_url!, '_blank')}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Live Site
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Commit Form Modal */}
        {showCommitForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <Card className="w-96">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GitCommit className="h-5 w-5" />
                  Create Commit
                </CardTitle>
                <CardDescription>
                  Save a snapshot of your current project state
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Commit Message</label>
                    <Input
                      placeholder="Describe your changes..."
                      value={commitMessage}
                      onChange={(e) => setCommitMessage(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') createCommit();
                        if (e.key === 'Escape') setShowCommitForm(false);
                      }}
                      autoFocus
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={createCommit} disabled={committing || !commitMessage.trim()}>
                      {committing ? 'Creating...' : 'Create Commit'}
                    </Button>
                    <Button variant="outline" onClick={() => setShowCommitForm(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Main Content */}
        <div className="flex-1 flex">
          {/* History Sidebar */}
          {showHistory && (
            <div className="w-80 border-r bg-card">
              <div className="p-4">
                <h3 className="font-medium mb-4 flex items-center gap-2">
                  <History className="h-4 w-4" />
                  Commit History
                </h3>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {commits.map((commit) => (
                    <div
                      key={commit.id}
                      className="p-3 border rounded-lg hover:bg-accent cursor-pointer"
                      onClick={() => restoreCommit(commit.id)}
                    >
                      <div className="font-medium text-sm">{commit.message}</div>
                      <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                        <Clock className="h-3 w-3" />
                        {new Date(commit.created_at).toLocaleString()}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {commit.commit_files?.[0]?.count || 0} files
                      </div>
                    </div>
                  ))}
                  {commits.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No commits yet. Create your first commit!
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Sidebar - File Explorer */}
          <div className="w-64 border-r bg-card">
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium">Files</h3>
                {isOwner && (
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setShowFileUpload(true)}
                      title="Upload File"
                    >
                      <Upload className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setShowNewFileForm(true)}
                      title="Create New File"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>

              {showNewFileForm && (
                <div className="mb-4 space-y-2">
                  <Input
                    placeholder="filename.html"
                    value={newFileName}
                    onChange={(e) => setNewFileName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') createFile();
                      if (e.key === 'Escape') {
                        setShowNewFileForm(false);
                        setNewFileName('');
                      }
                    }}
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={createFile}>
                      Create
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setShowNewFileForm(false);
                        setNewFileName('');
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              {showFileUpload && (
                <div className="mb-4">
                  <FileUpload
                    onFileUpload={handleFileUpload}
                    acceptedFileTypes={['.html', '.css', '.js']}
                    maxFileSize={1024 * 1024} // 1MB
                  />
                  <div className="mt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowFileUpload(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              <div className="space-y-1">
                {project.project_files.map((file) => (
                  <div
                    key={file.id}
                    className={`flex items-center justify-between p-2 rounded cursor-pointer hover:bg-accent ${
                      activeFile?.id === file.id ? 'bg-accent' : ''
                    }`}
                    onClick={() => {
                      // Save current file content before switching
                      if (activeFile) {
                        setFileContents(prev => ({
                          ...prev,
                          [activeFile.id]: fileContent
                        }));
                      }
                      
                      setActiveFile(file);
                      setFileContent(fileContents[file.id] || file.content);
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{getFileIcon(file.file_type)}</span>
                      <span className="text-sm">{file.name}</span>
                    </div>
                    {isOwner && file.name !== 'index.html' && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteFile(file.id, file.name);
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Editor */}
          <div className="flex-1 flex flex-col">
            {activeFile ? (
              <div className="flex-1">
                <CodeEditor
                  value={fileContent}
                  onChange={isOwner ? (newContent) => {
                    setFileContent(newContent);
                    setHasUnsavedChanges(true);
                    
                    // Update the file contents map in real-time
                    if (activeFile) {
                      setFileContents(prev => ({
                        ...prev,
                        [activeFile.id]: newContent
                      }));
                    }
                  } : () => {}}
                  language={activeFile.file_type === 'js' ? 'javascript' : activeFile.file_type as 'html' | 'css' | 'javascript'}
                  fileName={activeFile.name}
                  onSave={isOwner ? saveAllFiles : undefined}
                  onPreview={openPreview}
                  readOnly={!isOwner}
                  height="calc(100vh - 200px)"
                />
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Select a file to start editing</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
