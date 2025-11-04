import React, { useState } from 'react';
import { Layout } from '@/components/Layout';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/context/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { isUnauthorizedError } from '@/lib/authUtils';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';

export default function Community() {
  const { user, isAuthenticated } = useAuth();
  const userAny = user as any;
  const { t } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [newPost, setNewPost] = useState({
    content: '',
    imageUrl: '',
  });

  const { data: posts, isLoading } = useQuery<any[]>({
    queryKey: ['/api/community/posts'],
    enabled: isAuthenticated,
    retry: false,
  });

  const createPostMutation = useMutation({
    mutationFn: async (postData: any) => {
      const response = await apiRequest('POST', '/api/community/posts', postData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/community/posts'] });
      setShowCreatePost(false);
      setNewPost({ content: '', imageUrl: '' });
      toast({
        title: "Success",
        description: "Post created successfully!",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to create post. Please try again.",
        variant: "destructive",
      });
    },
  });

  const likePostMutation = useMutation({
    mutationFn: async (postId: string) => {
      const response = await apiRequest('POST', `/api/community/posts/${postId}/like`, {});
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/community/posts'] });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to like post.",
        variant: "destructive",
      });
    },
  });

  const handleCreatePost = () => {
    if (!newPost.content.trim()) {
      toast({
        title: "Error",
        description: "Please enter some content for your post.",
        variant: "destructive",
      });
      return;
    }

    createPostMutation.mutate(newPost);
  };

  const handleLikePost = (postId: string) => {
    likePostMutation.mutate(postId);
  };

  const formatTimeAgo = (date: string) => {
    const now = new Date();
    const postDate = new Date(date);
    const diffInHours = Math.floor((now.getTime() - postDate.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    return `${Math.floor(diffInHours / 24)}d ago`;
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <Layout showSidebar={true}>
      <div className="p-6 lg:p-8 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Community Feed</h1>
            <p className="text-gray-600 dark:text-gray-400">Share your health journey with others</p>
          </div>
                <Button 
            onClick={() => setShowCreatePost(!showCreatePost)}
            className="bg-nutricare-green hover:bg-nutricare-dark"
          >
            <i className="fas fa-plus mr-2"></i>
            Create Post
          </Button>
        </div>

        {/* Create Post Form */}
        {showCreatePost && (
          <Card className="mb-8">
            <CardHeader>
              <div className="flex items-center space-x-3">
                {userAny?.profileImageUrl ? (
                  <img
                    src={userAny.profileImageUrl}
                    alt="Profile"
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 bg-nutricare-green rounded-full flex items-center justify-center text-white font-semibold">
                    {userAny?.firstName?.[0] || 'U'}
                  </div>
                )}
                <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {userAny?.firstName} {userAny?.lastName}
                      </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Share your thoughts...</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                value={newPost.content}
                onChange={(e) => setNewPost({ ...newPost, content: e.target.value })}
                placeholder="What's on your mind? Share your health journey, a recipe, or motivational thoughts..."
                rows={4}
                className="resize-none"
              />
              <Input
                type="url"
                value={newPost.imageUrl}
                onChange={(e) => setNewPost({ ...newPost, imageUrl: e.target.value })}
                placeholder="Add an image URL (optional)"
              />
              <div className="flex space-x-4">
                <Button 
                  onClick={handleCreatePost}
                  disabled={createPostMutation.status === 'pending'}
                  className="bg-nutricare-green hover:bg-nutricare-dark"
                >
                  {createPostMutation.status === 'pending' ? 'Posting...' : 'Share Post'}
                </Button>
                <Button variant="outline" onClick={() => setShowCreatePost(false)}>
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Posts Feed */}
        <div className="space-y-6">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-nutricare-green"></div>
            </div>
          ) : posts && posts.length > 0 ? (
            posts.map((post: any) => (
              <Card key={post.id} className="overflow-hidden">
                <CardHeader>
                  <div className="flex items-center space-x-3">
                    {post.user?.profileImageUrl ? (
                      <img
                        src={post.user.profileImageUrl}
                        alt="Profile"
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-gradient-to-r from-pink-400 to-purple-400 rounded-full flex items-center justify-center text-white font-semibold">
                        {post.user?.firstName?.[0] || 'U'}
                      </div>
                    )}
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {post.user?.firstName} {post.user?.lastName}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {formatTimeAgo(post.createdAt)}
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  {/* Post Content */}
                  <p className="text-gray-700 dark:text-gray-300 mb-4 leading-relaxed">
                    {post.content}
                  </p>

                  {/* Post Image */}
                  {post.imageUrl && (
                    <div className="mb-4">
                      <img 
                        src={post.imageUrl} 
                        alt="Post content" 
                        className="w-full max-h-96 object-cover rounded-lg"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                        }}
                      />
                    </div>
                  )}

                  {/* Post Actions */}
                  <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex items-center space-x-6">
                      <button
                        onClick={() => handleLikePost(post.id)}
                        disabled={likePostMutation.status === 'pending'}
                        className="flex items-center space-x-2 text-gray-500 hover:text-red-500 transition-colors"
                      >
                        <i className={`${post.isLiked ? 'fas' : 'far'} fa-heart ${post.isLiked ? 'text-red-500' : ''}`}></i>
                        <span className="text-sm">{post.likesCount || 0}</span>
                      </button>
                      
                      <button className="flex items-center space-x-2 text-gray-500 hover:text-blue-500 transition-colors">
                        <i className="far fa-comment"></i>
                        <span className="text-sm">{post.commentsCount || 0}</span>
                      </button>
                      
                      <button className="flex items-center space-x-2 text-gray-500 hover:text-green-500 transition-colors">
                        <i className="far fa-share"></i>
                        <span className="text-sm">Share</span>
                      </button>
                    </div>

                    {/* Tags */}
                    {post.tags && (
                      <div className="flex items-center space-x-2">
                        {JSON.parse(post.tags || '[]').slice(0, 3).map((tag: string, index: number) => (
                          <span key={index} className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-xs text-gray-600 dark:text-gray-300 rounded-full">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="text-center py-12">
              <div className="p-4 bg-gray-100 dark:bg-gray-700 rounded-full w-20 h-20 mx-auto mb-6 flex items-center justify-center">
                <i className="fab fa-instagram text-gray-400 text-2xl"></i>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                No posts yet
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-6">
                Be the first to share your health journey with the community!
              </p>
              <Button 
                onClick={() => setShowCreatePost(true)}
                className="bg-nutricare-green hover:bg-nutricare-dark"
              >
                Create Your First Post
              </Button>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
