import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { validateFileName, validateFileContent, getFileTypeFromExtension } from '@/lib/validations';

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

    // Get project files
    const { data: files, error: filesError } = await supabase
      .from('project_files')
      .select('*')
      .eq('project_id', id)
      .order('name');

    if (filesError) {
      console.error('Error fetching files:', filesError);
      return NextResponse.json({ error: 'Failed to fetch files' }, { status: 500 });
    }

    return NextResponse.json(files || []);
  } catch (error) {
    console.error('Error in GET /api/projects/[id]/files:', error);
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
    const { name, content } = body;

    // Validate file name
    const nameValidation = validateFileName(name);
    if (!nameValidation.valid) {
      return NextResponse.json({ error: nameValidation.error }, { status: 400 });
    }

    const fileType = getFileTypeFromExtension(name);
    if (!fileType) {
      return NextResponse.json({ error: 'Invalid file type. Only .html, .css, and .js files are allowed.' }, { status: 400 });
    }

    // Validate file content
    const contentValidation = validateFileContent(content, fileType);
    if (!contentValidation.valid) {
      return NextResponse.json({ error: contentValidation.error }, { status: 400 });
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

    // Check if file already exists
    const { data: existingFile } = await supabase
      .from('project_files')
      .select('id')
      .eq('project_id', id)
      .eq('path', name)
      .single();

    if (existingFile) {
      return NextResponse.json({ error: 'File already exists' }, { status: 400 });
    }

    // Create file
    const { data: file, error: fileError } = await supabase
      .from('project_files')
      .insert({
        project_id: id,
        name: name,
        path: name,
        content: content,
        file_type: fileType,
        size: content.length,
      })
      .select()
      .single();

    if (fileError) {
      console.error('Error creating file:', fileError);
      return NextResponse.json({ error: 'Failed to create file' }, { status: 500 });
    }

    // Update project's updated_at timestamp
    await supabase
      .from('projects')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', id);

    return NextResponse.json(file, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/projects/[id]/files:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
