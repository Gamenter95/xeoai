import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, Settings, Code, Loader2, Bot, Eye, MessageSquare, ArrowUpRight } from "lucide-react";
import { z } from "zod";

interface Business {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
}

const businessSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  description: z.string().max(1000).optional(),
});

export default function Businesses() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingBusiness, setEditingBusiness] = useState<Business | null>(null);
  const [messageCounts, setMessageCounts] = useState<Record<string, number>>({});

  const [formData, setFormData] = useState({
    name: "",
    description: "",
  });

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchBusinesses();
    }
  }, [user]);

  const fetchBusinesses = async () => {
    try {
      const { data, error } = await supabase
        .from("businesses")
        .select("id, name, description, created_at")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setBusinesses(data || []);

      // Fetch message counts
      if (data && data.length > 0) {
        const currentMonth = new Date().toISOString().slice(0, 7);
        const { data: usage } = await supabase
          .from("usage_tracking")
          .select("business_id, message_count")
          .in("business_id", data.map(b => b.id))
          .eq("month_year", currentMonth);

        const counts: Record<string, number> = {};
        usage?.forEach(u => {
          counts[u.business_id] = u.message_count;
        });
        setMessageCounts(counts);
      }
    } catch (error) {
      console.error("Error fetching businesses:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load chatbots",
      });
    } finally {
      setLoadingData(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const result = businessSchema.safeParse(formData);
    if (!result.success) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: result.error.errors[0].message,
      });
      return;
    }

    setIsSubmitting(true);

    try {
      if (editingBusiness) {
        const { error } = await supabase
          .from("businesses")
          .update({
            name: formData.name,
            description: formData.description || null,
          })
          .eq("id", editingBusiness.id);

        if (error) throw error;
        toast({ title: "Chatbot updated successfully" });
      } else {
        const { error } = await supabase.from("businesses").insert({
          user_id: user!.id,
          name: formData.name,
          description: formData.description || null,
        });

        if (error) throw error;
        toast({ title: "Chatbot created successfully" });
      }

      setIsDialogOpen(false);
      resetForm();
      fetchBusinesses();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to save chatbot",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (business: Business) => {
    setEditingBusiness(business);
    setFormData({
      name: business.name,
      description: business.description || "",
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this chatbot? This cannot be undone.")) {
      return;
    }

    try {
      const { error } = await supabase.from("businesses").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Chatbot deleted" });
      fetchBusinesses();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to delete chatbot",
      });
    }
  };

  const resetForm = () => {
    setEditingBusiness(null);
    setFormData({
      name: "",
      description: "",
    });
  };

  if (loading || !user) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-48" />
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            <Skeleton className="h-56 rounded-2xl" />
            <Skeleton className="h-56 rounded-2xl" />
            <Skeleton className="h-56 rounded-2xl" />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">My Chatbots</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Create and manage AI chatbots for your business
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button className="gap-2 shadow-sm">
                <Plus className="w-4 h-4" />
                New Chatbot
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle className="text-lg font-semibold">
                  {editingBusiness ? "Edit Chatbot" : "Create New Chatbot"}
                </DialogTitle>
                <DialogDescription>
                  {editingBusiness
                    ? "Update your chatbot information"
                    : "Add a new AI chatbot for your business"}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-sm font-medium">Chatbot Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Customer Support Bot"
                    className="h-11"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description" className="text-sm font-medium">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Describe your business and what the chatbot should help with..."
                    rows={4}
                    className="resize-none"
                  />
                  <p className="text-xs text-muted-foreground">
                    This description appears in the chat widget and helps the AI understand context
                  </p>
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : editingBusiness ? (
                      "Update Chatbot"
                    ) : (
                      "Create Chatbot"
                    )}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {loadingData ? (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            <Skeleton className="h-56 rounded-2xl" />
            <Skeleton className="h-56 rounded-2xl" />
            <Skeleton className="h-56 rounded-2xl" />
          </div>
        ) : businesses.length === 0 ? (
          <Card className="border-dashed border-2 border-primary/30 bg-primary/5 rounded-2xl">
            <CardContent className="flex flex-col items-center justify-center py-14">
              <div className="w-14 h-14 rounded-2xl gradient-primary flex items-center justify-center mb-5 shadow-lg">
                <Bot className="w-7 h-7 text-white" />
              </div>
              <h3 className="font-bold text-lg mb-2">No chatbots yet</h3>
              <p className="text-muted-foreground text-center max-w-sm text-sm mb-5">
                Create your first AI chatbot to start engaging with customers 24/7
              </p>
              <Button onClick={() => setIsDialogOpen(true)} className="gap-2 shadow-sm">
                <Plus className="w-4 h-4" />
                Create Chatbot
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {businesses.map((business) => (
              <Card key={business.id} className="group rounded-2xl border border-border/50 hover:border-primary/30 transition-all duration-300 hover:shadow-lg overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center shadow-md group-hover:shadow-lg transition-shadow">
                      <span className="text-white font-bold text-lg">{business.name.charAt(0).toUpperCase()}</span>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(business)}
                        className="h-8 w-8 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(business.id)}
                        className="h-8 w-8 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <CardTitle className="text-lg font-semibold mt-4">{business.name}</CardTitle>
                  {business.description ? (
                    <CardDescription className="line-clamp-2 mt-1 text-sm">
                      {business.description}
                    </CardDescription>
                  ) : (
                    <CardDescription className="text-sm mt-1 italic">No description</CardDescription>
                  )}
                </CardHeader>
                <CardContent className="pt-0 space-y-4">
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <MessageSquare className="w-4 h-4" />
                      <span>{messageCounts[business.id] || 0} messages</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 gap-2 rounded-lg h-9"
                      onClick={() => navigate(`/dashboard/businesses/${business.id}`)}
                    >
                      <Settings className="w-4 h-4" />
                      Configure
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9 w-9 p-0 rounded-lg"
                      asChild
                    >
                      <Link to={`/widget-preview/${business.id}`} target="_blank">
                        <Eye className="w-4 h-4" />
                      </Link>
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1 gap-2 rounded-lg h-9"
                      onClick={() => navigate(`/dashboard/embed?business=${business.id}`)}
                    >
                      <Code className="w-4 h-4" />
                      Embed
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
