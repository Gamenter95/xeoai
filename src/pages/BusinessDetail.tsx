import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
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
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Plus, Trash2, Save, Loader2, HelpCircle, Database, Palette, FileText, Globe, Upload } from "lucide-react";

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

  const [newKnowledge, setNewKnowledge] = useState<{ type: "text" | "website" | "file"; title: string; content: string; url: string }>({ type: "text", title: "", content: "", url: "" });
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
        supabase.from("chatbot_styles").select("*").eq("business_id", id).single(),
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
      toast({ title: "FAQ added" });
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
      toast({ title: "Knowledge added" });
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
      const { error } = await supabase
        .from("chatbot_styles")
        .upsert({
          business_id: id,
          ...styles,
        }, { onConflict: "business_id" });

      if (error) throw error;
      toast({ title: "Styles saved" });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
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
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard/businesses")} className="h-8 w-8">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-xl font-semibold">{business.name}</h1>
            <p className="text-sm text-muted-foreground">Configure your chatbot</p>
          </div>
        </div>

        <Tabs defaultValue="faqs" className="space-y-4">
          <TabsList className="bg-muted/50 p-1">
            <TabsTrigger value="faqs" className="gap-2 text-sm">
              <HelpCircle className="w-4 h-4" />
              FAQs
            </TabsTrigger>
            <TabsTrigger value="database" className="gap-2 text-sm">
              <Database className="w-4 h-4" />
              Database
            </TabsTrigger>
            <TabsTrigger value="styles" className="gap-2 text-sm">
              <Palette className="w-4 h-4" />
              Styles
            </TabsTrigger>
          </TabsList>

          {/* FAQs Tab */}
          <TabsContent value="faqs">
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-base flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 text-primary" />
                  Frequently Asked Questions
                </CardTitle>
                <CardDescription className="text-sm">Add questions that appear as suggestions in the chat</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3 p-4 rounded-lg bg-muted/30 border border-border/50">
                  <Input
                    placeholder="Question"
                    value={newFaq.question}
                    onChange={(e) => setNewFaq({ ...newFaq, question: e.target.value })}
                    className="bg-background"
                  />
                  <Textarea
                    placeholder="Answer"
                    value={newFaq.answer}
                    onChange={(e) => setNewFaq({ ...newFaq, answer: e.target.value })}
                    rows={2}
                    className="bg-background"
                  />
                  <Button
                    onClick={addFaq}
                    disabled={addingFaq || !newFaq.question.trim() || !newFaq.answer.trim()}
                    size="sm"
                    className="gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Add FAQ
                  </Button>
                </div>

                <div className="space-y-2">
                  {faqs.map((faq) => (
                    <div key={faq.id} className="p-3 rounded-lg border border-border/50 bg-card">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-primary">{faq.question}</p>
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{faq.answer}</p>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => deleteFaq(faq.id)} className="text-destructive hover:text-destructive h-8 w-8 shrink-0">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {faqs.length === 0 && (
                    <p className="text-center text-muted-foreground py-6 text-sm">No FAQs added yet</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Database Tab */}
          <TabsContent value="database">
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-base flex items-center gap-2">
                  <Database className="w-4 h-4 text-primary" />
                  Knowledge Base
                </CardTitle>
                <CardDescription className="text-sm">Add content for your AI to reference</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3 p-4 rounded-lg bg-muted/30 border border-border/50">
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
                    <Button
                      variant={newKnowledge.type === "file" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setNewKnowledge({ ...newKnowledge, type: "file" })}
                      className="gap-2"
                      disabled
                    >
                      <Upload className="w-4 h-4" />
                      File
                    </Button>
                  </div>
                  <Input
                    placeholder="Title"
                    value={newKnowledge.title}
                    onChange={(e) => setNewKnowledge({ ...newKnowledge, title: e.target.value })}
                    className="bg-background"
                  />
                  {newKnowledge.type === "text" && (
                    <Textarea
                      placeholder="Enter your knowledge content..."
                      value={newKnowledge.content}
                      onChange={(e) => setNewKnowledge({ ...newKnowledge, content: e.target.value })}
                      rows={4}
                      className="bg-background"
                    />
                  )}
                  {newKnowledge.type === "website" && (
                    <Input
                      placeholder="https://example.com"
                      value={newKnowledge.url}
                      onChange={(e) => setNewKnowledge({ ...newKnowledge, url: e.target.value })}
                      className="bg-background"
                    />
                  )}
                  <Button
                    onClick={addKnowledge}
                    disabled={addingKnowledge || !newKnowledge.title.trim()}
                    size="sm"
                    className="gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Add Knowledge
                  </Button>
                </div>

                <div className="space-y-2">
                  {knowledge.map((item) => (
                    <div key={item.id} className="p-3 rounded-lg border border-border/50 bg-card">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center shrink-0">
                            {item.type === "text" && <FileText className="w-4 h-4 text-primary" />}
                            {item.type === "website" && <Globe className="w-4 h-4 text-primary" />}
                            {item.type === "file" && <Upload className="w-4 h-4 text-primary" />}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-sm">{item.title}</p>
                            <p className="text-xs text-muted-foreground capitalize">{item.type}</p>
                          </div>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => deleteKnowledge(item.id)} className="text-destructive hover:text-destructive h-8 w-8 shrink-0">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {knowledge.length === 0 && (
                    <p className="text-center text-muted-foreground py-6 text-sm">No knowledge added yet</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Styles Tab */}
          <TabsContent value="styles">
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-base flex items-center gap-2">
                  <Palette className="w-4 h-4 text-primary" />
                  Widget Appearance
                </CardTitle>
                <CardDescription className="text-sm">Customize how your chatbot looks</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-sm">Primary Color</Label>
                    <div className="flex gap-2">
                      <Input
                        type="color"
                        value={styles.primary_color}
                        onChange={(e) => setStyles({ ...styles, primary_color: e.target.value })}
                        className="w-12 h-10 p-1 cursor-pointer"
                      />
                      <Input
                        value={styles.primary_color}
                        onChange={(e) => setStyles({ ...styles, primary_color: e.target.value })}
                        className="flex-1"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm">Background Color</Label>
                    <div className="flex gap-2">
                      <Input
                        type="color"
                        value={styles.background_color}
                        onChange={(e) => setStyles({ ...styles, background_color: e.target.value })}
                        className="w-12 h-10 p-1 cursor-pointer"
                      />
                      <Input
                        value={styles.background_color}
                        onChange={(e) => setStyles({ ...styles, background_color: e.target.value })}
                        className="flex-1"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm">Text Color</Label>
                    <div className="flex gap-2">
                      <Input
                        type="color"
                        value={styles.text_color}
                        onChange={(e) => setStyles({ ...styles, text_color: e.target.value })}
                        className="w-12 h-10 p-1 cursor-pointer"
                      />
                      <Input
                        value={styles.text_color}
                        onChange={(e) => setStyles({ ...styles, text_color: e.target.value })}
                        className="flex-1"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm">Avatar URL</Label>
                    <Input
                      placeholder="https://example.com/avatar.png"
                      value={styles.avatar_url || ""}
                      onChange={(e) => setStyles({ ...styles, avatar_url: e.target.value || null })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm">Corner Style</Label>
                    <div className="flex gap-2">
                      <Button
                        variant={styles.border_radius === "rounded" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setStyles({ ...styles, border_radius: "rounded" })}
                      >
                        Rounded
                      </Button>
                      <Button
                        variant={styles.border_radius === "square" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setStyles({ ...styles, border_radius: "square" })}
                      >
                        Square
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm">Position</Label>
                    <div className="flex gap-2">
                      <Button
                        variant={styles.position === "bottom-right" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setStyles({ ...styles, position: "bottom-right" })}
                      >
                        Right
                      </Button>
                      <Button
                        variant={styles.position === "bottom-left" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setStyles({ ...styles, position: "bottom-left" })}
                      >
                        Left
                      </Button>
                    </div>
                  </div>
                </div>

                <Button onClick={saveStyles} disabled={savingStyles} className="gap-2 mt-4">
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
