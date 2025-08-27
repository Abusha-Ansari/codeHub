import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { generateSlug } from '@/lib/utils';

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
    const { commitId } = body;

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

    // Get project and verify ownership
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, name, user_id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (projectError || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    let deployCommitId = commitId;
    
    // If no commit specified, use current project state
    if (!commitId) {
      // Create a deployment commit with current files
      const { data: projectFiles, error: filesError } = await supabase
        .from('project_files')
        .select('*')
        .eq('project_id', id);

      if (filesError || !projectFiles || projectFiles.length === 0) {
        return NextResponse.json({ error: 'No files to deploy' }, { status: 400 });
      }

      // Create deployment commit
      const { data: newCommit, error: commitError } = await supabase
        .from('commits')
        .insert({
          project_id: id,
          user_id: user.id,
          message: `Deployment commit - ${new Date().toISOString()}`,
        })
        .select()
        .single();

      if (commitError) {
        return NextResponse.json({ error: 'Failed to create deployment commit' }, { status: 500 });
      }

      // Create commit files
      const commitFiles = projectFiles.map(file => ({
        commit_id: newCommit.id,
        file_id: file.id,
        file_content: file.content,
        file_path: file.path,
        file_name: file.name,
        file_type: file.file_type,
      }));

      await supabase.from('commit_files').insert(commitFiles);
      deployCommitId = newCommit.id;
    }

    // Generate unique deployment URL
    const baseSlug = generateSlug(project.name);
    const timestamp = Date.now().toString(36);
    const deploymentSlug = `${baseSlug}-${timestamp}`;
    const deploymentUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/deploy/${deploymentSlug}`;

    // Create deployment record
    const { data: deployment, error: deploymentError } = await supabase
      .from('deployments')
      .insert({
        project_id: id,
        commit_id: deployCommitId,
        url: deploymentUrl,
        status: 'deployed',
      })
      .select()
      .single();

    if (deploymentError) {
      console.error('Error creating deployment:', deploymentError);
      return NextResponse.json({ error: 'Failed to create deployment' }, { status: 500 });
    }

    // Update project with deployed URL
    await supabase
      .from('projects')
      .update({ 
        deployed_url: deploymentUrl,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    return NextResponse.json({
      id: deployment.id,
      url: deploymentUrl,
      commit_id: deployCommitId,
      status: 'deployed',
      created_at: deployment.created_at
    }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/projects/[id]/deploy:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

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

    // Get deployments for this project
    const { data: deployments, error: deploymentsError } = await supabase
      .from('deployments')
      .select(`
        id,
        url,
        status,
        created_at,
        commits (
          id,
          message,
          created_at
        ),
        projects!inner (
          user_id
        )
      `)
      .eq('project_id', id)
      .eq('projects.user_id', user.id)
      .order('created_at', { ascending: false });

    if (deploymentsError) {
      console.error('Error fetching deployments:', deploymentsError);
      return NextResponse.json({ error: 'Failed to fetch deployments' }, { status: 500 });
    }

    return NextResponse.json(deployments || []);
  } catch (error) {
    console.error('Error in GET /api/projects/[id]/deploy:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
