import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Building2, MessageSquare, TrendingUp, Plus, ArrowRight } from "lucide-react";

interface DashboardStats {
  totalBusinesses: number;
  totalMessages: number;
  messageLimit: number;
  plan: string;
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
      // Fetch businesses count
      const { count: businessCount } = await supabase
        .from("businesses")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user!.id);

      // Fetch user's plan
      const { data: userPlan } = await supabase
        .from("user_plans")
        .select("plan")
        .eq("user_id", user!.id)
        .single();

      // Fetch plan details
      const { data: planData } = await supabase
        .from("plans")
        .select("message_limit")
        .eq("name", userPlan?.plan || "free")
        .single();

      // Fetch total messages this month
      const currentMonth = new Date().toISOString().slice(0, 7);
      const { data: businesses } = await supabase
        .from("businesses")
        .select("id")
        .eq("user_id", user!.id);

      let totalMessages = 0;
      if (businesses && businesses.length > 0) {
        const { data: usage } = await supabase
          .from("usage_tracking")
          .select("message_count")
          .in("business_id", businesses.map(b => b.id))
          .eq("month_year", currentMonth);

        totalMessages = usage?.reduce((sum, u) => sum + u.message_count, 0) || 0;
      }

      setStats({
        totalBusinesses: businessCount || 0,
        totalMessages,
        messageLimit: planData?.message_limit || 100,
        plan: userPlan?.plan || "free",
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
          <div className="grid gap-4 md:grid-cols-3">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold">Dashboard</h1>
            <p className="text-muted-foreground mt-1">
              Welcome back! Here's an overview of your chatbots.
            </p>
          </div>
          <Button onClick={() => navigate("/dashboard/businesses")} className="gap-2">
            <Plus className="w-4 h-4" />
            Add Business
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Businesses</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loadingStats ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-2xl font-bold">{stats?.totalBusinesses}</div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Messages This Month</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loadingStats ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <>
                  <div className="text-2xl font-bold">
                    {stats?.totalMessages} / {stats?.messageLimit}
                  </div>
                  <div className="mt-2 h-2 bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all"
                      style={{
                        width: `${Math.min(
                          ((stats?.totalMessages || 0) / (stats?.messageLimit || 1)) * 100,
                          100
                        )}%`,
                      }}
                    />
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Current Plan</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loadingStats ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <div className="text-2xl font-bold capitalize">{stats?.plan}</div>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                {stats?.messageLimit} messages/month
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Quick Start Guide</CardTitle>
              <CardDescription>Get your chatbot up and running in minutes</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 font-semibold">
                  1
                </div>
                <div>
                  <p className="font-medium">Create a Business</p>
                  <p className="text-sm text-muted-foreground">
                    Add your business details and information
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 font-semibold">
                  2
                </div>
                <div>
                  <p className="font-medium">Add FAQs & Services</p>
                  <p className="text-sm text-muted-foreground">
                    Train your chatbot with business-specific content
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 font-semibold">
                  3
                </div>
                <div>
                  <p className="font-medium">Embed on Your Website</p>
                  <p className="text-sm text-muted-foreground">
                    Copy the embed code and paste it on your site
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                className="w-full mt-4 gap-2"
                onClick={() => navigate("/dashboard/businesses")}
              >
                Get Started
                <ArrowRight className="w-4 h-4" />
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Need Help?</CardTitle>
              <CardDescription>Resources to help you succeed</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="ghost" className="w-full justify-start" asChild>
                <a href="#" className="gap-2">
                  <MessageSquare className="w-4 h-4" />
                  Documentation
                </a>
              </Button>
              <Button variant="ghost" className="w-full justify-start" asChild>
                <a href="#" className="gap-2">
                  <Building2 className="w-4 h-4" />
                  Best Practices
                </a>
              </Button>
              <Button variant="ghost" className="w-full justify-start" asChild>
                <a href="#" className="gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Contact Support
                </a>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
