import { useParams } from "react-router-dom";
import ChatWidget from "@/components/chat/ChatWidget";

export default function WidgetPreview() {
  const { businessId } = useParams<{ businessId: string }>();
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 p-8">
      <div className="max-w-2xl mx-auto text-center mb-8">
        <h1 className="text-2xl font-bold mb-2">Widget Preview</h1>
        <p className="text-muted-foreground">This is how your chat widget will appear on your website.</p>
      </div>
      {businessId && <ChatWidget businessId={businessId} />}
    </div>
  );
}
