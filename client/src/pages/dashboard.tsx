import Navigation from "@/components/navigation";
import RwaSubmissionForm from "@/components/rwa-submission-form";
import ActivePawns from "@/components/active-pawns";
import Footer from "@/components/footer";

export default function Dashboard() {
  return (
    <div className="min-h-screen">
      <Navigation />
      
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Pawn Your RWA</h2>
            <p className="text-muted-foreground">Submit your Real World Asset for instant liquidity</p>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <RwaSubmissionForm />
            <ActivePawns />
          </div>
        </div>
      </section>
      
      <Footer />
    </div>
  );
}
