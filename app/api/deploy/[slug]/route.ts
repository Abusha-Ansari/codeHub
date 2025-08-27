import { NextRequest } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { CommitFile } from '@/types';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  try {
    const supabase = createServerClient();
    
    // Extract deployment URL from slug
    const deploymentUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/deploy/${slug}`;
    
    // Get deployment with commit files
    const { data: deployment, error: deploymentError } = await supabase
      .from('deployments')
      .select(`
        id,
        url,
        status,
        commits (
          id,
          commit_files (
            file_name,
            file_path,
            file_content,
            file_type
          )
        ),
        projects (
          name,
          is_public
        )
      `)
      .eq('url', deploymentUrl)
      .eq('status', 'deployed')
      .single();

    if (deploymentError || !deployment) {
      return new Response('Deployment not found', { status: 404 });
    }

    // Check if project is public or if it's a valid deployment
    const project = Array.isArray(deployment.projects) ? deployment.projects[0] : deployment.projects;
    const commit = Array.isArray(deployment.commits) ? deployment.commits[0] : deployment.commits;
    
    if (!project?.is_public && !commit?.commit_files) {
      return new Response('Deployment not accessible', { status: 403 });
    }

    const files = commit.commit_files.map((f: CommitFile) => ({ ...f }));
    
    // Find index.html file
    const indexFile = files.find((f: CommitFile) => f.file_name === 'index.html');
    if (!indexFile) {
      return new Response('No index.html file found in deployment', { status: 404 });
    }

    // Process HTML to inject CSS and JS
    let html = indexFile.file_content;
    
    // Find and inject CSS files
    const cssFiles = files.filter((f: CommitFile) => f.file_type === 'css');
    cssFiles.forEach((cssFile: CommitFile) => {
      const cssLink = `<link rel="stylesheet" href="${cssFile.file_path}">`;
      const styleTag = `<style>\n/* ${cssFile.file_name} */\n${cssFile.file_content}\n</style>`;
      
      // Replace link tag with inline style, or add to head
      if (html.includes(cssLink)) {
        html = html.replace(cssLink, styleTag);
      } else {
        html = html.replace('</head>', `  ${styleTag}\n</head>`);
      }
    });

    // Find and inject JS files
    const jsFiles = files.filter((f: CommitFile) => f.file_type === 'js');
    jsFiles.forEach((jsFile: CommitFile) => {
      const scriptSrc = `<script src="${jsFile.file_path}"></script>`;
      const scriptTag = `<script>\n/* ${jsFile.file_name} */\n${jsFile.file_content}\n</script>`;
      
      // Replace script tag with inline script, or add before closing body
      if (html.includes(scriptSrc)) {
        html = html.replace(scriptSrc, scriptTag);
      } else {
        html = html.replace('</body>', `  ${scriptTag}\n</body>`);
      }
    });

    // Add deployment meta tags
    const deploymentMeta = `
  <meta name="generator" content="CodeHub">
  <meta name="deployment-url" content="${deploymentUrl}">
  <meta name="project-name" content="${project?.name || 'Untitled'}">`;
    
    html = html.replace('</head>', `${deploymentMeta}\n</head>`);

    // Return HTML with proper content type and caching headers
    return new Response(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
        'X-Powered-By': 'CodeHub',
      },
    });
  } catch (error) {
    console.error('Error serving deployment:', error);
    return new Response('Internal server error', { status: 500 });
  }
}
