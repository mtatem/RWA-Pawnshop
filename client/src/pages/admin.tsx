import { useState, useEffect } from "react";
import { useLocation } from "wouter";
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
import { Card } from "@/components/ui/card";

export default function Admin() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [, setLocation] = useLocation();

  useEffect(() => {
    const checkAdminAuth = async () => {
      const adminToken = localStorage.getItem('adminToken');
      
      if (!adminToken) {
        setLocation('/admin-login');
        return;
      }

      try {
        const response = await fetch('/api/admin/verify', {
          headers: {
            'Authorization': `Bearer ${adminToken}`
          }
        });

        if (response.ok) {
          setIsAuthenticated(true);
        } else {
          localStorage.removeItem('adminToken');
          setLocation('/admin-login');
        }
      } catch (error) {
        localStorage.removeItem('adminToken');
        setLocation('/admin-login');
      } finally {
        setIsLoading(false);
      }
    };

    checkAdminAuth();
  }, [setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 admin-dark-bg">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <Card className="p-8 text-center">
            <div className="text-lg">Verifying admin access...</div>
          </Card>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect to login
  }
  return (
    <div className="min-h-screen bg-gray-50 admin-dark-bg">
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
          {/* Mobile-first responsive tabs */}
          <div className="overflow-x-auto mb-6 sm:mb-8">
            <TabsList className="grid w-full grid-cols-7 lg:grid-cols-7 min-w-max">
              <TabsTrigger value="dashboard" data-testid="tab-dashboard" className="text-xs px-2 sm:px-3 sm:text-sm whitespace-nowrap">
                Dashboard
              </TabsTrigger>
              <TabsTrigger value="fraud" data-testid="tab-fraud" className="text-xs px-2 sm:px-3 sm:text-sm whitespace-nowrap">
                Fraud
              </TabsTrigger>
              <TabsTrigger value="assets" data-testid="tab-assets" className="text-xs px-2 sm:px-3 sm:text-sm whitespace-nowrap">
                Assets
              </TabsTrigger>
              <TabsTrigger value="users" data-testid="tab-users" className="text-xs px-2 sm:px-3 sm:text-sm whitespace-nowrap">
                Users
              </TabsTrigger>
              <TabsTrigger value="bridge" data-testid="tab-bridge" className="text-xs px-2 sm:px-3 sm:text-sm whitespace-nowrap">
                Bridge
              </TabsTrigger>
              <TabsTrigger value="submissions" data-testid="tab-submissions" className="text-xs px-2 sm:px-3 sm:text-sm whitespace-nowrap">
                Submissions
              </TabsTrigger>
              <TabsTrigger value="documents" data-testid="tab-documents" className="text-xs px-2 sm:px-3 sm:text-sm whitespace-nowrap">
                Documents
              </TabsTrigger>
            </TabsList>
          </div>
          
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
