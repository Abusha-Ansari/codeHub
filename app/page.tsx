'use client';

import { useUser } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Navbar } from '@/components/navbar';
import { Code2, GitBranch, Globe, Users } from 'lucide-react';
import Link from 'next/link';

export default function HomePage() {
  const { isSignedIn } = useUser();

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <div className="text-center space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-1000">
          <h1 className="text-gradient font-bold tracking-tight leading-tight">
            Build. Code. Deploy.
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200">
            Create stunning web projects with our intuitive online code editor. 
            Write HTML, CSS, and JavaScript, then deploy instantly with a single click.
          </p>
          <div className="flex flex-col sm:flex-row gap-6 justify-center animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-400">
            {isSignedIn ? (
              <Link href="/dashboard">
                <Button size="lg" className="text-lg font-semibold mb-6">
                  Go to Dashboard
                </Button>
              </Link>
            ) : (
              <>
                <Link href="/sign-up">
                  <Button size="lg" className="text-lg font-semibold mb-6">
                    Get Started Free
                  </Button>
                </Link>
                <Link href="/sign-in">
                  <Button variant="outline" size="lg" className="text-lg font-semibold mb-6">
                    Sign In
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          CodeHub provides a complete development environment with version control, 
          collaboration tools, and instant deployment.
        </p>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold mb-4">Everything you need to build amazing web projects</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            CodeHub provides a complete development environment with version control, 
            collaboration tools, and instant deployment.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <Card className="text-center hover:shadow-lg transition-all duration-300 hover:scale-105 animate-in fade-in slide-in-from-bottom-4" style={{ animationDelay: '600ms' }}>
            <CardHeader>
              <div className="mx-auto w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                <Code2 className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>Code Editor</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Write HTML, CSS, and JavaScript with syntax highlighting and auto-completion.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center hover:shadow-lg transition-all duration-300 hover:scale-105 animate-in fade-in slide-in-from-bottom-4" style={{ animationDelay: '700ms' }}>
            <CardHeader>
              <div className="mx-auto w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                <GitBranch className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>Version Control</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Track changes with built-in Git-like version control and commit history.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center hover:shadow-lg transition-all duration-300 hover:scale-105 animate-in fade-in slide-in-from-bottom-4" style={{ animationDelay: '800ms' }}>
            <CardHeader>
              <div className="mx-auto w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                <Globe className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>Instant Deploy</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Deploy your projects instantly with a unique URL that you can share with anyone.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center hover:shadow-lg transition-all duration-300 hover:scale-105 animate-in fade-in slide-in-from-bottom-4" style={{ animationDelay: '900ms' }}>
            <CardHeader>
              <div className="mx-auto w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>Collaboration</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Share your projects publicly and explore amazing creations from the community.
              </CardDescription>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl font-bold mb-4">Ready to start building?</h2>
          <p className="text-lg text-muted-foreground mb-8">
            Join thousands of developers who use CodeHub to create, 
            version, and deploy their web projects.
          </p>
          <Button size="lg" asChild>
            <Link href="/sign-up">Create Your First Project</Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-muted/50">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-2 mb-4 md:mb-0">
              <Code2 className="h-5 w-5" />
              <span className="font-semibold">CodeHub</span>
            </div>
            <div className="flex space-x-6 text-sm text-muted-foreground">
              <Link href="/about" className="hover:text-foreground transition-colors">About</Link>
              <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
              <Link href="/terms" className="hover:text-foreground transition-colors">Terms</Link>
              <Link href="/contact" className="hover:text-foreground transition-colors">Contact</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
