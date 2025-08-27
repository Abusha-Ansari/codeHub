'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Navbar } from '@/components/navbar';
import { Search, Eye, User, Calendar, ExternalLink } from 'lucide-react';
import Link from 'next/link';

interface PublicProject {
  id: string;
  name: string;
  description: string | null;
  deployed_url: string | null;
  created_at: string;
  updated_at: string;
  users: {
    id: string;
    email: string;
    first_name: string | null;
    last_name: string | null;
  };
  _count: {
    project_files: number;
  };
}

export default function ExplorePage() {
  const [projects, setProjects] = useState<PublicProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredProjects, setFilteredProjects] = useState<PublicProject[]>([]);

  useEffect(() => {
    fetchPublicProjects();
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredProjects(projects);
    } else {
      const filtered = projects.filter(project =>
        project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        project.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        `${project.users.first_name} ${project.users.last_name}`.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredProjects(filtered);
    }
  }, [searchQuery, projects]);

  const fetchPublicProjects = async () => {
    try {
      const response = await fetch('/api/explore');
      if (response.ok) {
        const data = await response.json();
        setProjects(data);
        setFilteredProjects(data);
      }
    } catch (error) {
      console.error('Failed to fetch public projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getUserDisplayName = (user: PublicProject['users']) => {
    if (user.first_name || user.last_name) {
      return `${user.first_name || ''} ${user.last_name || ''}`.trim();
    }
    return user.email.split('@')[0];
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-4">Explore Projects</h1>
            <p className="text-xl text-muted-foreground mb-6">
              Discover amazing projects created by the CodeHub community
            </p>
            
            {/* Search */}
            <div className="relative max-w-md mx-auto">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search projects, descriptions, or creators..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-4 text-muted-foreground">Loading projects...</p>
            </div>
          )}

          {/* Projects Grid */}
          {!loading && (
            <>
              <div className="mb-6">
                <p className="text-muted-foreground">
                  {filteredProjects.length} project{filteredProjects.length !== 1 ? 's' : ''} found
                </p>
              </div>

              {filteredProjects.length === 0 ? (
                <div className="text-center py-12">
                  <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No projects found</h3>
                  <p className="text-muted-foreground">
                    {searchQuery ? 'Try adjusting your search terms' : 'No public projects available yet'}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredProjects.map((project, index) => (
                    <Card 
                      key={project.id} 
                      className="hover:shadow-lg transition-all duration-300 hover:scale-[1.02] animate-in fade-in slide-in-from-bottom-4"
                      style={{ animationDelay: `${index * 100}ms` }}
                    >
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-lg mb-2 hover:text-primary transition-colors">
                              {project.name}
                            </CardTitle>
                            <CardDescription className="line-clamp-2">
                              {project.description || 'No description provided'}
                            </CardDescription>
                          </div>
                        </div>
                        
                        {/* Creator Info */}
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-3">
                          <User className="h-4 w-4" />
                          <span>{getUserDisplayName(project.users)}</span>
                        </div>
                      </CardHeader>
                      
                      <CardContent>
                        <div className="space-y-3">
                          {/* Project Stats */}
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              <span>{formatDate(project.updated_at)}</span>
                            </div>
                            <div>
                              {project._count.project_files} file{project._count.project_files !== 1 ? 's' : ''}
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" className="flex-1 hover:bg-primary hover:text-primary-foreground transition-colors" asChild>
                              <Link href={`/projects/${project.id}`}>
                                <Eye className="h-4 w-4 mr-2" />
                                View Code
                              </Link>
                            </Button>
                            
                            {project.deployed_url && (
                              <Button variant="outline" size="sm" className="hover:bg-primary hover:text-primary-foreground transition-colors" asChild>
                                <a href={project.deployed_url} target="_blank" rel="noopener noreferrer">
                                  <ExternalLink className="h-4 w-4" />
                                </a>
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
