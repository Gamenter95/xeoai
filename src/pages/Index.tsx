import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { 
  Bot, ArrowRight, MessageSquare, Building2, Code, BarChart3, 
  Sparkles, Shield, Zap, Globe, CheckCircle2, Star, Play,
  Layers, Brain, Palette
} from "lucide-react";
import { useEffect } from "react";

export default function Index() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      navigate("/dashboard");
    }
  }, [user, loading, navigate]);

  const features = [
    { 
      icon: Building2, 
      title: "Multi-Business Support", 
      desc: "Manage unlimited businesses from a single dashboard with dedicated chatbots for each" 
    },
    { 
      icon: Brain, 
      title: "AI Memory & Learning", 
      desc: "Your chatbot remembers context and learns from your custom data and instructions" 
    },
    { 
      icon: Code, 
      title: "One-Click Embed", 
      desc: "Copy a single line of code and add intelligent chat to any website instantly" 
    },
    { 
      icon: BarChart3, 
      title: "Real-Time Analytics", 
      desc: "Track conversations, user engagement, and chatbot performance live" 
    },
    { 
      icon: Palette, 
      title: "Custom Styling", 
      desc: "Customize colors, themes, and branding to match your website perfectly" 
    },
    { 
      icon: Layers, 
      title: "Knowledge Base", 
      desc: "Train your AI with FAQs, services, hours, and custom instructions" 
    },
  ];

  const benefits = [
    "24/7 automated customer support",
    "Reduce support ticket volume by 60%",
    "Instant answers to common questions",
    "No coding required to get started",
    "Works with any website platform",
    "Secure and privacy-focused",
  ];

  return (
    <div className="min-h-screen bg-background overflow-hidden">
      {/* Decorative background elements */}
      <div className="fixed inset-0 bg-dot-pattern opacity-30 pointer-events-none" />
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] gradient-primary opacity-10 blur-[100px] pointer-events-none" />
      
      {/* Header */}
      <header className="relative z-50 border-b border-border/50 glass sticky top-0">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-glow">
              <Bot className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold">XeoAI</span>
          </div>
          <nav className="hidden md:flex items-center gap-8">
            <Link to="/privacy" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Privacy
            </Link>
            <Link to="/terms" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Terms
            </Link>
          </nav>
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={() => navigate("/auth")}>
              Sign In
            </Button>
            <Button onClick={() => navigate("/auth")} className="gap-2 gradient-primary border-0 shadow-glow">
              Get Started
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative py-20 lg:py-32">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-6">
              <Sparkles className="w-4 h-4" />
              Powered by Advanced AI
            </div>
            
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-6">
              Transform Your Business With{" "}
              <span className="text-gradient">Intelligent AI Chatbots</span>
            </h1>
            
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
              Create custom AI assistants trained on your business data. Deploy in minutes, 
              delight customers 24/7, and scale your support effortlessly.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <Button 
                size="lg" 
                onClick={() => navigate("/auth")} 
                className="gap-2 gradient-primary border-0 shadow-glow text-lg px-8 h-14"
              >
                Start Free Today
                <ArrowRight className="w-5 h-5" />
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                className="gap-2 text-lg px-8 h-14"
                onClick={() => navigate("/widget-preview")}
              >
                <Play className="w-5 h-5" />
                See Demo
              </Button>
            </div>

            {/* Trust indicators */}
            <div className="flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-primary" />
                Enterprise Security
              </div>
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-primary" />
                Sub-second Responses
              </div>
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-primary" />
                Works Everywhere
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="relative py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Everything You Need to{" "}
              <span className="text-gradient">Succeed</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Powerful features designed to help you create, deploy, and manage 
              AI chatbots that truly understand your business.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <div 
                key={feature.title} 
                className="group p-6 bg-card rounded-2xl border border-border hover:border-primary/50 hover-lift"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center mb-4 group-hover:shadow-glow transition-shadow">
                  <feature.icon className="w-6 h-6 text-primary-foreground" />
                </div>
                <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="relative py-20">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold mb-6">
                Why Businesses{" "}
                <span className="text-gradient">Choose XeoAI</span>
              </h2>
              <p className="text-lg text-muted-foreground mb-8">
                Join thousands of businesses using AI-powered chatbots to deliver 
                exceptional customer experiences and drive growth.
              </p>
              <div className="grid sm:grid-cols-2 gap-4">
                {benefits.map((benefit) => (
                  <div key={benefit} className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />
                    <span>{benefit}</span>
                  </div>
                ))}
              </div>
              <Button 
                size="lg" 
                onClick={() => navigate("/auth")} 
                className="mt-8 gap-2 gradient-primary border-0 shadow-glow"
              >
                Get Started Free
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
            
            {/* Visual element */}
            <div className="relative">
              <div className="aspect-square max-w-md mx-auto relative">
                <div className="absolute inset-0 gradient-primary rounded-3xl opacity-20 blur-3xl" />
                <div className="relative bg-card rounded-3xl border border-border p-8 shadow-xl">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center">
                      <Bot className="w-6 h-6 text-primary-foreground" />
                    </div>
                    <div>
                      <p className="font-semibold">AI Assistant</p>
                      <p className="text-sm text-muted-foreground">Online now</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="bg-muted rounded-2xl rounded-bl-none p-4 max-w-[80%]">
                      <p className="text-sm">Hi! 👋 How can I help you today?</p>
                    </div>
                    <div className="bg-primary text-primary-foreground rounded-2xl rounded-br-none p-4 max-w-[80%] ml-auto">
                      <p className="text-sm">What are your business hours?</p>
                    </div>
                    <div className="bg-muted rounded-2xl rounded-bl-none p-4 max-w-[80%]">
                      <p className="text-sm">We're open Monday to Friday, 9 AM to 6 PM. How else can I assist you?</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-20">
        <div className="container mx-auto px-4">
          <div className="relative overflow-hidden rounded-3xl gradient-dark p-12 md:p-16 text-center">
            <div className="absolute inset-0 bg-grid-pattern opacity-10" />
            <div className="relative">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/20 text-primary text-sm font-medium mb-6">
                <Star className="w-4 h-4" />
                Start Free - No Credit Card Required
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                Ready to Transform Your Customer Experience?
              </h2>
              <p className="text-lg text-white/70 max-w-2xl mx-auto mb-8">
                Join businesses worldwide using XeoAI to provide instant, intelligent 
                support to their customers around the clock.
              </p>
              <Button 
                size="lg" 
                onClick={() => navigate("/auth")} 
                className="gap-2 bg-white text-foreground hover:bg-white/90 text-lg px-8 h-14"
              >
                Create Your AI Chatbot
                <ArrowRight className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative py-12 border-t border-border">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg gradient-primary flex items-center justify-center">
                <Bot className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="font-bold">XeoAI</span>
            </div>
            <nav className="flex items-center gap-6 text-sm text-muted-foreground">
              <Link to="/privacy" className="hover:text-foreground transition-colors">
                Privacy Policy
              </Link>
              <Link to="/terms" className="hover:text-foreground transition-colors">
                Terms of Service
              </Link>
            </nav>
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} XeoAI. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
