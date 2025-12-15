import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { MessageSquare, Plus, Bot, Zap, Users, BarChart3, ArrowUpRight } from "lucide-react";

interface DashboardStats {
  totalChatbots: number;
  totalMessages: number;
  messageLimit: number;
  plan: string;
  conversationsThisMonth: number;
}

export default function Dashboard() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
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
      const { count: chatbotCount } = await supabase
        .from("businesses")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user!.id);

      const { data: userPlan } = await supabase
        .from("user_plans")
        .select("plan")
        .eq("user_id", user!.id)
        .single();

      const { data: planData } = await supabase
        .from("plans")
        .select("message_limit")
        .eq("name", userPlan?.plan || "free")
        .single();

      const currentMonth = new Date().toISOString().slice(0, 7);
      const { data: businesses } = await supabase
        .from("businesses")
        .select("id")
        .eq("user_id", user!.id);

      let totalMessages = 0;
      let conversationsThisMonth = 0;

      if (businesses && businesses.length > 0) {
        const businessIds = businesses.map(b => b.id);
        
        const { data: usage } = await supabase
          .from("usage_tracking")
          .select("message_count")
          .in("business_id", businessIds)
          .eq("month_year", currentMonth);

        totalMessages = usage?.reduce((sum, u) => sum + u.message_count, 0) || 0;

        const { count: convoCount } = await supabase
          .from("chat_conversations")
          .select("*", { count: "exact", head: true })
          .in("business_id", businessIds)
          .gte("created_at", new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString());

        conversationsThisMonth = convoCount || 0;
      }

      setStats({
        totalChatbots: chatbotCount || 0,
        totalMessages,
        messageLimit: planData?.message_limit || 100,
        plan: userPlan?.plan || "free",
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground text-sm">Overview of your chatbots</p>
          </div>
          <Button onClick={() => navigate("/dashboard/businesses")} size="sm" className="gap-2">
            <Plus className="w-4 h-4" />
            New Chatbot
          </Button>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="border-border/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">Chatbots</CardTitle>
              <Bot className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              {loadingStats ? (
                <Skeleton className="h-7 w-12" />
              ) : (
                <div className="text-2xl font-semibold">{stats?.totalChatbots}</div>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">Messages</CardTitle>
              <MessageSquare className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              {loadingStats ? (
                <Skeleton className="h-7 w-20" />
              ) : (
                <>
                  <div className="text-2xl font-semibold">
                    {stats?.totalMessages}
                    <span className="text-sm font-normal text-muted-foreground">/{stats?.messageLimit}</span>
                  </div>
                  <Progress value={usagePercent} className="mt-2 h-1" />
                </>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">Conversations</CardTitle>
              <Users className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              {loadingStats ? (
                <Skeleton className="h-7 w-12" />
              ) : (
                <>
                  <div className="text-2xl font-semibold">{stats?.conversationsThisMonth}</div>
                  <p className="text-xs text-muted-foreground">This month</p>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">Plan</CardTitle>
              <Zap className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              {loadingStats ? (
                <Skeleton className="h-7 w-16" />
              ) : (
                <>
                  <div className="text-2xl font-semibold capitalize">{stats?.plan}</div>
                  <p className="text-xs text-muted-foreground">{stats?.messageLimit} msgs/mo</p>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid gap-4 lg:grid-cols-3">
          <Card 
            className="border-border/50 cursor-pointer hover:border-primary/30 transition-colors group"
            onClick={() => navigate("/dashboard/businesses")}
          >
            <CardContent className="p-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Bot className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">Manage Chatbots</p>
                <p className="text-xs text-muted-foreground truncate">Create, edit, and configure</p>
              </div>
              <ArrowUpRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </CardContent>
          </Card>

          <Card 
            className="border-border/50 cursor-pointer hover:border-primary/30 transition-colors group"
            onClick={() => navigate("/dashboard/analytics")}
          >
            <CardContent className="p-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <BarChart3 className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">View Analytics</p>
                <p className="text-xs text-muted-foreground truncate">Usage and performance</p>
              </div>
              <ArrowUpRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </CardContent>
          </Card>

          <Card 
            className="border-border/50 cursor-pointer hover:border-primary/30 transition-colors group"
            onClick={() => navigate("/dashboard/settings")}
          >
            <CardContent className="p-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Zap className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">Upgrade Plan</p>
                <p className="text-xs text-muted-foreground truncate">Get more messages</p>
              </div>
              <ArrowUpRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </CardContent>
          </Card>
        </div>

        {/* Getting Started */}
        {stats?.totalChatbots === 0 && (
          <Card className="border-dashed border-2 border-border/50">
            <CardContent className="p-8 text-center">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Bot className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-1">Create Your First Chatbot</h3>
              <p className="text-sm text-muted-foreground mb-4 max-w-sm mx-auto">
                Set up an AI-powered chatbot for your business in minutes
              </p>
              <Button onClick={() => navigate("/dashboard/businesses")} className="gap-2">
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
