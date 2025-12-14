import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
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
import { useToast } from "@/hooks/use-toast";
import { Plus, Building2, Edit, Trash2, ExternalLink, Loader2 } from "lucide-react";
import { z } from "zod";

interface Business {
  id: string;
  name: string;
  description: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  website: string | null;
  address: string | null;
  created_at: string;
}

const businessSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  description: z.string().max(500).optional(),
  contact_email: z.string().email().optional().or(z.literal("")),
  contact_phone: z.string().max(20).optional(),
  website: z.string().url().optional().or(z.literal("")),
  address: z.string().max(200).optional(),
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

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    contact_email: "",
    contact_phone: "",
    website: "",
    address: "",
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
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setBusinesses(data || []);
    } catch (error) {
      console.error("Error fetching businesses:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load businesses",
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
            contact_email: formData.contact_email || null,
            contact_phone: formData.contact_phone || null,
            website: formData.website || null,
            address: formData.address || null,
          })
          .eq("id", editingBusiness.id);

        if (error) throw error;
        toast({ title: "Business updated successfully" });
      } else {
        const { error } = await supabase.from("businesses").insert({
          user_id: user!.id,
          name: formData.name,
          description: formData.description || null,
          contact_email: formData.contact_email || null,
          contact_phone: formData.contact_phone || null,
          website: formData.website || null,
          address: formData.address || null,
        });

        if (error) throw error;
        toast({ title: "Business created successfully" });
      }

      setIsDialogOpen(false);
      resetForm();
      fetchBusinesses();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to save business",
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
      contact_email: business.contact_email || "",
      contact_phone: business.contact_phone || "",
      website: business.website || "",
      address: business.address || "",
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this business? This cannot be undone.")) {
      return;
    }

    try {
      const { error } = await supabase.from("businesses").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Business deleted" });
      fetchBusinesses();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to delete business",
      });
    }
  };

  const resetForm = () => {
    setEditingBusiness(null);
    setFormData({
      name: "",
      description: "",
      contact_email: "",
      contact_phone: "",
      website: "",
      address: "",
    });
  };

  if (loading || !user) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-48" />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Skeleton className="h-48" />
            <Skeleton className="h-48" />
            <Skeleton className="h-48" />
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
            <h1 className="text-3xl font-display font-bold">Businesses</h1>
            <p className="text-muted-foreground mt-1">
              Manage your businesses and their chatbot settings
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                Add Business
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>
                  {editingBusiness ? "Edit Business" : "Add New Business"}
                </DialogTitle>
                <DialogDescription>
                  {editingBusiness
                    ? "Update your business information"
                    : "Add a new business to create a chatbot for"}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Business Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="My Business"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Brief description of your business..."
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Contact Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.contact_email}
                      onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                      placeholder="contact@example.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Contact Phone</Label>
                    <Input
                      id="phone"
                      value={formData.contact_phone}
                      onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                      placeholder="+1 234 567 8900"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="website">Website</Label>
                  <Input
                    id="website"
                    value={formData.website}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                    placeholder="https://example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="123 Main St, City, Country"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-4">
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
                      "Update"
                    ) : (
                      "Create"
                    )}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {loadingData ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Skeleton className="h-48" />
            <Skeleton className="h-48" />
            <Skeleton className="h-48" />
          </div>
        ) : businesses.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Building2 className="w-12 h-12 text-muted-foreground mb-4" />
              <h3 className="font-semibold text-lg mb-2">No businesses yet</h3>
              <p className="text-muted-foreground text-center mb-4">
                Create your first business to get started with AI chatbots
              </p>
              <Button onClick={() => setIsDialogOpen(true)} className="gap-2">
                <Plus className="w-4 h-4" />
                Add Business
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {businesses.map((business) => (
              <Card key={business.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="truncate">{business.name}</span>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(business)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(business.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardTitle>
                  {business.description && (
                    <CardDescription className="line-clamp-2">
                      {business.description}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    {business.contact_email && (
                      <p className="text-muted-foreground">{business.contact_email}</p>
                    )}
                    {business.website && (
                      <a
                        href={business.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline flex items-center gap-1"
                      >
                        Visit website
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => navigate(`/dashboard/businesses/${business.id}`)}
                    >
                      Manage
                    </Button>
                    <Button
                      variant="default"
                      size="sm"
                      className="flex-1"
                      onClick={() => navigate(`/dashboard/embed?business=${business.id}`)}
                    >
                      Get Embed
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
