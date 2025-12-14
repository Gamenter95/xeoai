import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AdminPlans() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className="text-3xl font-display font-bold">Plan Management</h1>
        <Card>
          <CardHeader><CardTitle>Plans</CardTitle></CardHeader>
          <CardContent><p className="text-muted-foreground">Plan management coming soon.</p></CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
