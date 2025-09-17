import Navigation from "@/components/navigation";
import AdminPanel from "@/components/admin-panel";
import AdminDocumentQueue from "@/components/admin-document-queue";
import AdminDashboard from "@/components/AdminDashboard";
import FraudAlerts from "@/components/FraudAlerts";
import AssetReview from "@/components/AssetReview";
import UserManagement from "@/components/UserManagement";
import BridgeMonitoring from "@/components/BridgeMonitoring";
import Footer from "@/components/footer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Admin() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navigation />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
            Admin Dashboard
          </h1>
          <p className="text-muted-foreground">
            Comprehensive platform oversight and management
          </p>
        </div>

        <Tabs defaultValue="dashboard" className="w-full">
          <TabsList className="grid w-full grid-cols-7 mb-8">
            <TabsTrigger value="dashboard" data-testid="tab-dashboard" className="text-xs sm:text-sm">
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="fraud" data-testid="tab-fraud" className="text-xs sm:text-sm">
              Fraud Alerts
            </TabsTrigger>
            <TabsTrigger value="assets" data-testid="tab-assets" className="text-xs sm:text-sm">
              Asset Review
            </TabsTrigger>
            <TabsTrigger value="users" data-testid="tab-users" className="text-xs sm:text-sm">
              User Management
            </TabsTrigger>
            <TabsTrigger value="bridge" data-testid="tab-bridge" className="text-xs sm:text-sm">
              Bridge Monitor
            </TabsTrigger>
            <TabsTrigger value="submissions" data-testid="tab-submissions" className="text-xs sm:text-sm">
              Submissions
            </TabsTrigger>
            <TabsTrigger value="documents" data-testid="tab-documents" className="text-xs sm:text-sm">
              Documents
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="dashboard" className="space-y-4">
            <AdminDashboard />
          </TabsContent>
          
          <TabsContent value="fraud" className="space-y-4">
            <FraudAlerts />
          </TabsContent>
          
          <TabsContent value="assets" className="space-y-4">
            <AssetReview />
          </TabsContent>
          
          <TabsContent value="users" className="space-y-4">
            <UserManagement />
          </TabsContent>
          
          <TabsContent value="bridge" className="space-y-4">
            <BridgeMonitoring />
          </TabsContent>
          
          <TabsContent value="submissions" className="space-y-4">
            <AdminPanel />
          </TabsContent>
          
          <TabsContent value="documents" className="space-y-4">
            <AdminDocumentQueue />
          </TabsContent>
        </Tabs>
      </div>
      <Footer />
    </div>
  );
}
