import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Copy, Check, Code, ExternalLink } from "lucide-react";

interface Business {
  id: string;
  name: string;
}

export default function Embed() {
  const [searchParams] = useSearchParams();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [selectedBusiness, setSelectedBusiness] = useState<string>("");
  const [loadingData, setLoadingData] = useState(true);
  const [copied, setCopied] = useState(false);

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

  useEffect(() => {
    const businessId = searchParams.get("business");
    if (businessId) {
      setSelectedBusiness(businessId);
    }
  }, [searchParams]);

  const fetchBusinesses = async () => {
    try {
      const { data, error } = await supabase
        .from("businesses")
        .select("id, name")
        .eq("user_id", user!.id)
        .order("name");

      if (error) throw error;
      setBusinesses(data || []);

      if (data && data.length > 0 && !selectedBusiness) {
        setSelectedBusiness(data[0].id);
      }
    } catch (error) {
      console.error("Error fetching businesses:", error);
    } finally {
      setLoadingData(false);
    }
  };

  const getEmbedCode = () => {
    const widgetUrl = `${window.location.origin}/widget/${selectedBusiness}`;
    return `<!-- XeoAI Chat Widget -->
<script>
  (function() {
    var script = document.createElement('script');
    script.src = '${window.location.origin}/widget-loader.js';
    script.setAttribute('data-business-id', '${selectedBusiness}');
    script.async = true;
    document.head.appendChild(script);
  })();
</script>`;
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(getEmbedCode());
      setCopied(true);
      toast({ title: "Copied to clipboard!" });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({ variant: "destructive", title: "Failed to copy" });
    }
  };

  if (loading || loadingData) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-96" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-3xl font-display font-bold">Embed Code</h1>
          <p className="text-muted-foreground mt-1">
            Get the code to add the chatbot widget to your website
          </p>
        </div>

        {businesses.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Code className="w-12 h-12 text-muted-foreground mb-4" />
              <h3 className="font-semibold text-lg mb-2">No businesses yet</h3>
              <p className="text-muted-foreground text-center mb-4">
                Create a business first to get your embed code
              </p>
              <Button onClick={() => navigate("/dashboard/businesses")}>
                Create Business
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Select Business</CardTitle>
                <CardDescription>Choose which business to generate embed code for</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Business</Label>
                  <Select value={selectedBusiness} onValueChange={setSelectedBusiness}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a business" />
                    </SelectTrigger>
                    <SelectContent>
                      {businesses.map((business) => (
                        <SelectItem key={business.id} value={business.id}>
                          {business.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Embed Code</Label>
                  <div className="relative">
                    <pre className="p-4 bg-muted rounded-lg text-sm overflow-x-auto whitespace-pre-wrap break-all">
                      {getEmbedCode()}
                    </pre>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="absolute top-2 right-2"
                      onClick={copyToClipboard}
                    >
                      {copied ? (
                        <>
                          <Check className="w-4 h-4 mr-1" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4 mr-1" />
                          Copy
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => window.open(`/widget-preview/${selectedBusiness}`, "_blank")}
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Preview Widget
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Installation Instructions</CardTitle>
                <CardDescription>How to add the chatbot to your website</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 text-sm font-semibold">
                      1
                    </div>
                    <div>
                      <p className="font-medium">Copy the embed code</p>
                      <p className="text-sm text-muted-foreground">
                        Click the copy button above to copy the widget code
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 text-sm font-semibold">
                      2
                    </div>
                    <div>
                      <p className="font-medium">Paste in your website</p>
                      <p className="text-sm text-muted-foreground">
                        Add the code just before the closing &lt;/body&gt; tag
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 text-sm font-semibold">
                      3
                    </div>
                    <div>
                      <p className="font-medium">That's it!</p>
                      <p className="text-sm text-muted-foreground">
                        The chat widget will appear on your website
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm font-medium mb-2">Supported Platforms</p>
                  <p className="text-sm text-muted-foreground">
                    Works with any website: WordPress, Shopify, Squarespace, Wix, custom HTML, and more.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
