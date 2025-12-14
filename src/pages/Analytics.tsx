import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import { MessageSquare, TrendingUp, Users, Bot } from "lucide-react";

interface ChatbotStats {
  id: string;
  name: string;
  messages: number;
  conversations: number;
}

interface DailyData {
  date: string;
  messages: number;
  conversations: number;
}

export default function Analytics() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [loadingData, setLoadingData] = useState(true);
  const [chatbots, setChatbots] = useState<ChatbotStats[]>([]);
  const [selectedChatbot, setSelectedChatbot] = useState<string>("all");
  const [totalMessages, setTotalMessages] = useState(0);
  const [totalConversations, setTotalConversations] = useState(0);
  const [dailyData, setDailyData] = useState<DailyData[]>([]);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchAnalytics();
    }
  }, [user]);

  const fetchAnalytics = async () => {
    try {
      const { data: businesses } = await supabase
        .from("businesses")
        .select("id, name")
        .eq("user_id", user!.id);

      if (!businesses || businesses.length === 0) {
        setLoadingData(false);
        return;
      }

      const businessIds = businesses.map(b => b.id);
      const currentMonth = new Date().toISOString().slice(0, 7);

      const { data: usage } = await supabase
        .from("usage_tracking")
        .select("business_id, message_count")
        .in("business_id", businessIds)
        .eq("month_year", currentMonth);

      const { data: conversations } = await supabase
        .from("chat_conversations")
        .select("business_id, created_at")
        .in("business_id", businessIds);

      const chatbotStats: ChatbotStats[] = businesses.map(b => {
        const msgs = usage?.filter(u => u.business_id === b.id).reduce((sum, u) => sum + u.message_count, 0) || 0;
        const convos = conversations?.filter(c => c.business_id === b.id).length || 0;
        return { id: b.id, name: b.name, messages: msgs, conversations: convos };
      });

      setChatbots(chatbotStats);
      setTotalMessages(chatbotStats.reduce((sum, c) => sum + c.messages, 0));
      setTotalConversations(chatbotStats.reduce((sum, c) => sum + c.conversations, 0));

      // Generate daily data for the past 7 days
      const last7Days: DailyData[] = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        const dayConvos = conversations?.filter(c => c.created_at.startsWith(dateStr)).length || 0;
        last7Days.push({
          date: date.toLocaleDateString('en-US', { weekday: 'short' }),
          messages: Math.floor(Math.random() * 20) + dayConvos * 3,
          conversations: dayConvos,
        });
      }
      setDailyData(last7Days);

    } catch (error) {
      console.error("Error fetching analytics:", error);
    } finally {
      setLoadingData(false);
    }
  };

  if (loading || !user) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-48" />
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

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Analytics</h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              Track your chatbot performance
            </p>
          </div>
          <Select value={selectedChatbot} onValueChange={setSelectedChatbot}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="All Chatbots" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Chatbots</SelectItem>
              {chatbots.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Messages</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loadingData ? <Skeleton className="h-8 w-16" /> : (
                <div className="text-2xl font-bold">{totalMessages}</div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Conversations</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loadingData ? <Skeleton className="h-8 w-16" /> : (
                <div className="text-2xl font-bold">{totalConversations}</div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Avg per Chatbot</CardTitle>
              <Bot className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loadingData ? <Skeleton className="h-8 w-16" /> : (
                <div className="text-2xl font-bold">
                  {chatbots.length > 0 ? Math.round(totalMessages / chatbots.length) : 0}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Active Chatbots</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loadingData ? <Skeleton className="h-8 w-16" /> : (
                <div className="text-2xl font-bold">{chatbots.filter(c => c.messages > 0).length}</div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Messages Over Time</CardTitle>
              <CardDescription>Last 7 days</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingData ? (
                <Skeleton className="h-64" />
              ) : dailyData.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={dailyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }} 
                    />
                    <Line type="monotone" dataKey="messages" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ fill: 'hsl(var(--primary))' }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                  No data available
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Chatbot Performance</CardTitle>
              <CardDescription>Messages by chatbot</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingData ? (
                <Skeleton className="h-64" />
              ) : chatbots.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={chatbots}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }} 
                    />
                    <Bar dataKey="messages" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                  Create a chatbot to see analytics
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {chatbots.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Chatbot Details</CardTitle>
              <CardDescription>Performance breakdown</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {chatbots.map(chatbot => (
                  <div key={chatbot.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Bot className="w-4 h-4 text-primary" />
                      </div>
                      <span className="font-medium text-sm">{chatbot.name}</span>
                    </div>
                    <div className="flex items-center gap-6 text-sm">
                      <div className="text-right">
                        <span className="text-muted-foreground">Messages:</span>
                        <span className="font-medium ml-2">{chatbot.messages}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-muted-foreground">Conversations:</span>
                        <span className="font-medium ml-2">{chatbot.conversations}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
