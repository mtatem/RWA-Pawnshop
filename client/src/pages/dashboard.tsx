import Navigation from "@/components/navigation";
import RwaSubmissionForm from "@/components/rwa-submission-form";
import ActivePawns from "@/components/active-pawns";
import Footer from "@/components/footer";

export default function Dashboard() {
  return (
    <div className="min-h-screen">
      <Navigation />
      
      <section className="py-8 sm:py-12 lg:py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-8 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2 sm:mb-4">Pawn Your RWA</h2>
            <p className="text-sm sm:text-base text-muted-foreground px-4 sm:px-0">Submit your Real World Asset for instant liquidity</p>
          </div>
          
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 lg:gap-8">
            <RwaSubmissionForm />
            <ActivePawns />
          </div>
        </div>
      </section>
      
      <Footer />
    </div>
  );
}
