/**
 * AdminScheduledPage - Manage scheduled posts
 *
 * View, delete, and monitor scheduled Kind 1 notes and Kind 30023 blog posts
 */

import { useState } from 'react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useNavigate } from 'react-router-dom';
import { useScheduledPosts, useScheduledPostsStats, useDeleteScheduledPost, useUpdateScheduledPost, getTimeRemaining } from '@/hooks/useScheduledPosts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/useToast';
import { isSchedulerEnabled } from '@/lib/scheduler';
import {
  Clock,
  Calendar,
  CheckCircle,
  XCircle,
  Trash2,
  FileText,
  FileCode,
  Loader2,
  Edit2,
  AlertCircle,
} from 'lucide-react';
import { format } from 'date-fns';
import type { ScheduledPost } from '@/types/scheduled';

interface ScheduledPostCardProps {
  post: ScheduledPost;
  onDelete: (id: string) => void;
  onEdit: (post: ScheduledPost) => void;
}

function ScheduledPostCard({ post, onDelete, onEdit }: ScheduledPostCardProps) {
  const timeRemaining = getTimeRemaining(post.scheduled_for);
  const isNote = post.kind === 1;
  const isBlog = post.kind === 30023;

  // Get content preview
  const contentPreview = isNote
    ? post.signed_event.content.slice(0, 200)
    : post.signed_event.tags.find(([name]) => name === 'title')?.[1] || 'Untitled';

  return (
    <Card className={post.status === 'published' ? 'opacity-60' : ''}>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <Badge
                variant={
                  post.status === 'published'
                    ? 'default'
                    : post.status === 'failed'
                      ? 'destructive'
                      : 'secondary'
                }
                className="text-xs"
              >
                {post.status === 'published' && <CheckCircle className="h-3 w-3 mr-1" />}
                {post.status === 'failed' && <XCircle className="h-3 w-3 mr-1" />}
                {post.status === 'pending' && <Clock className="h-3 w-3 mr-1" />}
                {post.status}
              </Badge>
              <Badge variant="outline" className="text-[10px] font-mono">
                Kind {post.kind}
              </Badge>
              {isNote && (
                <Badge variant="outline" className="text-xs">
                  <FileText className="h-3 w-3 mr-1" />
                  Note
                </Badge>
              )}
              {isBlog && (
                <Badge variant="outline" className="text-xs">
                  <FileCode className="h-3 w-3 mr-1" />
                  Blog Post
                </Badge>
              )}
            </div>

            <p className="text-sm text-foreground">{contentPreview}</p>

            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {format(new Date(post.scheduled_for), 'MMM d, yyyy · h:mm a')}
              </div>
              {post.status === 'pending' && (
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {timeRemaining.text}
                </div>
              )}
            </div>

            {post.status === 'failed' && post.error_message && (
              <p className="text-xs text-destructive">{post.error_message}</p>
            )}

            <div className="text-xs text-muted-foreground">
              Relays: {post.relays.length} · {post.relays[0]?.replace('wss://', '')}
              {post.relays.length > 1 && ` +${post.relays.length - 1}`}
            </div>

            {post.published_at && (
              <p className="text-xs text-muted-foreground">
                Published at {format(new Date(post.published_at), 'MMM d, yyyy · h:mm a')}
              </p>
            )}
          </div>

          <div className="flex gap-1">
            {post.status === 'pending' && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => onEdit(post)}
                  title="Edit scheduled post"
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={() => onDelete(post.id)}
                  title="Delete scheduled post"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminScheduledPage() {
  const { user } = useCurrentUser();
  const navigate = useNavigate();
  const { data: scheduledPosts, isLoading } = useScheduledPosts(user?.pubkey);
  const { data: stats } = useScheduledPostsStats(user?.pubkey);
  const { mutateAsync: deletePost } = useDeleteScheduledPost();
  const { mutateAsync: updatePost } = useUpdateScheduledPost();
  const [activeTab, setActiveTab] = useState<'pending' | 'published' | 'failed'>('pending');

  const handleDelete = async (id: string) => {
    if (!user?.pubkey) return;

    if (!confirm('Are you sure you want to delete this scheduled post?')) {
      return;
    }

    try {
      await deletePost({ id, userPubkey: user.pubkey });
      toast({ title: 'Deleted', description: 'Scheduled post deleted successfully.' });
    } catch (error) {
      console.error('Failed to delete scheduled post:', error);
      toast({
        title: 'Error',
        description: (error as Error).message || 'Failed to delete scheduled post.',
        variant: 'destructive',
      });
    }
  };

  const handleEdit = (post: ScheduledPost) => {
    // Navigate to the appropriate editor with the post data
    const event = post.signed_event;
    const editData = {
      scheduledPostId: post.id,
      kind: post.kind,
      content: event.content || '',
      tags: event.tags || [],
      scheduledFor: post.scheduled_for,
      relays: post.relays,
      title: '',
      dTag: '',
      summary: '',
      image: '',
    };

    // Parse blog-specific data if applicable
    if (post.kind === 30023) {
      editData.title = event.tags?.find(([name]) => name === 'title')?.[1] || '';
      editData.dTag = event.tags?.find(([name]) => name === 'd')?.[1] || '';
      editData.summary = event.tags?.find(([name]) => name === 'summary')?.[1] || '';
      editData.image = event.tags?.find(([name]) => name === 'image')?.[1] || '';
    }

    // Navigate with state
    const targetPath = post.kind === 30023 ? '/admin/blog' : '/admin/notes';
    navigate(targetPath, { state: { editingScheduledPost: editData } });
  };

  const filteredPosts = scheduledPosts?.filter((post) => post.status === activeTab) || [];

  // Check if Scheduler is enabled
  if (!isSchedulerEnabled()) {
    return (
      <Card>
        <CardContent className="pt-6 text-center space-y-4">
          <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto" />
          <div>
            <h3 className="text-lg font-semibold">Scheduled Posts Not Configured</h3>
            <p className="text-muted-foreground mt-2">
              The scheduler is not enabled. Please check your Swarm Relay configuration.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!user) {
    return (
      <Card>
        <CardContent className="pt-6 text-center">
          <p className="text-muted-foreground">Please log in to manage scheduled posts.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Scheduled Posts</h2>
          <p className="text-muted-foreground">
            Manage your scheduled Kind 1 notes and Kind 30023 blog posts.
          </p>
        </div>
      </div>

      {/* Stats Overview */}
      {stats && (
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-yellow-500" />
                <span className="text-2xl font-bold">{stats.pending}</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Published</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span className="text-2xl font-bold">{stats.published}</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Failed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <XCircle className="h-5 w-5 text-red-500" />
                <span className="text-2xl font-bold">{stats.failed}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'pending' | 'published' | 'failed')}>
        <TabsList className="grid w-fit grid-cols-3">
          <TabsTrigger value="pending">
            Pending
            {stats && stats.pending > 0 && (
              <Badge variant="secondary" className="ml-2 h-5 min-w-5 px-1 text-xs">
                {stats.pending}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="published">
            Published
            {stats && stats.published > 0 && (
              <Badge variant="secondary" className="ml-2 h-5 min-w-5 px-1 text-xs">
                {stats.published}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="failed">
            Failed
            {stats && stats.failed > 0 && (
              <Badge variant="secondary" className="ml-2 h-5 min-w-5 px-1 text-xs">
                {stats.failed}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-4 space-y-4">
          {isLoading ? (
            <Card>
              <CardContent className="pt-6 flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </CardContent>
            </Card>
          ) : filteredPosts.length > 0 ? (
            filteredPosts.map((post) => (
              <ScheduledPostCard key={post.id} post={post} onDelete={handleDelete} onEdit={handleEdit} />
            ))
          ) : (
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-muted-foreground">No pending scheduled posts.</p>
                <p className="text-xs text-muted-foreground mt-2">
                  Schedule posts from the Notes or Blog pages.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="published" className="mt-4 space-y-4">
          {isLoading ? (
            <Card>
              <CardContent className="pt-6 flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </CardContent>
            </Card>
          ) : filteredPosts.length > 0 ? (
            filteredPosts.map((post) => (
              <ScheduledPostCard key={post.id} post={post} onDelete={handleDelete} onEdit={handleEdit} />
            ))
          ) : (
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-muted-foreground">No published scheduled posts yet.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="failed" className="mt-4 space-y-4">
          {isLoading ? (
            <Card>
              <CardContent className="pt-6 flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </CardContent>
            </Card>
          ) : filteredPosts.length > 0 ? (
            filteredPosts.map((post) => (
              <ScheduledPostCard key={post.id} post={post} onDelete={handleDelete} onEdit={handleEdit} />
            ))
          ) : (
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-muted-foreground">No failed scheduled posts.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
