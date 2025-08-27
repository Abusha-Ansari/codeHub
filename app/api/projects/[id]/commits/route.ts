import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { ProjectFileData } from '@/types';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServerClient();
    
    // Get user ID
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('clerk_id', userId)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Verify project ownership
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (projectError || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Get commits with file count
    const { data: commits, error: commitsError } = await supabase
      .from('commits')
      .select(`
        id,
        message,
        created_at,
        commit_files (count)
      `)
      .eq('project_id', id)
      .order('created_at', { ascending: false });

    if (commitsError) {
      console.error('Error fetching commits:', commitsError);
      return NextResponse.json({ error: 'Failed to fetch commits' }, { status: 500 });
    }

    return NextResponse.json(commits || []);
  } catch (error) {
    console.error('Error in GET /api/projects/[id]/commits:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { message } = body;

    if (!message || !message.trim()) {
      return NextResponse.json({ error: 'Commit message is required' }, { status: 400 });
    }

    if (message.length > 200) {
      return NextResponse.json({ error: 'Commit message must be less than 200 characters' }, { status: 400 });
    }

    const supabase = createServerClient();
    
    // Get user ID
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('clerk_id', userId)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Verify project ownership and get current files
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select(`
        id,
        project_files (
          id,
          name,
          path,
          content,
          file_type
        )
      `)
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (projectError || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    if (!project.project_files || project.project_files.length === 0) {
      return NextResponse.json({ error: 'No files to commit' }, { status: 400 });
    }

    // Create commit
    const { data: commit, error: commitError } = await supabase
      .from('commits')
      .insert({
        project_id: id,
        user_id: user.id,
        message: message.trim(),
      })
      .select()
      .single();

    if (commitError) {
      console.error('Error creating commit:', commitError);
      return NextResponse.json({ error: 'Failed to create commit' }, { status: 500 });
    }

    // Create commit files (snapshot of current files)

    const commitFiles = project.project_files.map((file: ProjectFileData) => ({
      commit_id: commit.id,
      file_id: file.id,
      file_content: file.content,
      file_path: file.path,
      file_name: file.name,
      file_type: file.file_type,
    }));

    const { error: commitFilesError } = await supabase
      .from('commit_files')
      .insert(commitFiles);

    if (commitFilesError) {
      console.error('Error creating commit files:', commitFilesError);
      // Clean up the commit if file creation fails
      await supabase.from('commits').delete().eq('id', commit.id);
      return NextResponse.json({ error: 'Failed to create commit files' }, { status: 500 });
    }

    // Update project's last_commit_id
    await supabase
      .from('projects')
      .update({ 
        last_commit_id: commit.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    return NextResponse.json({
      ...commit,
      file_count: commitFiles.length
    }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/projects/[id]/commits:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
