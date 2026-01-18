import { useState } from 'react';
import { useSeoMeta } from '@unhead/react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useQuery } from '@tanstack/react-query';
import { useDefaultRelay } from '@/hooks/useDefaultRelay';
import Navigation from '@/components/Navigation';
import { Search, Calendar, Edit } from 'lucide-react';

interface BlogPost {
  id: string;
  title: string;
  content: string;
  published: boolean;
  created_at: number;
  image?: string;
}

export default function BlogPage() {
  const { nostr } = useDefaultRelay();
  const [searchTerm, setSearchTerm] = useState('');

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ['blog-posts'],
    queryFn: async () => {
      const signal = AbortSignal.timeout(2000);
      const postList = await nostr.query([
        { kinds: [30023], limit: 100 }
      ], { signal });
      
      return postList.map(event => ({
        id: event.id,
        title: event.tags.find(([name]) => name === 'title')?.[1] || 'Untitled',
        content: event.content,
        published: event.tags.find(([name]) => name === 'published')?.[1] === 'true',
        created_at: event.created_at,
      }));
    },
  });

  const filteredPosts = posts.filter(post => 
    post.published && (
      searchTerm === '' ||
      post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      post.content.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  useSeoMeta({
    title: 'Blog - Community Meetup',
    description: 'Read our latest blog posts and community updates.',
  });

  if (isLoading) {
    return (
      <div className="min-h-screen">
        <Navigation />
        <div className="py-8">
          <div className="max-w-4xl mx-auto px-4 space-y-6">
            <div className="h-8 bg-muted rounded animate-pulse mb-6" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-20" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Navigation />
      <div className="py-8">
        <div className="max-w-4xl mx-auto px-4 space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold tracking-tight mb-2">Blog</h1>
            <p className="text-lg text-muted-foreground">
              Read our latest community updates and insights
            </p>
          </div>

          {/* Search */}
          <Card>
            <CardContent className="pt-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search blog posts..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardContent>
          </Card>

          {/* Blog Posts */}
          {filteredPosts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredPosts.map((post) => (
                <Card key={post.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg line-clamp-2">{post.title}</CardTitle>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        {new Date(post.created_at * 1000).toLocaleDateString()}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div 
                      className="text-sm text-muted-foreground line-clamp-4 mb-4"
                      dangerouslySetInnerHTML={{ 
                        __html: post.content.replace(/<[^>]*>/g, '').slice(0, 200) + '...' 
                      }}
                    />
                    <Button className="w-full" asChild>
                      <Link to={`/blog/${post.id}`}>Read More</Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <Edit className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No blog posts found</h3>
                <p className="text-muted-foreground">
                  {searchTerm 
                    ? 'No posts match your search. Try different keywords.'
                    : 'No published blog posts yet.'
                  }
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}