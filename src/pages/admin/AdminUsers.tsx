import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AdminUsers() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className="text-3xl font-display font-bold">User Management</h1>
        <Card>
          <CardHeader><CardTitle>All Users</CardTitle></CardHeader>
          <CardContent><p className="text-muted-foreground">Admin user management coming soon.</p></CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
