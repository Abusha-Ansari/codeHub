import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

type CommitFile = {
  file_name: string;
  file_path: string;
  file_content: string | null;
  file_type: string;
};

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
  const { id: projectId, commitId } = await params;
  
  try {
    // 1. Authenticate the user
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServerClient();
    
    // 2. Get the user's database ID
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('clerk_id', userId)
      .single();

    if (userError || !userData) {
      console.error('User not found in database:', { userId, error: userError });
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // 3. Verify project ownership and get current state
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, user_id, last_commit_id, name')
      .eq('id', projectId)
      .eq('user_id', userData.id)  // Use the database user_id
      .single();

    if (projectError || !project) {
      console.error('Project not found or access denied:', { 
        projectId, 
        error: projectError,
        userId: userData.id
      });
      return NextResponse.json({ error: 'Project not found or access denied' }, { status: 404 });
    }

    // 4. Get the commit details to verify it exists and get parent_commit_id
    const { data: commitDetails, error: commitDetailsError } = await supabase
      .from('commits')
      .select('id, parent_commit_id')
      .eq('id', commitId)
      .eq('project_id', projectId)
      .single();

    if (commitDetailsError || !commitDetails) {
      console.error('Commit not found or access denied:', { 
        commitId,
        error: commitDetailsError
      });
      return NextResponse.json({ error: 'Commit not found' }, { status: 404 });
    }

    // 5. If already at this commit, return early
    if (project.last_commit_id === commitId) {
      return NextResponse.json({
        message: 'Project is already at this commit',
        commit_id: commitId,
        files_restored: 0,
        already_up_to_date: true
      });
    }

    // 4. Get the commit and its files in a single transaction
    const { data: commitData, error: commitError } = await supabase.rpc('get_commit_with_files', {
      p_commit_id: commitId,
      p_project_id: projectId
    });

    if (commitError || !commitData) {
      console.error('Error fetching commit data:', commitError);
      return NextResponse.json(
        { error: 'Failed to fetch commit data' }, 
        { status: commitError?.code === 'PGRST116' ? 404 : 500 }
      );
    }

    // 5. Restore the files using a transaction
    const { data: restoreResult, error: restoreError } = await supabase.rpc('restore_commit', {
      p_project_id: projectId,
      p_commit_id: commitId,
      p_files: commitData.files.map((file: CommitFile) => ({
        name: file.file_name,
        path: file.file_path,
        content: file.file_content,
        file_type: file.file_type,
        size: file.file_content?.length || 0,
      }))
    });

    if (restoreError) {
      console.error('Error restoring commit:', restoreError);
      return NextResponse.json(
        { error: 'Failed to restore commit' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Project restored to commit successfully',
      commit_id: commitId,
      files_restored: restoreResult?.files_restored || 0,
      details: {
        files_added: restoreResult?.files_added || 0,
        files_updated: restoreResult?.files_updated || 0,
        files_removed: restoreResult?.files_removed || 0
      }
    });

  } catch (error) {
    console.error('Error in commit restoration:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
