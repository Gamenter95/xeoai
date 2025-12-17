import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, Zap, Crown, Rocket, ArrowLeft, Sparkles, Shield, Clock, MessageSquare, Building2, Headphones } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";

const plans = [
  {
    id: "free",
    name: "Free",
    price: "₹0",
    period: "/month",
    description: "Perfect for getting started",
    icon: Zap,
    color: "from-emerald-500 to-teal-500",
    bgColor: "bg-emerald-500/10",
    borderColor: "border-emerald-500/20",
    features: [
      { text: "100 messages/month", highlight: true },
      { text: "1 Chatbot", highlight: false },
      { text: "Basic customization", highlight: false },
      { text: "Standard response time", highlight: false },
      { text: "Community support", highlight: false },
    ],
    popular: false,
  },
  {
    id: "pro",
    name: "Basic",
    price: "₹99",
    period: "/month",
    description: "Best for growing businesses",
    icon: Crown,
    color: "from-primary to-purple-500",
    bgColor: "bg-primary/10",
    borderColor: "border-primary/30",
    features: [
      { text: "1,000 messages/month", highlight: true },
      { text: "5 Chatbots", highlight: false },
      { text: "Advanced customization", highlight: false },
      { text: "Priority response time", highlight: false },
      { text: "Email support", highlight: false },
      { text: "Analytics dashboard", highlight: false },
      { text: "Custom branding", highlight: false },
    ],
    popular: true,
  },
  {
    id: "business",
    name: "Pro",
    price: "₹259",
    period: "/month",
    description: "For enterprises & agencies",
    icon: Rocket,
    color: "from-amber-500 to-orange-500",
    bgColor: "bg-amber-500/10",
    borderColor: "border-amber-500/20",
    features: [
      { text: "5,000 messages/month", highlight: true },
      { text: "Unlimited Chatbots", highlight: false },
      { text: "Full customization suite", highlight: false },
      { text: "Instant response time", highlight: false },
      { text: "24/7 Priority support", highlight: false },
      { text: "Advanced analytics", highlight: false },
      { text: "White-label solution", highlight: false },
      { text: "API access", highlight: false },
      { text: "Dedicated account manager", highlight: false },
    ],
    popular: false,
  },
];

