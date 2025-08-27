import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { CommitFile, PreviewFile } from '@/types';

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

    const { searchParams } = new URL(request.url);
    const commitId = searchParams.get('commit');

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

    let files: PreviewFile[] = [];

    if (commitId) {
      // Get files from specific commit
      const { data: commit, error: commitError } = await supabase
        .from('commits')
        .select(`
          commit_files (
            file_name,
            file_path,
            file_content,
            file_type
          ),
          projects!inner (
            user_id
          )
        `)
        .eq('id', commitId)
        .eq('project_id', id)
        .eq('projects.user_id', user.id)
        .single();

      if (commitError || !commit) {
        return NextResponse.json({ error: 'Commit not found' }, { status: 404 });
      }

      files = commit.commit_files.map((f: CommitFile): PreviewFile => ({
        name: f.file_name,
        path: f.file_path,
        content: f.file_content,
        type: f.file_type,
      }));
    } else {
      // Get current project files
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .select(`
          project_files (
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

      files = project.project_files.map((f): PreviewFile => ({
        name: f.name,
        path: f.path,
        content: f.content,
        type: f.file_type,
      }));
    }

    // Find index.html file
    const indexFile = files.find(f => f.name === 'index.html');
    if (!indexFile) {
      return NextResponse.json({ error: 'No index.html file found' }, { status: 404 });
    }

    // Process HTML to inject CSS and JS
    let html = indexFile.content;

    // Find and inject CSS files
    const cssFiles = files.filter(f => f.type === 'css');
    cssFiles.forEach(cssFile => {
      const cssLink = `<link rel="stylesheet" href="${cssFile.path}">`;
      const styleTag = `<style>\n${cssFile.content}\n</style>`;

      // Replace link tag with inline style, or add to head
      if (html.includes(cssLink)) {
        html = html.replace(cssLink, styleTag);
      } else {
        html = html.replace('</head>', `  ${styleTag}\n</head>`);
      }
    });

    // Find and inject JS files
    const jsFiles = files.filter(f => f.type === 'js');
    jsFiles.forEach(jsFile => {
      const scriptSrc = `<script src="${jsFile.path}"></script>`;
      const scriptTag = `<script>\n${jsFile.content}\n</script>`;

      // Replace script tag with inline script, or add before closing body
      if (html.includes(scriptSrc)) {
        html = html.replace(scriptSrc, scriptTag);
      } else {
        html = html.replace('</body>', `  ${scriptTag}\n</body>`);
      }
    });

    // Return HTML with proper content type
    return new Response(html, {
      headers: {
        'Content-Type': 'text/html',
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error) {
    console.error('Error in GET /api/projects/[id]/preview:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
