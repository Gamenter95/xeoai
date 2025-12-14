import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Bot, ArrowRight, MessageSquare, Building2, Code, BarChart3 } from "lucide-react";
import { useEffect } from "react";

export default function Index() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      navigate("/dashboard");
    }
  }, [user, loading, navigate]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg gradient-primary flex items-center justify-center">
              <Bot className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-display font-bold">XeoAI</span>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate("/auth")}>
              Sign In
            </Button>
            <Button onClick={() => navigate("/auth")}>
              Get Started
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="py-20 lg:py-32">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold max-w-4xl mx-auto leading-tight">
            AI Chatbots for Your Business,{" "}
            <span className="text-gradient">In Minutes</span>
          </h1>
          <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
            Create custom AI chatbots trained on your business data. Embed them on any website with a single line of code.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" onClick={() => navigate("/auth")} className="gap-2">
              Start Free
              <ArrowRight className="w-4 h-4" />
            </Button>
            <Button size="lg" variant="outline">
              See Demo
            </Button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-display font-bold text-center mb-12">
            Everything You Need
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: Building2, title: "Multi-Business", desc: "Manage multiple businesses from one dashboard" },
              { icon: MessageSquare, title: "Smart AI", desc: "Chatbots trained on your specific business data" },
              { icon: Code, title: "Easy Embed", desc: "One line of code to add to any website" },
              { icon: BarChart3, title: "Analytics", desc: "Track conversations and usage in real-time" },
            ].map((feature) => (
              <div key={feature.title} className="p-6 bg-card rounded-xl border border-border">
                <feature.icon className="w-10 h-10 text-primary mb-4" />
                <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                <p className="text-muted-foreground text-sm">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-border">
        <div className="container mx-auto px-4 text-center text-muted-foreground text-sm">
          © 2024 XeoAI. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
