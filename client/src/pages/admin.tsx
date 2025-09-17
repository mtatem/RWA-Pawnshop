import Navigation from "@/components/navigation";
import AdminPanel from "@/components/admin-panel";
import AdminDocumentQueue from "@/components/admin-document-queue";
import Footer from "@/components/footer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Admin() {
  return (
    <div className="min-h-screen">
      <Navigation />
      <div className="container mx-auto px-4 py-8">
        <Tabs defaultValue="submissions" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="submissions" data-testid="tab-submissions">
              RWA Submissions
            </TabsTrigger>
            <TabsTrigger value="documents" data-testid="tab-documents">
              Document Analysis
            </TabsTrigger>
          </TabsList>
          
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
