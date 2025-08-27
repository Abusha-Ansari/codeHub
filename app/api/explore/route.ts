import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

export async function GET() {
  try {
    const supabase = createServerClient();
    
    // Get public projects with user info and file count
    const { data: projects, error } = await supabase
      .from('projects')
      .select(`
        id,
        name,
        description,
        deployed_url,
        created_at,
        updated_at,
        users (
          id,
          email,
          first_name,
          last_name
        ),
        project_files (count)
      `)
      .eq('is_public', true)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error fetching public projects:', error);
      return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 });
    }

    // Transform the data to include file count
    const transformedProjects = projects?.map(project => ({
      ...project,
      _count: {
        project_files: project.project_files?.length || 0
      },
      project_files: undefined // Remove the raw project_files array
    })) || [];

    return NextResponse.json(transformedProjects);
  } catch (error) {
    console.error('Error in GET /api/explore:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
