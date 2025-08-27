import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { validateFileContent, getFileTypeFromExtension } from '@/lib/validations';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; fileId: string }> }
) {
  const { id, fileId } = await params;
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

    // Get file with project ownership verification
    const { data: file, error: fileError } = await supabase
      .from('project_files')
      .select(`
        *,
        projects!inner (
          id,
          user_id
        )
      `)
      .eq('id', fileId)
      .eq('project_id', id)
      .eq('projects.user_id', user.id)
      .single();

    if (fileError || !file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    return NextResponse.json(file);
  } catch (error) {
    console.error('Error in GET /api/projects/[id]/files/[fileId]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; fileId: string }> }
) {
  const { id, fileId } = await params;
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { content } = body;

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

    // Get existing file with project ownership verification
    const { data: existingFile, error: fileError } = await supabase
      .from('project_files')
      .select(`
        *,
        projects!inner (
          id,
          user_id
        )
      `)
      .eq('id', fileId)
      .eq('project_id', id)
      .eq('projects.user_id', user.id)
      .single();

    if (fileError || !existingFile) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    // Validate file content
    const fileType = getFileTypeFromExtension(existingFile.name);
    if (!fileType) {
      return NextResponse.json({ error: 'Invalid file type' }, { status: 400 });
    }

    const contentValidation = validateFileContent(content, fileType);
    if (!contentValidation.valid) {
      return NextResponse.json({ error: contentValidation.error }, { status: 400 });
    }

    // Update file
    const { data: file, error: updateError } = await supabase
      .from('project_files')
      .update({
        content: content,
        size: content.length,
        updated_at: new Date().toISOString(),
      })
      .eq('id', fileId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating file:', updateError);
      return NextResponse.json({ error: 'Failed to update file' }, { status: 500 });
    }

    // Update project's updated_at timestamp
    await supabase
      .from('projects')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', id);

    return NextResponse.json(file);
  } catch (error) {
    console.error('Error in PUT /api/projects/[id]/files/[fileId]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; fileId: string }> }
) {
  const { id, fileId } = await params;
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

    // Verify file exists and user owns the project
    const { data: file, error: fileError } = await supabase
      .from('project_files')
      .select(`
        id,
        name,
        projects!inner (
          id,
          user_id
        )
      `)
      .eq('id', fileId)
      .eq('project_id', id)
      .eq('projects.user_id', user.id)
      .single();

    if (fileError || !file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    // Prevent deletion of essential files
    const essentialFiles = ['index.html'];
    if (essentialFiles.includes(file.name)) {
      return NextResponse.json({ error: 'Cannot delete essential project files' }, { status: 400 });
    }

    // Delete file
    const { error: deleteError } = await supabase
      .from('project_files')
      .delete()
      .eq('id', fileId);

    if (deleteError) {
      console.error('Error deleting file:', deleteError);
      return NextResponse.json({ error: 'Failed to delete file' }, { status: 500 });
    }

    // Update project's updated_at timestamp
    await supabase
      .from('projects')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', id);

    return NextResponse.json({ message: 'File deleted successfully' });
  } catch (error) {
    console.error('Error in DELETE /api/projects/[id]/files/[fileId]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
