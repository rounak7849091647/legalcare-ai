import { useState, useEffect } from 'react';
import PageLayout from '@/components/PageLayout';
import SEOHead from '@/components/SEOHead';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Users, 
  Send, 
  MessageCircle, 
  ThumbsUp, 
  Clock, 
  Plus,
  TrendingUp,
  HelpCircle,
  Lightbulb,
  Heart,
  Filter
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const communitySchema = {
  '@context': 'https://schema.org',
  '@type': 'DiscussionForumPosting',
  headline: 'Legal Community Forum - LegalCareAI',
  description: 'Join the legal community for discussions, advice, and shared experiences on Indian law matters.',
};

interface Post {
  id: string;
  title: string;
  content: string;
  author: string;
  category: 'question' | 'discussion' | 'advice' | 'experience';
  likes: number;
  replies: Reply[];
  createdAt: Date;
  aiSummary?: string;
}

interface Reply {
  id: string;
  content: string;
  author: string;
  likes: number;
  createdAt: Date;
  isAI?: boolean;
}

// Sample data for demonstration
const samplePosts: Post[] = [
  {
    id: '1',
    title: 'How to handle property dispute with siblings?',
    content: 'My father passed away without a will. Now my siblings are fighting over the ancestral property. What are my legal rights and how should I proceed?',
    author: 'Rajesh K.',
    category: 'question',
    likes: 24,
    createdAt: new Date(Date.now() - 86400000),
    replies: [
      {
        id: 'r1',
        content: 'In case of intestate succession, Hindu Succession Act applies. All legal heirs get equal share. I suggest getting a legal notice sent first.',
        author: 'Advocate Sharma',
        likes: 12,
        createdAt: new Date(Date.now() - 43200000)
      },
      {
        id: 'r2',
        content: 'I faced similar situation. Mediation helped us avoid court. Try family settlement deed first.',
        author: 'Priya M.',
        likes: 8,
        createdAt: new Date(Date.now() - 21600000)
      }
    ]
  },
  {
    id: '2',
    title: 'Experience with consumer court for defective product',
    content: 'I filed a complaint against a mobile company for selling a defective phone. After 6 months, I won the case and got full refund plus compensation. Here\'s my experience...',
    author: 'Amit S.',
    category: 'experience',
    likes: 45,
    createdAt: new Date(Date.now() - 172800000),
    replies: [
      {
        id: 'r3',
        content: 'This is very helpful! Can you share what documents you submitted?',
        author: 'Neha R.',
        likes: 5,
        createdAt: new Date(Date.now() - 86400000)
      }
    ]
  },
  {
    id: '3',
    title: 'Tenant not paying rent for 4 months - what to do?',
    content: 'I have a commercial property in Delhi. Tenant stopped paying rent citing business losses. What legal options do I have?',
    author: 'Sunita D.',
    category: 'advice',
    likes: 18,
    createdAt: new Date(Date.now() - 259200000),
    replies: []
  }
];

const categoryIcons = {
  question: HelpCircle,
  discussion: MessageCircle,
  advice: Lightbulb,
  experience: Heart
};

const categoryColors = {
  question: 'bg-blue-500/10 text-blue-600',
  discussion: 'bg-purple-500/10 text-purple-600',
  advice: 'bg-amber-500/10 text-amber-600',
  experience: 'bg-green-500/10 text-green-600'
};

