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
        users!inner (
          id,
          email,
          first_name,
          last_name
        )
      `)
      .eq('is_public', true)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error fetching public projects:', error);
      return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 });
    }

    // Get file counts for each project separately
    const projectsWithCounts = await Promise.all(
      (projects || []).map(async (project) => {
        const { count } = await supabase
          .from('project_files')
          .select('*', { count: 'exact', head: true })
          .eq('project_id', project.id);
        
        return {
          ...project,
          _count: {
            project_files: count || 0
          }
        };
      })
    );

    return NextResponse.json(projectsWithCounts);
  } catch (error) {
    console.error('Error in GET /api/explore:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
