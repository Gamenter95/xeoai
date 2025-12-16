import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { MessageSquare, Plus, Bot, Zap, Users, BarChart3, ArrowUpRight, TrendingUp, Sparkles } from "lucide-react";

interface DashboardStats {
  totalChatbots: number;
  totalMessages: number;
  messageLimit: number;
  plan: string;
  conversationsThisMonth: number;
}

interface RecentChatbot {
  id: string;
  name: string;
  description: string | null;
  messageCount: number;
}

export default function Dashboard() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentChatbots, setRecentChatbots] = useState<RecentChatbot[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchStats();
    }
  }, [user]);

  const fetchStats = async () => {
    try {
      const currentMonth = new Date().toISOString().slice(0, 7);

      const [businessesResult, userPlanResult, plansResult] = await Promise.all([
        supabase.from("businesses").select("id, name, description").eq("user_id", user!.id).order("created_at", { ascending: false }).limit(5),
        supabase.from("user_plans").select("plan").eq("user_id", user!.id).single(),
        supabase.from("plans").select("name, message_limit"),
      ]);

      const businesses = businessesResult.data || [];
      const userPlan = userPlanResult.data?.plan || "free";
      const plans = plansResult.data || [];
      const currentPlan = plans.find((p) => p.name === userPlan) || { message_limit: 100 };

      let totalMessages = 0;
      let conversationsThisMonth = 0;

      if (businesses.length > 0) {
        const businessIds = businesses.map(b => b.id);
        
        const [usageResult, convoResult] = await Promise.all([
          supabase.from("usage_tracking").select("business_id, message_count").in("business_id", businessIds).eq("month_year", currentMonth),
          supabase.from("chat_conversations").select("*", { count: "exact", head: true }).in("business_id", businessIds).gte("created_at", new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
        ]);

        const usage = usageResult.data || [];
        totalMessages = usage.reduce((sum, u) => sum + u.message_count, 0);
        conversationsThisMonth = convoResult.count || 0;

        const chatbotsWithMessages = businesses.map((b) => ({
          ...b,
          messageCount: usage.find((u) => u.business_id === b.id)?.message_count || 0,
        }));
        setRecentChatbots(chatbotsWithMessages);
      }

      setStats({
        totalChatbots: businesses.length,
        totalMessages,
        messageLimit: currentPlan.message_limit,
        plan: userPlan,
        conversationsThisMonth,
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setLoadingStats(false);
    }
  };

  if (loading || !user) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-48" />
          <div className="grid gap-4 md:grid-cols-4">
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const usagePercent = stats ? Math.min((stats.totalMessages / stats.messageLimit) * 100, 100) : 0;

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground text-sm mt-1">Welcome back! Here's your overview.</p>
          </div>
          <Button onClick={() => navigate("/dashboard/businesses")} className="gap-2 shadow-sm">
            <Plus className="w-4 h-4" />
            New Chatbot
          </Button>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="border-border/50 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">Chatbots</CardTitle>
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                <Bot className="h-4 w-4 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              {loadingStats ? (
                <Skeleton className="h-8 w-12" />
              ) : (
                <div className="text-3xl font-bold">{stats?.totalChatbots}</div>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/50 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">Messages</CardTitle>
              <div className="w-9 h-9 rounded-lg bg-info/10 flex items-center justify-center">
                <MessageSquare className="h-4 w-4 text-info" />
              </div>
            </CardHeader>
            <CardContent>
              {loadingStats ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <>
                  <div className="text-3xl font-bold">
                    {stats?.totalMessages}
                    <span className="text-sm font-normal text-muted-foreground ml-1">/ {stats?.messageLimit}</span>
                  </div>
                  <Progress value={usagePercent} className="mt-2 h-1.5" />
                </>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/50 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">Conversations</CardTitle>
              <div className="w-9 h-9 rounded-lg bg-success/10 flex items-center justify-center">
                <Users className="h-4 w-4 text-success" />
              </div>
            </CardHeader>
            <CardContent>
              {loadingStats ? (
                <Skeleton className="h-8 w-12" />
              ) : (
                <>
                  <div className="text-3xl font-bold">{stats?.conversationsThisMonth}</div>
                  <p className="text-xs text-muted-foreground mt-1">This month</p>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/50 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">Plan</CardTitle>
              <div className="w-9 h-9 rounded-lg bg-warning/10 flex items-center justify-center">
                <Zap className="h-4 w-4 text-warning" />
              </div>
            </CardHeader>
            <CardContent>
              {loadingStats ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <>
                  <div className="text-3xl font-bold capitalize">{stats?.plan}</div>
                  <p className="text-xs text-muted-foreground mt-1">{stats?.messageLimit} msgs/month</p>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Recent Chatbots */}
          <Card className="lg:col-span-2 border-border/50 shadow-sm">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-semibold">Recent Chatbots</CardTitle>
                  <p className="text-sm text-muted-foreground mt-0.5">Your latest configurations</p>
                </div>
                <Button variant="ghost" size="sm" asChild className="text-primary h-8">
                  <Link to="/dashboard/businesses">
                    View all
                    <ArrowUpRight className="w-4 h-4 ml-1" />
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loadingStats ? (
                <div className="space-y-3">
                  <Skeleton className="h-16" />
                  <Skeleton className="h-16" />
                  <Skeleton className="h-16" />
                </div>
              ) : recentChatbots.length > 0 ? (
                <div className="space-y-2">
                  {recentChatbots.map((chatbot) => (
                    <Link 
                      key={chatbot.id} 
                      to={`/dashboard/businesses/${chatbot.id}`}
                      className="flex items-center justify-between p-4 rounded-xl border border-border/50 bg-card hover:border-primary/30 hover:bg-muted/30 transition-all group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg gradient-primary flex items-center justify-center text-white font-semibold text-sm shadow-sm">
                          {chatbot.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-sm group-hover:text-primary transition-colors">{chatbot.name}</p>
                          <p className="text-xs text-muted-foreground">{chatbot.messageCount} messages this month</p>
                        </div>
                      </div>
                      <ArrowUpRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10">
                  <Bot className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-muted-foreground text-sm mb-3">No chatbots yet</p>
                  <Button variant="outline" size="sm" asChild>
                    <Link to="/dashboard/businesses">Create your first chatbot</Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="border-border/50 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-semibold">Quick Actions</CardTitle>
              <p className="text-sm text-muted-foreground">Common tasks</p>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full justify-start gap-3 h-12 rounded-xl" asChild>
                <Link to="/dashboard/businesses">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Plus className="w-4 h-4 text-primary" />
                  </div>
                  <span className="text-sm font-medium">Create Chatbot</span>
                </Link>
              </Button>
              <Button variant="outline" className="w-full justify-start gap-3 h-12 rounded-xl" asChild>
                <Link to="/dashboard/analytics">
                  <div className="w-8 h-8 rounded-lg bg-info/10 flex items-center justify-center">
                    <BarChart3 className="w-4 h-4 text-info" />
                  </div>
                  <span className="text-sm font-medium">View Analytics</span>
                </Link>
              </Button>
              <Button variant="outline" className="w-full justify-start gap-3 h-12 rounded-xl" asChild>
                <Link to="/dashboard/settings">
                  <div className="w-8 h-8 rounded-lg bg-success/10 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-success" />
                  </div>
                  <span className="text-sm font-medium">Account Settings</span>
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Getting Started */}
        {stats?.totalChatbots === 0 && (
          <Card className="border-dashed border-2 border-primary/30 bg-primary/5">
            <CardContent className="p-8 text-center">
              <div className="w-14 h-14 rounded-2xl gradient-primary flex items-center justify-center mx-auto mb-4 shadow-lg">
                <Bot className="w-7 h-7 text-white" />
              </div>
              <h3 className="font-bold text-lg mb-2">Create Your First Chatbot</h3>
              <p className="text-sm text-muted-foreground mb-5 max-w-sm mx-auto">
                Set up an AI-powered chatbot trained on your business data in minutes
              </p>
              <Button onClick={() => navigate("/dashboard/businesses")} className="gap-2 shadow-sm">
                <Plus className="w-4 h-4" />
                Get Started
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
