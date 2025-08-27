-- CodeHub Database Schema for Supabase

-- Users table (extends Clerk user data)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_id TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  username TEXT UNIQUE NOT NULL,
  first_name TEXT,
  last_name TEXT,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Projects table
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  is_public BOOLEAN DEFAULT false,
  deployed_url TEXT,
  last_commit_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Project files table
CREATE TABLE project_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  path TEXT NOT NULL,
  content TEXT NOT NULL,
  file_type TEXT NOT NULL CHECK (file_type IN ('html', 'css', 'js')),
  size INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(project_id, path)
);

-- Commits table
CREATE TABLE commits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  parent_commit_id UUID REFERENCES commits(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Commit files (snapshot of files at commit time)
CREATE TABLE commit_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  commit_id UUID NOT NULL REFERENCES commits(id) ON DELETE CASCADE,
  file_id UUID NOT NULL REFERENCES project_files(id) ON DELETE CASCADE,
  file_content TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL CHECK (file_type IN ('html', 'css', 'js'))
);

-- Deployments table
CREATE TABLE deployments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  commit_id UUID NOT NULL REFERENCES commits(id) ON DELETE CASCADE,
  url TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'deployed', 'failed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX idx_projects_user_id ON projects(user_id);
CREATE INDEX idx_projects_is_public ON projects(is_public);
CREATE INDEX idx_project_files_project_id ON project_files(project_id);
CREATE INDEX idx_commits_project_id ON commits(project_id);
CREATE INDEX idx_commits_created_at ON commits(created_at DESC);
CREATE INDEX idx_commit_files_commit_id ON commit_files(commit_id);
CREATE INDEX idx_deployments_project_id ON deployments(project_id);

-- Row Level Security (RLS) policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE commits ENABLE ROW LEVEL SECURITY;
ALTER TABLE commit_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE deployments ENABLE ROW LEVEL SECURITY;

-- Users can only access their own data
CREATE POLICY "Users can view own data" ON users FOR SELECT USING (clerk_id = auth.jwt() ->> 'sub');
CREATE POLICY "Users can update own data" ON users FOR UPDATE USING (clerk_id = auth.jwt() ->> 'sub');

-- Projects policies
CREATE POLICY "Users can view own projects" ON projects FOR SELECT USING (user_id = (SELECT id FROM users WHERE clerk_id = auth.jwt() ->> 'sub'));
CREATE POLICY "Users can view public projects" ON projects FOR SELECT USING (is_public = true);
CREATE POLICY "Users can create projects" ON projects FOR INSERT WITH CHECK (user_id = (SELECT id FROM users WHERE clerk_id = auth.jwt() ->> 'sub'));
CREATE POLICY "Users can update own projects" ON projects FOR UPDATE USING (user_id = (SELECT id FROM users WHERE clerk_id = auth.jwt() ->> 'sub'));
CREATE POLICY "Users can delete own projects" ON projects FOR DELETE USING (user_id = (SELECT id FROM users WHERE clerk_id = auth.jwt() ->> 'sub'));

-- Project files policies
CREATE POLICY "Users can manage files in own projects" ON project_files FOR ALL USING (
  project_id IN (SELECT id FROM projects WHERE user_id = (SELECT id FROM users WHERE clerk_id = auth.jwt() ->> 'sub'))
);
CREATE POLICY "Users can view files in public projects" ON project_files FOR SELECT USING (
  project_id IN (SELECT id FROM projects WHERE is_public = true)
);

-- Commits policies
CREATE POLICY "Users can manage commits in own projects" ON commits FOR ALL USING (
  project_id IN (SELECT id FROM projects WHERE user_id = (SELECT id FROM users WHERE clerk_id = auth.jwt() ->> 'sub'))
);
CREATE POLICY "Users can view commits in public projects" ON commits FOR SELECT USING (
  project_id IN (SELECT id FROM projects WHERE is_public = true)
);

-- Commit files policies
CREATE POLICY "Users can manage commit files in own projects" ON commit_files FOR ALL USING (
  commit_id IN (
    SELECT c.id FROM commits c 
    JOIN projects p ON c.project_id = p.id 
    WHERE p.user_id = (SELECT id FROM users WHERE clerk_id = auth.jwt() ->> 'sub')
  )
);
CREATE POLICY "Users can view commit files in public projects" ON commit_files FOR SELECT USING (
  commit_id IN (
    SELECT c.id FROM commits c 
    JOIN projects p ON c.project_id = p.id 
    WHERE p.is_public = true
  )
);

-- Deployments policies
CREATE POLICY "Users can manage deployments in own projects" ON deployments FOR ALL USING (
  project_id IN (SELECT id FROM projects WHERE user_id = (SELECT id FROM users WHERE clerk_id = auth.jwt() ->> 'sub'))
);
CREATE POLICY "Users can view deployments in public projects" ON deployments FOR SELECT USING (
  project_id IN (SELECT id FROM projects WHERE is_public = true)
);

-- Function to enforce 3 project limit per user
CREATE OR REPLACE FUNCTION check_project_limit()
RETURNS TRIGGER AS $$
BEGIN
  IF (SELECT COUNT(*) FROM projects WHERE user_id = NEW.user_id) >= 3 THEN
    RAISE EXCEPTION 'Maximum of 3 projects allowed per user';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_project_limit
  BEFORE INSERT ON projects
  FOR EACH ROW
  EXECUTE FUNCTION check_project_limit();
