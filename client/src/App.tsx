import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Home from "@/pages/home";
import HowItWorks from "@/pages/how-it-works";
import Security from "@/pages/security";
import Fees from "@/pages/fees";
import ApiDocs from "@/pages/api-docs";
import TermsOfService from "@/pages/terms-of-service";
import PrivacyPolicy from "@/pages/privacy-policy";
import RiskDisclosure from "@/pages/risk-disclosure";
import Compliance from "@/pages/compliance";
import HelpCenter from "@/pages/help-center";
import ContactUs from "@/pages/contact-us";
import Whitepaper from "@/pages/whitepaper";
import Dashboard from "@/pages/dashboard";
import Marketplace from "@/pages/marketplace";
import Bridge from "@/pages/bridge";
import Token from "@/pages/token";
import Admin from "@/pages/admin";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/how-it-works" component={HowItWorks} />
      <Route path="/security" component={Security} />
      <Route path="/fees" component={Fees} />
      <Route path="/api-docs" component={ApiDocs} />
      <Route path="/terms-of-service" component={TermsOfService} />
      <Route path="/privacy-policy" component={PrivacyPolicy} />
      <Route path="/risk-disclosure" component={RiskDisclosure} />
      <Route path="/compliance" component={Compliance} />
      <Route path="/help-center" component={HelpCenter} />
      <Route path="/contact-us" component={ContactUs} />
      <Route path="/whitepaper" component={Whitepaper} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/marketplace" component={Marketplace} />
      <Route path="/bridge" component={Bridge} />
      <Route path="/token" component={Token} />
      <Route path="/admin" component={Admin} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className="min-h-screen gradient-bg">
          <Toaster />
          <Router />
        </div>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
