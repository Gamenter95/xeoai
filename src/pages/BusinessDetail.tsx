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
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Plus, Trash2, Save, Loader2, Clock, HelpCircle, Brain, Briefcase } from "lucide-react";

interface Business {
  id: string;
  name: string;
  description: string | null;
}

interface BusinessHour {
  id?: string;
  day_of_week: number;
  open_time: string | null;
  close_time: string | null;
  is_closed: boolean;
}

interface Service {
  id: string;
  name: string;
  description: string | null;
  price: string | null;
}

interface FAQ {
  id: string;
  question: string;
  answer: string;
}

const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function BusinessDetail() {
  const { id } = useParams<{ id: string }>();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [business, setBusiness] = useState<Business | null>(null);
  const [hours, setHours] = useState<BusinessHour[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [customInstructions, setCustomInstructions] = useState("");
  const [loadingData, setLoadingData] = useState(true);
  const [savingHours, setSavingHours] = useState(false);
  const [savingInstructions, setSavingInstructions] = useState(false);

  const [newService, setNewService] = useState({ name: "", description: "", price: "" });
  const [newFaq, setNewFaq] = useState({ question: "", answer: "" });
  const [addingService, setAddingService] = useState(false);
  const [addingFaq, setAddingFaq] = useState(false);

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
      const [businessResult, hoursResult, servicesResult, faqsResult, instructionsResult] = await Promise.all([
        supabase.from("businesses").select("id, name, description").eq("id", id).single(),
        supabase.from("business_hours").select("*").eq("business_id", id).order("day_of_week"),
        supabase.from("business_services").select("*").eq("business_id", id).order("created_at"),
        supabase.from("business_faqs").select("*").eq("business_id", id).order("created_at"),
        supabase.from("business_custom_instructions").select("*").eq("business_id", id).single(),
      ]);

      if (businessResult.error || !businessResult.data) {
        navigate("/dashboard/businesses");
        return;
      }

      setBusiness(businessResult.data);

      const existingHours = hoursResult.data || [];
      const allHours: BusinessHour[] = [];
      for (let i = 0; i < 7; i++) {
        const existing = existingHours.find((h: any) => h.day_of_week === i);
        allHours.push(existing || { day_of_week: i, open_time: "09:00", close_time: "17:00", is_closed: false });
      }
      setHours(allHours);

      setServices(servicesResult.data || []);
      setFaqs(faqsResult.data || []);
      setCustomInstructions(instructionsResult.data?.instructions || "");
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoadingData(false);
    }
  };

  const saveHours = async () => {
    setSavingHours(true);
    try {
      await supabase.from("business_hours").delete().eq("business_id", id);

      const { error } = await supabase.from("business_hours").insert(
        hours.map((h) => ({
          business_id: id,
          day_of_week: h.day_of_week,
          open_time: h.is_closed ? null : h.open_time,
          close_time: h.is_closed ? null : h.close_time,
          is_closed: h.is_closed,
        }))
      );

      if (error) throw error;
      toast({ title: "Business hours saved" });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setSavingHours(false);
    }
  };

  const addService = async () => {
    if (!newService.name.trim()) return;
    setAddingService(true);

    try {
      const { data, error } = await supabase
        .from("business_services")
        .insert({
          business_id: id,
          name: newService.name,
          description: newService.description || null,
          price: newService.price || null,
        })
        .select()
        .single();

      if (error) throw error;
      setServices([...services, data]);
      setNewService({ name: "", description: "", price: "" });
      toast({ title: "Service added" });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setAddingService(false);
    }
  };

  const deleteService = async (serviceId: string) => {
    try {
      const { error } = await supabase.from("business_services").delete().eq("id", serviceId);
      if (error) throw error;
      setServices(services.filter((s) => s.id !== serviceId));
      toast({ title: "Service deleted" });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
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

  const saveInstructions = async () => {
    setSavingInstructions(true);
    try {
      const { error } = await supabase
        .from("business_custom_instructions")
        .upsert({
          business_id: id,
          instructions: customInstructions,
        }, { onConflict: "business_id" });

      if (error) throw error;
      toast({ title: "AI instructions saved" });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setSavingInstructions(false);
    }
  };

  if (loading || loadingData) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-96 rounded-2xl" />
        </div>
      </DashboardLayout>
    );
  }

  if (!business) return null;

  return (
    <DashboardLayout>
      <div className="space-y-8 animate-fade-in">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard/businesses")} className="rounded-xl">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{business.name}</h1>
            <p className="text-muted-foreground mt-1">
              Configure your AI chatbot's knowledge and behavior
            </p>
          </div>
        </div>

        <Tabs defaultValue="hours" className="space-y-6">
          <TabsList className="bg-muted/50 p-1 rounded-xl">
            <TabsTrigger value="hours" className="gap-2 rounded-lg data-[state=active]:shadow-md">
              <Clock className="w-4 h-4" />
              Hours
            </TabsTrigger>
            <TabsTrigger value="services" className="gap-2 rounded-lg data-[state=active]:shadow-md">
              <Briefcase className="w-4 h-4" />
              Services
            </TabsTrigger>
            <TabsTrigger value="faqs" className="gap-2 rounded-lg data-[state=active]:shadow-md">
              <HelpCircle className="w-4 h-4" />
              FAQs
            </TabsTrigger>
            <TabsTrigger value="instructions" className="gap-2 rounded-lg data-[state=active]:shadow-md">
              <Brain className="w-4 h-4" />
              AI Memory
            </TabsTrigger>
          </TabsList>

          <TabsContent value="hours">
            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-primary" />
                  Business Hours
                </CardTitle>
                <CardDescription>Set your operating hours - the AI will inform customers accordingly</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {hours.map((hour, index) => (
                  <div key={hour.day_of_week} className="flex items-center gap-4 p-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors">
                    <div className="w-28 font-medium">{dayNames[hour.day_of_week]}</div>
                    <div className="flex items-center gap-3">
                      <Switch
                        checked={!hour.is_closed}
                        onCheckedChange={(checked) => {
                          const newHours = [...hours];
                          newHours[index].is_closed = !checked;
                          setHours(newHours);
                        }}
                      />
                      <span className={`text-sm ${hour.is_closed ? 'text-destructive' : 'text-green-600'}`}>
                        {hour.is_closed ? "Closed" : "Open"}
                      </span>
                    </div>
                    {!hour.is_closed && (
                      <div className="flex items-center gap-2 ml-auto">
                        <Input
                          type="time"
                          value={hour.open_time || "09:00"}
                          onChange={(e) => {
                            const newHours = [...hours];
                            newHours[index].open_time = e.target.value;
                            setHours(newHours);
                          }}
                          className="w-32"
                        />
                        <span className="text-muted-foreground">to</span>
                        <Input
                          type="time"
                          value={hour.close_time || "17:00"}
                          onChange={(e) => {
                            const newHours = [...hours];
                            newHours[index].close_time = e.target.value;
                            setHours(newHours);
                          }}
                          className="w-32"
                        />
                      </div>
                    )}
                  </div>
                ))}
                <Button onClick={saveHours} disabled={savingHours} className="mt-4 gradient-primary border-0">
                  {savingHours ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Save Hours
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="services">
            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-primary" />
                  Services & Products
                </CardTitle>
                <CardDescription>Add your services - the AI will use this to answer customer questions</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-4 p-4 rounded-xl bg-muted/30">
                  <Input
                    placeholder="Service name"
                    value={newService.name}
                    onChange={(e) => setNewService({ ...newService, name: e.target.value })}
                  />
                  <Input
                    placeholder="Description (optional)"
                    value={newService.description}
                    onChange={(e) => setNewService({ ...newService, description: e.target.value })}
                  />
                  <Input
                    placeholder="Price (optional)"
                    value={newService.price}
                    onChange={(e) => setNewService({ ...newService, price: e.target.value })}
                  />
                  <Button onClick={addService} disabled={addingService || !newService.name.trim()} className="gradient-primary border-0">
                    <Plus className="w-4 h-4 mr-2" />
                    Add
                  </Button>
                </div>

                <div className="space-y-3">
                  {services.map((service) => (
                    <div key={service.id} className="flex items-center justify-between p-4 rounded-xl bg-card border hover:border-primary/30 transition-colors">
                      <div>
                        <p className="font-medium">{service.name}</p>
                        {service.description && (
                          <p className="text-sm text-muted-foreground mt-1">{service.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        {service.price && (
                          <span className="text-sm font-semibold text-primary bg-primary/10 px-3 py-1 rounded-full">{service.price}</span>
                        )}
                        <Button variant="ghost" size="icon" onClick={() => deleteService(service.id)} className="text-destructive hover:text-destructive rounded-lg">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {services.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">No services added yet</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="faqs">
            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <HelpCircle className="w-5 h-5 text-primary" />
                  Frequently Asked Questions
                </CardTitle>
                <CardDescription>Train your AI with common questions and answers</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4 p-4 rounded-xl bg-muted/30">
                  <Input
                    placeholder="Question (e.g., What are your prices?)"
                    value={newFaq.question}
                    onChange={(e) => setNewFaq({ ...newFaq, question: e.target.value })}
                  />
                  <Textarea
                    placeholder="Answer (be detailed for better AI responses)"
                    value={newFaq.answer}
                    onChange={(e) => setNewFaq({ ...newFaq, answer: e.target.value })}
                    rows={3}
                  />
                  <Button
                    onClick={addFaq}
                    disabled={addingFaq || !newFaq.question.trim() || !newFaq.answer.trim()}
                    className="gap-2 gradient-primary border-0"
                  >
                    <Plus className="w-4 h-4" />
                    Add FAQ
                  </Button>
                </div>

                <div className="space-y-3">
                  {faqs.map((faq) => (
                    <div key={faq.id} className="p-4 rounded-xl bg-card border hover:border-primary/30 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-medium text-primary">Q: {faq.question}</p>
                          <p className="text-muted-foreground mt-2">A: {faq.answer}</p>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => deleteFaq(faq.id)} className="text-destructive hover:text-destructive rounded-lg ml-4">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {faqs.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">No FAQs added yet</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="instructions">
            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="w-5 h-5 text-primary" />
                  AI Memory & Instructions
                </CardTitle>
                <CardDescription>
                  Provide custom instructions for your AI - this is the AI's "memory" that guides its behavior
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  placeholder="Examples:
• Always greet customers warmly with their name if known
• Focus on promoting our premium services
• Avoid discussing competitor pricing
• If asked about refunds, explain our 30-day policy
• Use a friendly, professional tone
• Remember that our biggest sale is in December
• Our CEO's name is John Smith"
                  value={customInstructions}
                  onChange={(e) => setCustomInstructions(e.target.value)}
                  rows={10}
                  className="resize-none font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  💡 Tip: Be specific! The more details you provide, the smarter your AI becomes.
                </p>
                <Button onClick={saveInstructions} disabled={savingInstructions} className="gradient-primary border-0">
                  {savingInstructions ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  Save AI Instructions
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
