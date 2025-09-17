import Navigation from "@/components/navigation";
import Footer from "@/components/footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { AlertTriangle, TrendingDown, Zap, Globe, Clock, DollarSign } from "lucide-react";

export default function RiskDisclosure() {
  const riskCategories = [
    {
      icon: <TrendingDown className="w-8 h-8 text-red-500" />,
      title: "Market and Valuation Risks",
      level: "High Risk",
      risks: [
        "Asset values may fluctuate significantly due to market conditions",
        "Appraisals and valuations may not reflect actual market prices",
        "Economic downturns can severely impact asset liquidity and value",
        "Specialized assets may have limited marketability",
        "Currency exchange rates may affect cross-border transactions"
      ]
    },
    {
      icon: <Zap className="w-8 h-8 text-orange-500" />,
      title: "Technology and Platform Risks",
      level: "Medium-High Risk",
      risks: [
        "Smart contract vulnerabilities may lead to loss of funds",
        "Blockchain network failures or congestion may delay transactions",
        "Platform downtime may prevent access to services",
        "Cyberattacks could compromise platform security",
        "Software bugs may cause unexpected behavior or losses"
      ]
    },
    {
      icon: <Globe className="w-8 h-8 text-amber-500" />,
      title: "Cross-Chain Bridge Risks",
      level: "High Risk",
      risks: [
        "Bridge transactions may fail or become stuck between networks",
        "Network consensus failures could result in permanent loss",
        "Bridge smart contracts may contain undiscovered vulnerabilities",
        "Validator failures could delay or prevent transaction completion",
        "Slippage and price impact during bridge transactions"
      ]
    },
    {
      icon: <DollarSign className="w-8 h-8 text-green-600" />,
      title: "Financial and Credit Risks",
      level: "Medium Risk",
      risks: [
        "Defaulting on loans results in permanent loss of pledged assets",
        "Interest rates and fees may change affecting loan costs",
        "Loan extensions may not be available when needed",
        "Asset liquidation may occur at below-market prices",
        "Platform fees are non-refundable regardless of outcome"
      ]
    },
    {
      icon: <Clock className="w-8 h-8 text-blue-500" />,
      title: "Regulatory and Legal Risks",
      level: "Medium Risk",
      risks: [
        "Changing regulations may affect platform availability or operations",
        "Legal disputes may arise regarding asset ownership or valuation",
        "Tax implications of transactions may be complex and unclear",
        "Jurisdictional differences may complicate legal recourse",
        "Compliance requirements may restrict certain activities"
      ]
    },
    {
      icon: <AlertTriangle className="w-8 h-8 text-purple-500" />,
      title: "Operational and Fraud Risks",
      level: "Medium Risk", 
      risks: [
        "Fraudulent asset submissions may be undetected initially",
        "Identity theft or account compromise may lead to unauthorized activity",
        "Document forgery may result in improper asset valuations",
        "Third-party service failures may disrupt platform operations",
        "Human error in asset verification may cause valuation discrepancies"
      ]
    }
  ];

  const importantDisclosures = [
    {
      title: "No Investment Advice",
      content: "ICP RWA Pawn does not provide investment, financial, or legal advice. All decisions regarding asset pawning, loan terms, and transactions are made solely by users based on their own judgment and risk tolerance."
    },
    {
      title: "No Guaranteed Returns",
      content: "There are no guaranteed returns or outcomes when using our platform. Asset values may decrease, and loans may result in the permanent loss of pledged collateral if not repaid according to terms."
    },
    {
      title: "Platform Limitations",
      content: "Our platform operates on blockchain technology with inherent limitations. We cannot guarantee continuous availability, prevent all technical issues, or reverse blockchain transactions once confirmed."
    },
    {
      title: "Regulatory Uncertainty",
      content: "The regulatory environment for blockchain-based financial services is evolving. Changes in laws or regulations may affect platform operations or user access to services."
    },
    {
      title: "Asset Custody",
      content: "While we implement security measures for digital documentation, users retain responsibility for physical asset storage and security. We are not responsible for theft, damage, or loss of physical assets."
    },
    {
      title: "Third-Party Dependencies",
      content: "Our platform relies on various third-party services, including blockchain networks, identity providers, and financial institutions. Failures or changes in these services may impact platform functionality."
    }
  ];

  const riskMitigation = [
    {
      category: "Due Diligence",
      measures: [
        "Conduct thorough research before submitting valuable assets",
        "Obtain independent appraisals when possible",
        "Understand loan terms and repayment requirements completely",
        "Review all documentation carefully before proceeding"
      ]
    },
    {
      category: "Risk Management",
      measures: [
        "Only pawn assets you can afford to lose permanently",
        "Diversify across multiple smaller transactions rather than single large ones",
        "Monitor loan status regularly and maintain repayment schedules", 
        "Set aside funds for loan repayment before borrowing"
      ]
    },
    {
      category: "Security Practices",
      measures: [
        "Use strong, unique passwords and enable two-factor authentication",
        "Keep private keys and wallet credentials secure",
        "Verify all transaction details before confirming",
        "Report suspicious activities immediately"
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navigation />
      
      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-gray-900 dark:text-white mb-6">
            Risk Disclosure
          </h1>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
            Understanding the risks associated with our platform is crucial for making informed decisions. 
            Please read this disclosure carefully before using our services.
          </p>
          <p className="text-sm text-muted-foreground mt-4">
            Last updated: January 1, 2025
          </p>
        </div>

        {/* Critical Warning */}
        <Card className="border-red-200 bg-red-50 dark:bg-red-950/20 mb-12">
          <CardContent className="pt-6">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="w-8 h-8 text-red-600 mt-1 flex-shrink-0" />
              <div>
                <h4 className="font-bold text-red-800 dark:text-red-200 text-lg mb-3">
                  ⚠️ IMPORTANT RISK WARNING
                </h4>
                <div className="text-sm text-red-700 dark:text-red-300 space-y-2">
                  <p>
                    <strong>HIGH RISK INVESTMENT:</strong> Using this platform involves significant financial risk, 
                    including the potential for complete loss of pledged assets.
                  </p>
                  <p>
                    <strong>PERMANENT LOSS:</strong> Defaulting on loans will result in permanent forfeiture of your assets. 
                    This process is irreversible.
                  </p>
                  <p>
                    <strong>NO GUARANTEES:</strong> Past performance does not guarantee future results. 
                    Asset values may decline significantly or become worthless.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Risk Categories */}
        <div className="space-y-8 mb-16">
          <h2 className="text-3xl font-bold text-center">Risk Categories</h2>
          {riskCategories.map((category, index) => (
            <Card key={index} data-testid={`risk-category-${index}`}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center justify-center w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-full">
                      {category.icon}
                    </div>
                    <div>
                      <CardTitle className="text-xl">{category.title}</CardTitle>
                    </div>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-sm font-semibold ${
                    category.level.includes('High') 
                      ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                      : category.level.includes('Medium-High')
                      ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
                      : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                  }`}>
                    {category.level}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {category.risks.map((risk, riskIndex) => (
                    <li key={riskIndex} className="flex items-start space-x-3">
                      <div className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0"></div>
                      <span className="text-sm text-muted-foreground">{risk}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Important Disclosures */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-center mb-8">Important Disclosures</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {importantDisclosures.map((disclosure, index) => (
              <Card key={index} data-testid={`disclosure-${index}`}>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center space-x-2">
                    <AlertTriangle className="w-5 h-5 text-amber-600" />
                    <span>{disclosure.title}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{disclosure.content}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Risk Mitigation */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-center mb-8">Risk Mitigation Strategies</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {riskMitigation.map((section, index) => (
              <Card key={index} data-testid={`mitigation-${index}`}>
                <CardHeader>
                  <CardTitle className="text-lg text-center">{section.category}</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {section.measures.map((measure, measureIndex) => (
                      <li key={measureIndex} className="flex items-start space-x-3">
                        <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                        <span className="text-sm text-muted-foreground">{measure}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Legal Disclaimers */}
        <Card className="max-w-4xl mx-auto">
          <CardHeader>
            <CardTitle className="text-2xl">Legal Disclaimers</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-6 text-sm text-muted-foreground">
                <div>
                  <h4 className="font-semibold text-foreground mb-2">Forward-Looking Statements</h4>
                  <p>
                    This platform and related communications may contain forward-looking statements regarding 
                    future performance, market conditions, or business prospects. These statements are based on 
                    current expectations and assumptions that may prove to be incorrect. Actual results may differ 
                    materially from those expressed or implied.
                  </p>
                </div>

                <Separator />

                <div>
                  <h4 className="font-semibold text-foreground mb-2">No Professional Advice</h4>
                  <p>
                    Nothing on this platform constitutes professional financial, investment, legal, or tax advice. 
                    Users should consult with qualified professionals before making financial decisions or entering 
                    into transactions on this platform.
                  </p>
                </div>

                <Separator />

                <div>
                  <h4 className="font-semibold text-foreground mb-2">Limitation of Liability</h4>
                  <p>
                    To the maximum extent permitted by law, ICP RWA Pawn disclaims all liability for any direct, 
                    indirect, incidental, special, consequential, or punitive damages arising from or related to 
                    the use of this platform, regardless of the theory of liability.
                  </p>
                </div>

                <Separator />

                <div>
                  <h4 className="font-semibold text-foreground mb-2">User Acknowledgment</h4>
                  <p>
                    By using this platform, you acknowledge that you have read, understood, and accepted all risks 
                    disclosed herein. You confirm that you are entering into transactions based solely on your own 
                    judgment and risk assessment, without reliance on any representations or guarantees from the platform.
                  </p>
                </div>

                <Separator />

                <div>
                  <h4 className="font-semibold text-foreground mb-2">Contact Information</h4>
                  <p>
                    Questions regarding this Risk Disclosure should be directed to: <br/>
                    Email: risk@icp-rwa-pawn.com <br/>
                    This disclosure is effective as of January 1, 2025.
                  </p>
                </div>
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      <Footer />
    </div>
  );
}