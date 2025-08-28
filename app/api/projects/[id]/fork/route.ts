import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

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

    const supabase = createServerClient();

    // Get or create user in Supabase
    let user: { id: string } | null = null;

    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('clerk_id', userId)
      .single();

    if (existingUser) {
      user = existingUser;
    } else {
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert({
          clerk_id: userId,
          email: '',
          first_name: '',
          last_name: '',
        })
        .select('id')
        .single();

      if (createError || !newUser) {
        console.error('Error creating user:', createError);
        return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
      }

      user = newUser;
    }

    // Check project count (3 project limit)
    const { data: existingProjects, error: countError } = await supabase
      .from('projects')
      .select('id')
      .eq('user_id', user.id);

    if (countError) {
      console.error('Error checking project count:', countError);
      return NextResponse.json({ error: 'Failed to check project limit' }, { status: 500 });
    }

    if (existingProjects && existingProjects.length >= 3) {
      return NextResponse.json(
        { error: 'Maximum of 3 projects allowed per user' },
        { status: 400 }
      );
    }

    // Get the original project with files
    const { data: originalProject, error: projectError } = await supabase
      .from('projects')
      .select(`
        id,
        name,
        description,
        is_public,
        project_files (
          name,
          path,
          content,
          file_type,
          size
        )
      `)
      .eq('id', id)
      .eq('is_public', true)
      .single();

    if (projectError || !originalProject) {
      return NextResponse.json({ error: 'Project not found or not public' }, { status: 404 });
    }

    // Create forked project
    const { data: forkedProject, error: forkError } = await supabase
      .from('projects')
      .insert({
        name: `${originalProject.name} (Fork)`,
        description: originalProject.description ? `Forked from: ${originalProject.description}` : 'Forked project',
        user_id: user.id,
        is_public: false, // Forks start as private
      })
      .select()
      .single();

    if (forkError) {
      console.error('Error creating forked project:', forkError);
      return NextResponse.json({ error: 'Failed to fork project' }, { status: 500 });
    }

    // Copy all files from original project
    if (originalProject.project_files && originalProject.project_files.length > 0) {
      const filesToInsert = originalProject.project_files.map((file: {
        name: string;
        path: string;
        content: string;
        file_type: string;
        size: number;
      }) => ({
        project_id: forkedProject.id,
        name: file.name,
        path: file.path,
        content: file.content,
        file_type: file.file_type,
        size: file.size,
      }));

      const { error: filesError } = await supabase
        .from('project_files')
        .insert(filesToInsert);

      if (filesError) {
        console.error('Error copying project files:', filesError);
        // Clean up the created project if file copying fails
        await supabase.from('projects').delete().eq('id', forkedProject.id);
        return NextResponse.json({ error: 'Failed to copy project files' }, { status: 500 });
      }
    }

    return NextResponse.json(forkedProject, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/projects/[id]/fork:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
