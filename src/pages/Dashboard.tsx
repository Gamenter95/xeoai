import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { MessageSquare, TrendingUp, Plus, ArrowRight, Bot, Zap, Users } from "lucide-react";

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
          <Skeleton className="h-10 w-48" />
          <div className="grid gap-4 md:grid-cols-4">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const usagePercent = stats ? Math.min((stats.totalMessages / stats.messageLimit) * 100, 100) : 0;

  return (
    <DashboardLayout>
      <div className="space-y-8 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              Overview of your chatbots and usage
            </p>
          </div>
          <Button onClick={() => navigate("/dashboard/businesses")} size="sm" className="gap-2">
            <Plus className="w-4 h-4" />
            New Chatbot
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Chatbots</CardTitle>
              <Bot className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loadingStats ? (
                <Skeleton className="h-8 w-12" />
              ) : (
                <div className="text-2xl font-bold">{stats?.totalChatbots}</div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Messages</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loadingStats ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <>
                  <div className="text-2xl font-bold">
                    {stats?.totalMessages}
                    <span className="text-sm font-normal text-muted-foreground">/{stats?.messageLimit}</span>
                  </div>
                  <Progress value={usagePercent} className="mt-2 h-1.5" />
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Conversations</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loadingStats ? (
                <Skeleton className="h-8 w-12" />
              ) : (
                <>
                  <div className="text-2xl font-bold">{stats?.conversationsThisMonth}</div>
                  <p className="text-xs text-muted-foreground mt-1">This month</p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Plan</CardTitle>
              <Zap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loadingStats ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <>
                  <div className="text-2xl font-bold capitalize">{stats?.plan}</div>
                  <p className="text-xs text-muted-foreground mt-1">{stats?.messageLimit} msgs/month</p>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Quick Start</CardTitle>
              <CardDescription>Get your chatbot running in 3 steps</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 text-xs font-semibold">
                  1
                </div>
                <div>
                  <p className="font-medium text-sm">Create a Chatbot</p>
                  <p className="text-xs text-muted-foreground">Add name and description</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 text-xs font-semibold">
                  2
                </div>
                <div>
                  <p className="font-medium text-sm">Configure Knowledge</p>
                  <p className="text-xs text-muted-foreground">Add FAQs, services, hours</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 text-xs font-semibold">
                  3
                </div>
                <div>
                  <p className="font-medium text-sm">Embed on Website</p>
                  <p className="text-xs text-muted-foreground">Copy code to your site</p>
                </div>
              </div>
              <Button
                variant="outline"
                className="w-full mt-2 gap-2"
                size="sm"
                onClick={() => navigate("/dashboard/businesses")}
              >
                Get Started
                <ArrowRight className="w-4 h-4" />
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recent Activity</CardTitle>
              <CardDescription>Your chatbot interactions</CardDescription>
            </CardHeader>
            <CardContent>
              {stats?.totalMessages === 0 ? (
                <div className="text-center py-8">
                  <MessageSquare className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">No messages yet</p>
                  <p className="text-xs text-muted-foreground mt-1">Create a chatbot to get started</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-3">
                      <TrendingUp className="w-4 h-4 text-green-500" />
                      <span className="text-sm">{stats?.totalMessages} messages this month</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-3">
                      <Users className="w-4 h-4 text-blue-500" />
                      <span className="text-sm">{stats?.conversationsThisMonth} conversations</span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
