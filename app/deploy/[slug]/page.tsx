import { notFound } from 'next/navigation';
import { createServerClient } from '@/lib/supabase';
import { DeploymentFile } from '@/types';

interface DeployedPageProps {
  params: Promise<{
    slug: string;
  }>;
}

async function getDeployment(slug: string) {
  const supabase = createServerClient();
  
  const deploymentUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/deploy/${slug}`;
  
  const { data: deployment, error } = await supabase
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

  if (error || !deployment) {
    return null;
  }

  return deployment;
}

function processHTML(files: DeploymentFile[], projectName: string, deploymentUrl: string) {
  // Find index.html file
  const indexFile = files.find((f: DeploymentFile) => f.file_name === 'index.html');
  if (!indexFile) {
    return null;
  }

  let html = indexFile.file_content;
  
  // Find and inject CSS files
  const cssFiles = files.filter((f: DeploymentFile) => f.file_type === 'css');
  cssFiles.forEach((cssFile: DeploymentFile) => {
    const cssLink = `<link rel="stylesheet" href="${cssFile.file_path}">`;
    const styleTag = `<style>\n/* ${cssFile.file_name} */\n${cssFile.file_content}\n</style>`;
    
    if (html.includes(cssLink)) {
      html = html.replace(cssLink, styleTag);
    } else {
      html = html.replace('</head>', `  ${styleTag}\n</head>`);
    }
  });

  // Find and inject JS files
  const jsFiles = files.filter((f: DeploymentFile) => f.file_type === 'js');
  jsFiles.forEach((jsFile: DeploymentFile) => {
    const scriptSrc = `<script src="${jsFile.file_path}"></script>`;
    const scriptTag = `<script>\n/* ${jsFile.file_name} */\n${jsFile.file_content}\n</script>`;
    
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
  <meta name="project-name" content="${projectName}">`;
  
  html = html.replace('</head>', `${deploymentMeta}\n</head>`);

  return html;
}

export default async function DeployedPage({ params }: DeployedPageProps) {
  const { slug } = await params;
  const deployment = await getDeployment(slug);
  
  if (!deployment) {
    notFound();
  }

  const project = Array.isArray(deployment.projects) ? deployment.projects[0] : deployment.projects;
  const commit = Array.isArray(deployment.commits) ? deployment.commits[0] : deployment.commits;
  
  if (!commit?.commit_files) {
    notFound();
  }

  const html = processHTML(
    commit.commit_files, 
    project?.name || 'Untitled Project',
    deployment.url
  );

  if (!html) {
    notFound();
  }

  return (
    <div 
      dangerouslySetInnerHTML={{ __html: html }}
      className="w-full h-screen bg-background"
    />
  );
}
