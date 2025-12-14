import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Settings() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className="text-3xl font-display font-bold">Settings</h1>
        <Card>
          <CardHeader><CardTitle>Account Settings</CardTitle></CardHeader>
          <CardContent><p className="text-muted-foreground">Account settings will be available here.</p></CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
