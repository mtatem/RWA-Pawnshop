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
import KycManagement from "@/components/KycManagement";
import Footer from "@/components/footer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";

export default function Admin() {
  const [, setLocation] = useLocation();
  const { user, permissions, isLoading, isAuthenticated } = useAuth();

  useEffect(() => {
    // Use role-based permissions for access control
    if (!isLoading) {
      if (!isAuthenticated) {
        // User not authenticated, redirect to login
        setLocation('/login');
        return;
      }
      
      if (!permissions.canAccessAdmin) {
        // User doesn't have admin permissions, redirect to admin login
        setLocation('/admin-login');
        return;
      }
    }
  }, [isLoading, isAuthenticated, permissions.canAccessAdmin, setLocation]);

  // Show loading state while authentication is being verified
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

  // If not authenticated or no admin permissions, useEffect will handle redirects
  if (!isAuthenticated || !permissions.canAccessAdmin) {
    return null; // Will redirect via useEffect
  }
  return (
    <div className="min-h-screen bg-gray-50 admin-dark-bg">
      <Navigation />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight dark:text-white text-[#ffffff]">
            Admin Dashboard
          </h1>
          <p className="text-muted-foreground">
            Comprehensive platform oversight and management
          </p>
        </div>

        <Tabs defaultValue="dashboard" className="w-full">
          {/* Mobile-first responsive tabs */}
          <div className="overflow-x-auto mb-6 sm:mb-8">
            <TabsList className="grid w-full grid-cols-8 lg:grid-cols-8 min-w-max">
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
              <TabsTrigger value="kyc" data-testid="tab-kyc" className="text-xs px-2 sm:px-3 sm:text-sm whitespace-nowrap">
                KYC
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
          
          <TabsContent value="kyc" className="space-y-4">
            <KycManagement />
          </TabsContent>
        </Tabs>
      </div>
      <Footer />
    </div>
  );
}
