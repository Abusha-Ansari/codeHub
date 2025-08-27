import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { CommitFile } from '@/types';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; commitId: string }> }
) {
  const { id, commitId } = await params;
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

    // Get commit with files
    const { data: commit, error: commitError } = await supabase
      .from('commits')
      .select(`
        id,
        message,
        created_at,
        projects!inner (
          id,
          name,
          user_id
        ),
        commit_files (
          id,
          file_name,
          file_path,
          file_content,
          file_type
        )
      `)
      .eq('id', commitId)
      .eq('project_id', id)
      .eq('projects.user_id', user.id)
      .single();

    if (commitError || !commit) {
      return NextResponse.json({ error: 'Commit not found' }, { status: 404 });
    }

    return NextResponse.json(commit);
  } catch (error) {
    console.error('Error in GET /api/projects/[id]/commits/[commitId]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; commitId: string }> }
) {
  const { id, commitId } = await params;
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

    // Get commit with files
    const { data: commit, error: commitError } = await supabase
      .from('commits')
      .select(`
        id,
        message,
        projects!inner (
          id,
          user_id
        ),
        commit_files (
          file_name,
          file_path,
          file_content,
          file_type
        )
      `)
      .eq('id', commitId)
      .eq('project_id', id)
      .eq('projects.user_id', user.id)
      .single();

    if (commitError || !commit) {
      return NextResponse.json({ error: 'Commit not found' }, { status: 404 });
    }

    // Delete all current project files
    await supabase
      .from('project_files')
      .delete()
      .eq('project_id', id);

    // Restore files from commit
    const filesToRestore = commit.commit_files.map((file: CommitFile) => ({
      project_id: id,
      name: file.file_name,
      path: file.file_path,
      content: file.file_content,
      file_type: file.file_type,
      size: file.file_content.length,
    }));

    const { error: restoreError } = await supabase
      .from('project_files')
      .insert(filesToRestore);

    if (restoreError) {
      console.error('Error restoring files:', restoreError);
      return NextResponse.json({ error: 'Failed to restore files from commit' }, { status: 500 });
    }

    // Update project's last_commit_id and updated_at
    await supabase
      .from('projects')
      .update({ 
        last_commit_id: commitId,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    return NextResponse.json({ 
      message: 'Project restored to commit successfully',
      commit_id: commitId,
      files_restored: filesToRestore.length
    });
  } catch (error) {
    console.error('Error in POST /api/projects/[id]/commits/[commitId]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
