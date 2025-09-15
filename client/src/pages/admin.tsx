import Navigation from "@/components/navigation";
import AdminPanel from "@/components/admin-panel";
import Footer from "@/components/footer";

export default function Admin() {
  return (
    <div className="min-h-screen">
      <Navigation />
      <AdminPanel />
      <Footer />
    </div>
  );
}
