import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { validateProjectName } from '@/lib/validations';

export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServerClient();

    // Get user's projects
    const { data: projects, error } = await supabase
      .from('projects')
      .select(`
        id,
        name,
        description,
        is_public,
        deployed_url,
        last_commit_id,
        created_at,
        updated_at
      `)
      .eq(
        'user_id',
        (
          await supabase
            .from('users')
            .select('id')
            .eq('clerk_id', userId)
            .single()
        ).data?.id
      )
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error fetching projects:', error);
      return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 });
    }

    return NextResponse.json(projects || []);
  } catch (error) {
    console.error('Error in GET /api/projects:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, isPublic } = body;

    // Validate project name
    const nameValidation = validateProjectName(name);
    if (!nameValidation.valid) {
      return NextResponse.json({ error: nameValidation.error }, { status: 400 });
    }

    const supabase = createServerClient();

    // Get or create user in Supabase
    let user: { id: string } | null = null;

    const { data: existingUser, error: userError } = await supabase
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
          email: '', // Will be updated when user profile is available
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

    // Create project
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .insert({
        name: name.trim(),
        description: description?.trim() || null,
        user_id: user.id,
        is_public: isPublic || false,
      })
      .select()
      .single();

    if (projectError) {
      console.error('Error creating project:', projectError);
      return NextResponse.json({ error: 'Failed to create project' }, { status: 500 });
    }

    // Create default index.html file
    const defaultHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${name}</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <div class="container">
        <h1>Welcome to ${name}</h1>
        <p>Start building your amazing web project!</p>
    </div>
    <script src="script.js"></script>
</body>
</html>`;

    const defaultCss = `/* ${name} Styles */
.container {
    max-width: 800px;
    margin: 0 auto;
    padding: 2rem;
    font-family: Arial, sans-serif;
}

h1 {
    color: #333;
    text-align: center;
    margin-bottom: 1rem;
}

p {
    color: #666;
    text-align: center;
    font-size: 1.1rem;
}`;

    const defaultJs = `// ${name} JavaScript
console.log('Welcome to ${name}!');

// Add your JavaScript code here
document.addEventListener('DOMContentLoaded', function() {
    console.log('Page loaded successfully!');
});`;

    // Create default files
    const defaultFiles = [
      { name: 'index.html', content: defaultHtml, type: 'html' },
      { name: 'style.css', content: defaultCss, type: 'css' },
      { name: 'script.js', content: defaultJs, type: 'js' },
    ];

    for (const file of defaultFiles) {
      await supabase.from('project_files').insert({
        project_id: project.id,
        name: file.name,
        path: file.name,
        content: file.content,
        file_type: file.type,
        size: file.content.length,
      });
    }

    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/projects:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