export default function Plans() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  const { data: currentPlan } = useQuery({
    queryKey: ["userPlan", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from("user_plans")
        .select("plan")
        .eq("user_id", user.id)
        .single();
      return data?.plan || "free";
    },
    enabled: !!user?.id,
  });

  const handleSelectPlan = async (planId: string) => {
    if (!user) {
      navigate("/auth");
      return;
    }

    if (planId === "free") {
      toast({
        title: "You're on the Free plan",
        description: "You're already enjoying the free tier!",
      });
      return;
    }

    setSelectedPlan(planId);
    
    // For paid plans, show coming soon message
    toast({
      title: "Payment Integration Coming Soon",
      description: `The ${planId === "pro" ? "Basic" : "Pro"} plan will be available for purchase soon. Stay tuned!`,
    });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Background Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-radial from-primary/5 to-transparent rounded-full" />
      </div>

      <div className="relative z-10">
        {/* Header */}
        <header className="border-b border-border/50 backdrop-blur-xl bg-background/80 sticky top-0 z-50">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                onClick={() => navigate(user ? "/dashboard" : "/")}
                className="gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
              {!user && (
                <Button onClick={() => navigate("/auth")} className="gradient-primary text-primary-foreground">
                  Get Started
                </Button>
              )}
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <section className="py-20 px-4">
          <div className="container mx-auto text-center max-w-4xl">
            <Badge className="mb-6 px-4 py-2 text-sm font-medium bg-primary/10 text-primary border-primary/20">
              <Sparkles className="h-4 w-4 mr-2" />
              Simple, Transparent Pricing
            </Badge>
            
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Choose the Perfect Plan for
              <span className="text-gradient block mt-2">Your Business</span>
            </h1>
            
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Start free and scale as you grow. No hidden fees, no surprises.
              Cancel anytime.
            </p>
          </div>
        </section>

        {/* Pricing Cards */}
        <section className="pb-20 px-4">
          <div className="container mx-auto max-w-6xl">
            <div className="grid md:grid-cols-3 gap-8">
              {plans.map((plan) => {
                const Icon = plan.icon;
                const isCurrentPlan = currentPlan === plan.id;
                
                return (
                  <Card
                    key={plan.id}
                    className={`relative overflow-hidden transition-all duration-500 hover:-translate-y-2 ${
                      plan.popular
                        ? "border-primary shadow-glow-lg scale-105 md:scale-110 z-10"
                        : "border-border hover:border-primary/50 hover:shadow-glow"
                    }`}
                  >
                    {/* Popular Badge */}
                    {plan.popular && (
                      <div className="absolute top-0 left-0 right-0 h-1 gradient-primary" />
                    )}
                    {plan.popular && (
                      <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 gradient-primary text-primary-foreground border-0 px-4 py-1">
                        Most Popular
                      </Badge>
                    )}

                    <div className="p-8">
                      {/* Plan Header */}
                      <div className={`inline-flex p-3 rounded-xl ${plan.bgColor} mb-6`}>
                        <Icon className={`h-6 w-6 bg-gradient-to-r ${plan.color} bg-clip-text`} style={{ color: plan.popular ? 'hsl(var(--primary))' : undefined }} />
                      </div>

                      <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                      <p className="text-muted-foreground text-sm mb-6">{plan.description}</p>

                      {/* Price */}
                      <div className="mb-8">
                        <span className="text-5xl font-bold">{plan.price}</span>
                        <span className="text-muted-foreground">{plan.period}</span>
                      </div>

                      {/* Features */}
                      <ul className="space-y-4 mb-8">
                        {plan.features.map((feature, idx) => (
                          <li key={idx} className="flex items-start gap-3">
                            <div className={`p-1 rounded-full ${plan.bgColor} mt-0.5`}>
                              <Check className="h-3 w-3 text-primary" />
                            </div>
                            <span className={feature.highlight ? "font-semibold" : "text-muted-foreground"}>
                              {feature.text}
                            </span>
                          </li>
                        ))}
                      </ul>

                      {/* CTA Button */}
                      <Button
                        className={`w-full h-12 text-base font-semibold ${
                          plan.popular
                            ? "gradient-primary text-primary-foreground shadow-glow hover:shadow-glow-lg"
                            : isCurrentPlan
                            ? "bg-muted text-muted-foreground cursor-not-allowed"
                            : "bg-secondary hover:bg-secondary/80"
                        }`}
                        onClick={() => handleSelectPlan(plan.id)}
                        disabled={isCurrentPlan}
                      >
                        {isCurrentPlan ? "Current Plan" : plan.id === "free" ? "Get Started Free" : "Upgrade Now"}
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>

        {/* Features Comparison */}
        <section className="py-20 px-4 border-t border-border/50">
          <div className="container mx-auto max-w-4xl">
            <h2 className="text-3xl font-bold text-center mb-4">Why Choose Us?</h2>
            <p className="text-muted-foreground text-center mb-12 max-w-2xl mx-auto">
              Every plan includes powerful features to help you succeed
            </p>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                { icon: MessageSquare, title: "Smart AI Responses", desc: "Powered by advanced AI for natural conversations" },
                { icon: Building2, title: "Multi-Business Support", desc: "Manage multiple chatbots from one dashboard" },
                { icon: Shield, title: "Secure & Private", desc: "Enterprise-grade security for your data" },
                { icon: Clock, title: "24/7 Availability", desc: "Your chatbot never sleeps, always ready" },
                { icon: Sparkles, title: "Easy Customization", desc: "Match your brand with custom styles" },
                { icon: Headphones, title: "Dedicated Support", desc: "We're here to help you succeed" },
              ].map((feature, idx) => (
                <Card key={idx} className="p-6 bg-card/50 hover:bg-card transition-colors border-border/50">
                  <feature.icon className="h-10 w-10 text-primary mb-4" />
                  <h3 className="font-semibold mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.desc}</p>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-20 px-4 bg-muted/30">
          <div className="container mx-auto max-w-3xl">
            <h2 className="text-3xl font-bold text-center mb-12">Frequently Asked Questions</h2>
            
            <div className="space-y-6">
              {[
                {
                  q: "What happens when I reach my message limit?",
                  a: "Your chatbot will display a friendly message asking users to wait or upgrade. You can upgrade anytime to get more messages instantly."
                },
                {
                  q: "Can I change plans anytime?",
                  a: "Yes! You can upgrade or downgrade your plan at any time. Changes take effect immediately."
                },
                {
                  q: "Do unused messages roll over?",
                  a: "Messages reset at the start of each billing cycle. We recommend choosing a plan that fits your expected usage."
                },
                {
                  q: "Is there a free trial for paid plans?",
                  a: "Our Free plan lets you experience the platform with no time limit. You can upgrade whenever you're ready."
                },
              ].map((faq, idx) => (
                <Card key={idx} className="p-6 bg-card border-border/50">
                  <h3 className="font-semibold mb-2">{faq.q}</h3>
                  <p className="text-muted-foreground">{faq.a}</p>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Footer CTA */}
        <section className="py-20 px-4">
          <div className="container mx-auto max-w-3xl text-center">
            <h2 className="text-3xl font-bold mb-4">Ready to Get Started?</h2>
            <p className="text-muted-foreground mb-8">
              Join thousands of businesses using AI-powered chatbots to engage their customers.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                className="gradient-primary text-primary-foreground shadow-glow hover:shadow-glow-lg"
                onClick={() => navigate(user ? "/dashboard" : "/auth")}
              >
                {user ? "Go to Dashboard" : "Start Free Today"}
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              >
                View Plans
              </Button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
