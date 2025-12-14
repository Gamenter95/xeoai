import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AdminAnalytics() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className="text-3xl font-display font-bold">Platform Analytics</h1>
        <Card>
          <CardHeader><CardTitle>Overview</CardTitle></CardHeader>
          <CardContent><p className="text-muted-foreground">Platform-wide analytics coming soon.</p></CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
