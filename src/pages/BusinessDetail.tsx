import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Plus, Trash2, Save, Loader2, HelpCircle, Database, Palette, FileText, Globe, Eye, CheckCircle2 } from "lucide-react";

interface Business {
  id: string;
  name: string;
  description: string | null;
}

interface FAQ {
  id: string;
  question: string;
  answer: string;
}

interface KnowledgeItem {
  id: string;
  type: "text" | "website" | "file";
  title: string;
  content: string | null;
  url: string | null;
  file_name: string | null;
}

interface ChatbotStyle {
  primary_color: string;
  background_color: string;
  text_color: string;
  border_radius: string;
  position: string;
  avatar_url: string | null;
}

export default function BusinessDetail() {
  const { id } = useParams<{ id: string }>();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [business, setBusiness] = useState<Business | null>(null);
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [knowledge, setKnowledge] = useState<KnowledgeItem[]>([]);
  const [styles, setStyles] = useState<ChatbotStyle>({
    primary_color: "#6366f1",
    background_color: "#ffffff",
    text_color: "#1f2937",
    border_radius: "rounded",
    position: "bottom-right",
    avatar_url: null,
  });
  const [loadingData, setLoadingData] = useState(true);
  const [savingStyles, setSavingStyles] = useState(false);

  const [newFaq, setNewFaq] = useState({ question: "", answer: "" });
  const [addingFaq, setAddingFaq] = useState(false);

  const [newKnowledge, setNewKnowledge] = useState<{ type: "text" | "website"; title: string; content: string; url: string }>({ type: "text", title: "", content: "", url: "" });
  const [addingKnowledge, setAddingKnowledge] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user && id) {
      fetchData();
    }
  }, [user, id]);

  const fetchData = async () => {
    try {
      const [businessResult, faqsResult, knowledgeResult, stylesResult] = await Promise.all([
        supabase.from("businesses").select("id, name, description").eq("id", id).single(),
        supabase.from("business_faqs").select("*").eq("business_id", id).order("created_at"),
        supabase.from("knowledge_base").select("*").eq("business_id", id).order("created_at"),
        supabase.from("chatbot_styles").select("*").eq("business_id", id).maybeSingle(),
      ]);

      if (businessResult.error || !businessResult.data) {
        navigate("/dashboard/businesses");
        return;
      }

      setBusiness(businessResult.data);
      setFaqs(faqsResult.data || []);
      setKnowledge((knowledgeResult.data || []) as KnowledgeItem[]);
      
      if (stylesResult.data) {
        setStyles({
          primary_color: stylesResult.data.primary_color || "#6366f1",
          background_color: stylesResult.data.background_color || "#ffffff",
          text_color: stylesResult.data.text_color || "#1f2937",
          border_radius: stylesResult.data.border_radius || "rounded",
          position: stylesResult.data.position || "bottom-right",
          avatar_url: stylesResult.data.avatar_url,
        });
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoadingData(false);
    }
  };

  const addFaq = async () => {
    if (!newFaq.question.trim() || !newFaq.answer.trim()) return;
    setAddingFaq(true);

    try {
      const { data, error } = await supabase
        .from("business_faqs")
        .insert({
          business_id: id,
          question: newFaq.question,
          answer: newFaq.answer,
        })
        .select()
        .single();

      if (error) throw error;
      setFaqs([...faqs, data]);
      setNewFaq({ question: "", answer: "" });
      toast({ title: "FAQ added successfully" });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setAddingFaq(false);
    }
  };

  const deleteFaq = async (faqId: string) => {
    try {
      const { error } = await supabase.from("business_faqs").delete().eq("id", faqId);
      if (error) throw error;
      setFaqs(faqs.filter((f) => f.id !== faqId));
      toast({ title: "FAQ deleted" });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    }
  };

  const addKnowledge = async () => {
    if (!newKnowledge.title.trim()) return;
    if (newKnowledge.type === "text" && !newKnowledge.content.trim()) return;
    if (newKnowledge.type === "website" && !newKnowledge.url.trim()) return;
    
    setAddingKnowledge(true);

    try {
      const { data, error } = await supabase
        .from("knowledge_base")
        .insert({
          business_id: id,
          type: newKnowledge.type,
          title: newKnowledge.title,
          content: newKnowledge.type === "text" ? newKnowledge.content : null,
          url: newKnowledge.type === "website" ? newKnowledge.url : null,
        })
        .select()
        .single();

      if (error) throw error;
      setKnowledge([...knowledge, data as KnowledgeItem]);
      setNewKnowledge({ type: "text", title: "", content: "", url: "" });
      toast({ title: "Knowledge added successfully" });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setAddingKnowledge(false);
    }
  };

  const deleteKnowledge = async (itemId: string) => {
    try {
      const { error } = await supabase.from("knowledge_base").delete().eq("id", itemId);
      if (error) throw error;
      setKnowledge(knowledge.filter((k) => k.id !== itemId));
      toast({ title: "Knowledge deleted" });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    }
  };

  const saveStyles = async () => {
    setSavingStyles(true);
    try {
      // Check if styles already exist
      const { data: existing } = await supabase
        .from("chatbot_styles")
        .select("id")
        .eq("business_id", id)
        .maybeSingle();

      let error;
      if (existing) {
        // Update existing
        const result = await supabase
          .from("chatbot_styles")
          .update({
            primary_color: styles.primary_color,
            background_color: styles.background_color,
            text_color: styles.text_color,
            border_radius: styles.border_radius,
            position: styles.position,
            avatar_url: styles.avatar_url,
          })
          .eq("business_id", id);
        error = result.error;
      } else {
        // Insert new
        const result = await supabase
          .from("chatbot_styles")
          .insert({
            business_id: id,
            primary_color: styles.primary_color,
            background_color: styles.background_color,
            text_color: styles.text_color,
            border_radius: styles.border_radius,
            position: styles.position,
            avatar_url: styles.avatar_url,
          });
        error = result.error;
      }

      if (error) throw error;
      toast({ title: "Styles saved successfully" });
    } catch (error: any) {
      console.error("Save styles error:", error);
      toast({ variant: "destructive", title: "Error saving styles", description: error.message });
    } finally {
      setSavingStyles(false);
    }
  };

  if (loading || loadingData) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-96" />
        </div>
      </DashboardLayout>
    );
  }

  if (!business) return null;

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard/businesses")} className="h-9 w-9 rounded-lg">
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-xl font-semibold">{business.name}</h1>
              <p className="text-sm text-muted-foreground">Configure your chatbot settings</p>
            </div>
          </div>
          <Button variant="outline" size="sm" asChild className="gap-2 rounded-lg">
            <Link to={`/widget-preview/${id}`} target="_blank">
              <Eye className="w-4 h-4" />
              Preview
            </Link>
          </Button>
        </div>

        <Tabs defaultValue="faqs" className="space-y-5">
          <TabsList className="bg-muted/50 p-1 h-11 rounded-xl">
            <TabsTrigger value="faqs" className="gap-2 text-sm rounded-lg px-4">
              <HelpCircle className="w-4 h-4" />
              FAQs
            </TabsTrigger>
            <TabsTrigger value="database" className="gap-2 text-sm rounded-lg px-4">
              <Database className="w-4 h-4" />
              Database
            </TabsTrigger>
            <TabsTrigger value="styles" className="gap-2 text-sm rounded-lg px-4">
              <Palette className="w-4 h-4" />
              Styles
            </TabsTrigger>
          </TabsList>

          {/* FAQs Tab */}
          <TabsContent value="faqs" className="mt-0">
            <Card className="border-border/50 shadow-sm">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                      <HelpCircle className="w-4 h-4 text-primary" />
                      Frequently Asked Questions
                    </CardTitle>
                    <CardDescription className="text-sm mt-1">These appear as quick suggestions in the chat widget</CardDescription>
                  </div>
                  <Badge variant="secondary" className="text-xs">{faqs.length} FAQs</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Add FAQ Form */}
                <div className="space-y-3 p-4 rounded-xl bg-muted/30 border border-border/50">
                  <Input
                    placeholder="Enter a question..."
                    value={newFaq.question}
                    onChange={(e) => setNewFaq({ ...newFaq, question: e.target.value })}
                    className="bg-background h-10"
                  />
                  <Textarea
                    placeholder="Enter the answer..."
                    value={newFaq.answer}
                    onChange={(e) => setNewFaq({ ...newFaq, answer: e.target.value })}
                    rows={3}
                    className="bg-background resize-none"
                  />
                  <Button
                    onClick={addFaq}
                    disabled={addingFaq || !newFaq.question.trim() || !newFaq.answer.trim()}
                    size="sm"
                    className="gap-2"
                  >
                    {addingFaq ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    Add FAQ
                  </Button>
                </div>

                {/* FAQ List */}
                <div className="space-y-2">
                  {faqs.map((faq) => (
                    <div key={faq.id} className="p-4 rounded-xl border border-border/50 bg-card hover:border-border transition-colors">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">{faq.question}</p>
                          <p className="text-sm text-muted-foreground mt-1.5 line-clamp-2">{faq.answer}</p>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => deleteFaq(faq.id)} className="text-muted-foreground hover:text-destructive h-8 w-8 shrink-0">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {faqs.length === 0 && (
                    <div className="text-center py-8">
                      <HelpCircle className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
                      <p className="text-muted-foreground text-sm">No FAQs added yet</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Database Tab */}
          <TabsContent value="database" className="mt-0">
            <Card className="border-border/50 shadow-sm">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                      <Database className="w-4 h-4 text-primary" />
                      Knowledge Base
                    </CardTitle>
                    <CardDescription className="text-sm mt-1">Train your AI with custom content</CardDescription>
                  </div>
                  <Badge variant="secondary" className="text-xs">{knowledge.length} items</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Add Knowledge Form */}
                <div className="space-y-3 p-4 rounded-xl bg-muted/30 border border-border/50">
                  <div className="flex gap-2">
                    <Button
                      variant={newKnowledge.type === "text" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setNewKnowledge({ ...newKnowledge, type: "text" })}
                      className="gap-2"
                    >
                      <FileText className="w-4 h-4" />
                      Text
                    </Button>
                    <Button
                      variant={newKnowledge.type === "website" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setNewKnowledge({ ...newKnowledge, type: "website" })}
                      className="gap-2"
                    >
                      <Globe className="w-4 h-4" />
                      Website
                    </Button>
                  </div>
                  <Input
                    placeholder="Title (e.g., Company Policies)"
                    value={newKnowledge.title}
                    onChange={(e) => setNewKnowledge({ ...newKnowledge, title: e.target.value })}
                    className="bg-background h-10"
                  />
                  {newKnowledge.type === "text" && (
                    <Textarea
                      placeholder="Enter your knowledge content here..."
                      value={newKnowledge.content}
                      onChange={(e) => setNewKnowledge({ ...newKnowledge, content: e.target.value })}
                      rows={5}
                      className="bg-background resize-none"
                    />
                  )}
                  {newKnowledge.type === "website" && (
                    <Input
                      placeholder="https://example.com/page"
                      value={newKnowledge.url}
                      onChange={(e) => setNewKnowledge({ ...newKnowledge, url: e.target.value })}
                      className="bg-background h-10"
                    />
                  )}
                  <Button
                    onClick={addKnowledge}
                    disabled={addingKnowledge || !newKnowledge.title.trim() || (newKnowledge.type === "text" && !newKnowledge.content.trim()) || (newKnowledge.type === "website" && !newKnowledge.url.trim())}
                    size="sm"
                    className="gap-2"
                  >
                    {addingKnowledge ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    Add Knowledge
                  </Button>
                </div>

                {/* Knowledge List */}
                <div className="space-y-2">
                  {knowledge.map((item) => (
                    <div key={item.id} className="p-4 rounded-xl border border-border/50 bg-card hover:border-border transition-colors">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                            {item.type === "text" && <FileText className="w-4 h-4 text-primary" />}
                            {item.type === "website" && <Globe className="w-4 h-4 text-primary" />}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-sm">{item.title}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {item.type === "text" && `${item.content?.slice(0, 60)}...`}
                              {item.type === "website" && item.url}
                            </p>
                          </div>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => deleteKnowledge(item.id)} className="text-muted-foreground hover:text-destructive h-8 w-8 shrink-0">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {knowledge.length === 0 && (
                    <div className="text-center py-8">
                      <Database className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
                      <p className="text-muted-foreground text-sm">No knowledge added yet</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Styles Tab */}
          <TabsContent value="styles" className="mt-0">
            <Card className="border-border/50 shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Palette className="w-4 h-4 text-primary" />
                  Widget Appearance
                </CardTitle>
                <CardDescription className="text-sm mt-1">Customize how your chatbot looks on your website</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Colors */}
                <div className="grid gap-5 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Primary Color</Label>
                    <div className="flex gap-2">
                      <div className="relative">
                        <Input
                          type="color"
                          value={styles.primary_color}
                          onChange={(e) => setStyles({ ...styles, primary_color: e.target.value })}
                          className="w-12 h-10 p-1 cursor-pointer rounded-lg"
                        />
                      </div>
                      <Input
                        value={styles.primary_color}
                        onChange={(e) => setStyles({ ...styles, primary_color: e.target.value })}
                        className="flex-1 h-10 font-mono text-sm"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Background</Label>
                    <div className="flex gap-2">
                      <Input
                        type="color"
                        value={styles.background_color}
                        onChange={(e) => setStyles({ ...styles, background_color: e.target.value })}
                        className="w-12 h-10 p-1 cursor-pointer rounded-lg"
                      />
                      <Input
                        value={styles.background_color}
                        onChange={(e) => setStyles({ ...styles, background_color: e.target.value })}
                        className="flex-1 h-10 font-mono text-sm"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Text Color</Label>
                    <div className="flex gap-2">
                      <Input
                        type="color"
                        value={styles.text_color}
                        onChange={(e) => setStyles({ ...styles, text_color: e.target.value })}
                        className="w-12 h-10 p-1 cursor-pointer rounded-lg"
                      />
                      <Input
                        value={styles.text_color}
                        onChange={(e) => setStyles({ ...styles, text_color: e.target.value })}
                        className="flex-1 h-10 font-mono text-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* Avatar URL */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Avatar URL</Label>
                  <div className="flex gap-3">
                    {styles.avatar_url && (
                      <img 
                        src={styles.avatar_url} 
                        alt="Avatar preview" 
                        className="w-10 h-10 rounded-lg object-cover border border-border"
                        onError={(e) => e.currentTarget.style.display = 'none'}
                      />
                    )}
                    <Input
                      placeholder="https://example.com/avatar.png"
                      value={styles.avatar_url || ""}
                      onChange={(e) => setStyles({ ...styles, avatar_url: e.target.value || null })}
                      className="flex-1 h-10"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">Leave empty to use default avatar</p>
                </div>

                {/* Style Options */}
                <div className="grid gap-5 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Corner Style</Label>
                    <div className="flex gap-2">
                      <Button
                        variant={styles.border_radius === "rounded" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setStyles({ ...styles, border_radius: "rounded" })}
                        className="flex-1 gap-2"
                      >
                        {styles.border_radius === "rounded" && <CheckCircle2 className="w-3.5 h-3.5" />}
                        Rounded
                      </Button>
                      <Button
                        variant={styles.border_radius === "square" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setStyles({ ...styles, border_radius: "square" })}
                        className="flex-1 gap-2"
                      >
                        {styles.border_radius === "square" && <CheckCircle2 className="w-3.5 h-3.5" />}
                        Square
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Position</Label>
                    <div className="flex gap-2">
                      <Button
                        variant={styles.position === "bottom-right" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setStyles({ ...styles, position: "bottom-right" })}
                        className="flex-1 gap-2"
                      >
                        {styles.position === "bottom-right" && <CheckCircle2 className="w-3.5 h-3.5" />}
                        Bottom Right
                      </Button>
                      <Button
                        variant={styles.position === "bottom-left" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setStyles({ ...styles, position: "bottom-left" })}
                        className="flex-1 gap-2"
                      >
                        {styles.position === "bottom-left" && <CheckCircle2 className="w-3.5 h-3.5" />}
                        Bottom Left
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Preview */}
                <div className="p-4 rounded-xl bg-muted/30 border border-border/50">
                  <p className="text-xs font-medium text-muted-foreground mb-3">Preview</p>
                  <div className="flex items-center gap-3">
                    <div 
                      className={`w-12 h-12 ${styles.border_radius === "rounded" ? "rounded-full" : "rounded-xl"} flex items-center justify-center text-white font-semibold shadow-lg`}
                      style={{ backgroundColor: styles.primary_color }}
                    >
                      {styles.avatar_url ? (
                        <img src={styles.avatar_url} alt="" className={`w-full h-full object-cover ${styles.border_radius === "rounded" ? "rounded-full" : "rounded-xl"}`} />
                      ) : (
                        business.name.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div 
                      className={`p-3 ${styles.border_radius === "rounded" ? "rounded-xl" : "rounded-lg"} border max-w-[200px]`}
                      style={{ backgroundColor: styles.background_color, color: styles.text_color, borderColor: `${styles.primary_color}30` }}
                    >
                      <p className="text-sm">Hello! How can I help you today?</p>
                    </div>
                  </div>
                </div>

                <Button onClick={saveStyles} disabled={savingStyles} className="gap-2">
                  {savingStyles ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save Styles
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