const Community = () => {
  const [posts, setPosts] = useState<Post[]>(samplePosts);
  const [showNewPost, setShowNewPost] = useState(false);
  const [newPost, setNewPost] = useState({ title: '', content: '', category: 'question' as Post['category'] });
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [filter, setFilter] = useState<string>('all');

  const handleCreatePost = async () => {
    if (!newPost.title.trim() || !newPost.content.trim()) {
      toast.error('Please fill in all fields');
      return;
    }

    setIsLoading(true);

    try {
      // Get AI summary/guiding questions
      const { data, error } = await supabase.functions.invoke('legal-chat', {
        body: {
          message: `As a community facilitator, briefly summarize this post and provide 2-3 guiding questions for the community:
          
Title: ${newPost.title}
Content: ${newPost.content}`,
          language: 'en'
        }
      });

      const post: Post = {
        id: Date.now().toString(),
        title: newPost.title,
        content: newPost.content,
        author: 'You',
        category: newPost.category,
        likes: 0,
        replies: [],
        createdAt: new Date(),
        aiSummary: data?.response
      };

      setPosts(prev => [post, ...prev]);
      setNewPost({ title: '', content: '', category: 'question' });
      setShowNewPost(false);
      toast.success('Post published successfully');
    } catch (error) {
      console.error('Post error:', error);
      toast.error('Failed to create post');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReply = async () => {
    if (!replyContent.trim() || !selectedPost) return;

    const reply: Reply = {
      id: Date.now().toString(),
      content: replyContent,
      author: 'You',
      likes: 0,
      createdAt: new Date()
    };

    setPosts(prev => prev.map(p => 
      p.id === selectedPost.id 
        ? { ...p, replies: [...p.replies, reply] }
        : p
    ));
    setSelectedPost(prev => prev ? { ...prev, replies: [...prev.replies, reply] } : null);
    setReplyContent('');
    toast.success('Reply posted');
  };

  const handleLike = (postId: string) => {
    setPosts(prev => prev.map(p => 
      p.id === postId ? { ...p, likes: p.likes + 1 } : p
    ));
  };

  const filteredPosts = filter === 'all' 
    ? posts 
    : posts.filter(p => p.category === filter);

  const formatDate = (date: Date) => {
    const diff = Date.now() - date.getTime();
    const hours = Math.floor(diff / 3600000);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  return (
    <PageLayout>
      <SEOHead
        title="Legal Community Forum - Discuss & Share Legal Experiences"
        description="Join India's largest legal community forum. Discuss legal matters, share experiences, get advice from verified lawyers and fellow citizens on property disputes, consumer rights, and more."
        keywords="legal forum India, legal community, legal advice forum, property dispute help, consumer court experience, lawyer advice, legal discussion"
        canonicalUrl="/community"
        structuredData={communitySchema}
        breadcrumbs={[
          { name: 'Home', url: '/' },
          { name: 'Community', url: '/community' },
        ]}
      />

      <div className="container mx-auto px-4 py-6 max-w-5xl">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            <Users className="inline-block mr-2 h-8 w-8 text-primary" />
            Community Forum
          </h1>
          <p className="text-muted-foreground">
            Connect, discuss, and learn from others with similar legal experiences
          </p>
        </div>

        {selectedPost ? (
          // Post detail view
          <div className="space-y-4">
            <Button variant="ghost" onClick={() => setSelectedPost(null)}>
              ← Back to posts
            </Button>

            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <Badge className={categoryColors[selectedPost.category]}>
                      {selectedPost.category}
                    </Badge>
                    <CardTitle className="mt-2 text-xl">{selectedPost.title}</CardTitle>
                    <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="text-xs">{selectedPost.author[0]}</AvatarFallback>
                      </Avatar>
                      <span>{selectedPost.author}</span>
                      <span>•</span>
                      <Clock className="h-3 w-3" />
                      <span>{formatDate(selectedPost.createdAt)}</span>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => handleLike(selectedPost.id)}>
                    <ThumbsUp className="h-4 w-4 mr-1" />
                    {selectedPost.likes}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-foreground whitespace-pre-wrap">{selectedPost.content}</p>
                
                {selectedPost.aiSummary && (
                  <div className="mt-4 p-4 bg-primary/5 rounded-lg border border-primary/20">
                    <div className="flex items-center gap-2 text-sm font-medium text-primary mb-2">
                      <Lightbulb className="h-4 w-4" />
                      AI Summary & Discussion Points
                    </div>
                    <p className="text-sm text-muted-foreground">{selectedPost.aiSummary}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Replies */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <MessageCircle className="h-5 w-5" />
                  Replies ({selectedPost.replies.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {selectedPost.replies.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">
                    No replies yet. Be the first to share your thoughts!
                  </p>
                ) : (
                  selectedPost.replies.map(reply => (
                    <div key={reply.id} className="p-4 bg-muted/50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2 text-sm">
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className="text-xs">{reply.author[0]}</AvatarFallback>
                          </Avatar>
                          <span className="font-medium">{reply.author}</span>
                          <span className="text-muted-foreground">•</span>
                          <span className="text-muted-foreground">{formatDate(reply.createdAt)}</span>
                        </div>
                        <Button variant="ghost" size="sm">
                          <ThumbsUp className="h-3 w-3 mr-1" />
                          {reply.likes}
                        </Button>
                      </div>
                      <p className="text-sm">{reply.content}</p>
                    </div>
                  ))
                )}

                {/* Reply input */}
                <div className="flex gap-2 pt-4 border-t">
                  <Textarea
                    placeholder="Share your experience, advice, or ask a follow-up question..."
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                    className="min-h-[80px]"
                  />
                  <Button onClick={handleReply} disabled={!replyContent.trim()}>
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          // Posts list view
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
              <div className="flex gap-2 flex-wrap">
                <Button 
                  variant={filter === 'all' ? 'default' : 'outline'} 
                  size="sm"
                  onClick={() => setFilter('all')}
                >
                  All
                </Button>
                <Button 
                  variant={filter === 'question' ? 'default' : 'outline'} 
                  size="sm"
                  onClick={() => setFilter('question')}
                >
                  <HelpCircle className="h-3 w-3 mr-1" />
                  Questions
                </Button>
                <Button 
                  variant={filter === 'experience' ? 'default' : 'outline'} 
                  size="sm"
                  onClick={() => setFilter('experience')}
                >
                  <Heart className="h-3 w-3 mr-1" />
                  Experiences
                </Button>
                <Button 
                  variant={filter === 'advice' ? 'default' : 'outline'} 
                  size="sm"
                  onClick={() => setFilter('advice')}
                >
                  <Lightbulb className="h-3 w-3 mr-1" />
                  Advice
                </Button>
              </div>

              <Button onClick={() => setShowNewPost(true)}>
                <Plus className="h-4 w-4 mr-2" />
                New Post
              </Button>
            </div>

            {showNewPost && (
              <Card className="border-primary">
                <CardHeader>
                  <CardTitle className="text-lg">Create New Post</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-2">
                    {(['question', 'discussion', 'advice', 'experience'] as const).map(cat => (
                      <Button
                        key={cat}
                        variant={newPost.category === cat ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setNewPost(prev => ({ ...prev, category: cat }))}
                      >
                        {cat.charAt(0).toUpperCase() + cat.slice(1)}
                      </Button>
                    ))}
                  </div>
                  <Input
                    placeholder="Title of your post..."
                    value={newPost.title}
                    onChange={(e) => setNewPost(prev => ({ ...prev, title: e.target.value }))}
                  />
                  <Textarea
                    placeholder="Describe your question, share your experience, or seek advice..."
                    value={newPost.content}
                    onChange={(e) => setNewPost(prev => ({ ...prev, content: e.target.value }))}
                    className="min-h-[150px]"
                  />
                </CardContent>
                <CardFooter className="gap-2">
                  <Button variant="outline" onClick={() => setShowNewPost(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreatePost} disabled={isLoading}>
                    {isLoading ? 'Publishing...' : 'Publish'}
                  </Button>
                </CardFooter>
              </Card>
            )}

            <div className="space-y-4">
              {filteredPosts.map(post => {
                const CategoryIcon = categoryIcons[post.category];
                return (
                  <Card 
                    key={post.id} 
                    className="cursor-pointer hover:border-primary/50 transition-colors"
                    onClick={() => setSelectedPost(post)}
                  >
                    <CardContent className="pt-6">
                      <div className="flex items-start gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge className={categoryColors[post.category]}>
                              <CategoryIcon className="h-3 w-3 mr-1" />
                              {post.category}
                            </Badge>
                          </div>
                          <h3 className="font-semibold text-foreground mb-2">{post.title}</h3>
                          <p className="text-sm text-muted-foreground line-clamp-2">{post.content}</p>
                          
                          <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Avatar className="h-5 w-5">
                                <AvatarFallback className="text-xs">{post.author[0]}</AvatarFallback>
                              </Avatar>
                              <span>{post.author}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              <span>{formatDate(post.createdAt)}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <ThumbsUp className="h-3 w-3" />
                              <span>{post.likes}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <MessageCircle className="h-3 w-3" />
                              <span>{post.replies.length} replies</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </PageLayout>
  );
};

export default Community;
