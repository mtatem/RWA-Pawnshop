import Navigation from "@/components/navigation";
import Footer from "@/components/footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import SEO from "@/components/seo";

export default function TermsOfService() {
  const sections = [
    {
      title: "1. Acceptance of Terms",
      content: `By accessing and using the ICP RWA Pawn platform ("Platform"), you accept and agree to be bound by the terms and provision of this agreement. These Terms of Service ("Terms") constitute a legally binding agreement between you ("User") and ICP RWA Pawn ("Company," "we," "us," or "our").

If you do not agree to abide by the above, please do not use this service. We reserve the right to change these Terms at any time without prior notice. Your continued use of the Platform following any such changes constitutes your acceptance of the new Terms.`
    },
    {
      title: "2. Platform Description",
      content: `ICP RWA Pawn is a decentralized platform built on the Internet Computer Protocol that allows users to pawn real-world assets (RWAs) in exchange for cryptocurrency loans. The Platform provides:

• Asset submission and verification services
• Document analysis and fraud detection
• Loan origination and management
• Cross-chain bridge functionality
• Marketplace for expired assets
• Administrative oversight and compliance

The Platform operates as an intermediary between asset owners seeking liquidity and the lending infrastructure built on blockchain technology.`
    },
    {
      title: "3. Eligibility and Registration",
      content: `3.1 Age and Capacity: You must be at least 18 years old and have the legal capacity to enter into contracts to use this Platform.

3.2 Jurisdictional Restrictions: The Platform may not be available in all jurisdictions. You are responsible for ensuring that your use of the Platform complies with applicable local laws and regulations.

3.3 Account Registration: To use certain features of the Platform, you must create an account by connecting a compatible wallet (Internet Identity or Plug Wallet) and providing accurate, complete information.

3.4 Account Security: You are responsible for maintaining the security of your account credentials and for all activities that occur under your account.`
    },
    {
      title: "4. Asset Submission and Verification",
      content: `4.1 Asset Ownership: You represent and warrant that you are the legal owner of any assets you submit for pawning and have the right to use them as collateral.

4.2 Documentation Requirements: You must provide accurate documentation, including but not limited to certificates of authenticity, appraisals, and ownership records.

4.3 Verification Process: All submitted assets undergo review by our verification team and automated fraud detection systems. We reserve the right to reject any submission.

4.4 Platform Fee: A non-refundable platform fee of 5 ICP is required for each asset submission to cover processing costs.`
    },
    {
      title: "5. Loan Terms and Conditions",
      content: `5.1 Loan Amount: Approved loans are up to 70% of verified asset value, determined by our valuation algorithms and expert review.

5.2 Interest Rate: All loans carry an annual percentage rate of 8.5%, calculated daily on the outstanding balance.

5.3 Loan Duration: Standard loan terms are 90 days, with optional extensions available for additional fees.

5.4 Repayment: Loans must be repaid in full, including principal and accrued interest, to reclaim the pledged asset.

5.5 Default: Failure to repay within the agreed term results in forfeiture of the asset, which will be listed on our marketplace.`
    },
    {
      title: "6. Marketplace and Asset Sales",
      content: `6.1 Marketplace Listing: Assets from defaulted loans are listed on our public marketplace for competitive bidding.

6.2 Sale Process: Assets are sold through transparent auction mechanisms with fair market value pricing.

6.3 Revenue Distribution: Proceeds from asset sales are applied to outstanding loan balances, with any surplus returned to the original owner.

6.4 Buyer Responsibilities: Marketplace buyers are responsible for verifying asset condition and authenticity before purchase.`
    },
    {
      title: "7. Cross-Chain Bridge Services",
      content: `7.1 Bridge Functionality: Our cross-chain bridge enables conversion between Ethereum-based assets (ETH, USDC) and ICP-native tokens (ckETH, ckUSDC).

7.2 Bridge Fees: A 0.5% fee applies to all bridge transactions to cover network costs and processing.

7.3 Transaction Risks: Cross-chain transactions may be subject to network delays, failures, or other technical issues beyond our control.

7.4 No Reversal: Bridge transactions are irreversible once confirmed on both networks.`
    },
    {
      title: "8. User Responsibilities and Prohibited Activities",
      content: `8.1 Lawful Use: You agree to use the Platform only for lawful purposes and in accordance with these Terms.

8.2 Prohibited Activities: You may not:
• Submit fraudulent or stolen assets
• Provide false or misleading information
• Attempt to manipulate asset valuations
• Engage in money laundering or terrorist financing
• Violate any applicable laws or regulations
• Interfere with Platform operations or security

8.3 Compliance: You are responsible for compliance with all applicable laws in your jurisdiction.`
    },
    {
      title: "9. Platform Availability and Modifications",
      content: `9.1 Service Availability: We strive to maintain Platform availability but cannot guarantee uninterrupted service.

9.2 Maintenance: The Platform may be temporarily unavailable for maintenance, updates, or technical issues.

9.3 Modifications: We reserve the right to modify, suspend, or discontinue any aspect of the Platform at any time.

9.4 Force Majeure: We are not liable for service interruptions due to circumstances beyond our reasonable control.`
    },
    {
      title: "10. Limitation of Liability",
      content: `10.1 Disclaimer: The Platform is provided "as is" without warranties of any kind, express or implied.

10.2 Limitation: To the maximum extent permitted by law, our total liability shall not exceed the fees paid by you in the 12 months preceding the claim.

10.3 Exclusions: We are not liable for indirect, incidental, special, consequential, or punitive damages.

10.4 Asset Risks: You acknowledge that asset values may fluctuate and that we are not responsible for market losses.`
    },
    {
      title: "11. Dispute Resolution",
      content: `11.1 Governing Law: These Terms are governed by the laws of [Jurisdiction], without regard to conflict of law principles.

11.2 Arbitration: Any disputes arising from these Terms or Platform use shall be resolved through binding arbitration.

11.3 Class Action Waiver: You agree to resolve disputes individually and waive any right to participate in class actions.

11.4 Injunctive Relief: We may seek injunctive relief to protect our intellectual property and Platform security.`
    },
    {
      title: "12. Privacy and Data Protection",
      content: `12.1 Data Collection: Our collection and use of personal information is governed by our Privacy Policy.

12.2 Blockchain Records: Transaction records on the blockchain are permanent and publicly viewable.

12.3 Regulatory Compliance: We may share information with regulatory authorities as required by law.

12.4 Data Security: We implement appropriate security measures to protect your information.`
    },
    {
      title: "13. Intellectual Property",
      content: `13.1 Platform Rights: We own all intellectual property rights in the Platform, including software, designs, and content.

13.2 License: We grant you a limited, non-exclusive license to use the Platform for its intended purposes.

13.3 User Content: You retain ownership of content you submit but grant us necessary licenses for Platform operations.

13.4 Infringement: We respect intellectual property rights and will respond to valid infringement claims.`
    },
    {
      title: "14. Termination",
      content: `14.1 Termination Rights: Either party may terminate this agreement at any time with appropriate notice.

14.2 Effect of Termination: Upon termination, your right to use the Platform ceases immediately.

14.3 Survival: Provisions regarding liability, dispute resolution, and intellectual property survive termination.

14.4 Outstanding Obligations: Termination does not affect outstanding loan obligations or asset custody arrangements.`
    },
    {
      title: "15. Contact Information",
      content: `For questions about these Terms of Service, please contact us at:

Email: info@rwapawn.io
RWA Pawnshop 4406 SE Graham Dr., Stuart, Florida 34997

These Terms are effective as of January 1, 2025, and were last updated on September 29, 2025.`
    }
  ];

  return (
    <div className="min-h-screen bg-black">
      <SEO 
        title="Terms of Service - ICP Real World Assets Pawnshop | RWAPAWN"
        description="Read the terms of service for pawning real world assets on the ICP blockchain. Legal terms for cryptocurrency loans, blockchain pawnshop usage, and RWA transactions."
        keywords="Real World Assets, ICP Blockchain, ICP Assets, Blockchain Pawnshop, Terms of Service"
        ogTitle="Terms of Service - RWAPAWN ICP Blockchain"
        ogDescription="Legal terms for using the ICP real world assets pawnshop and cryptocurrency loan platform."
      />
      <Navigation />
      
      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-6" style={{ color: '#ffffff' }}>
            Terms of Service
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Please read these terms carefully before using our platform. 
            By using ICP RWA Pawn, you agree to be bound by these terms.
          </p>
          <p className="text-sm text-muted-foreground mt-4">
            Last updated: September 29, 2025
          </p>
        </div>

        {/* Terms Content */}
        <Card className="max-w-4xl mx-auto">
          <CardHeader>
            <CardTitle className="text-2xl">Agreement Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[600px] pr-4">
              <div className="space-y-8">
                {sections.map((section, index) => (
                  <div key={index} data-testid={`terms-section-${index}`}>
                    <h3 className="text-xl font-semibold mb-4">{section.title}</h3>
                    <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                      {section.content}
                    </div>
                    {index < sections.length - 1 && <Separator className="mt-6" />}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Important Notice */}
        <div className="max-w-4xl mx-auto mt-8">
          <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
            <CardContent className="pt-6">
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 text-amber-600 mt-1">⚠️</div>
                <div>
                  <h4 className="font-semibold text-amber-800 dark:text-amber-200 mb-2">
                    Important Legal Notice
                  </h4>
                  <p className="text-sm text-amber-700 dark:text-amber-300">
                    These Terms of Service constitute a legal agreement. If you do not agree to these terms, 
                    please do not use our platform. We recommend consulting with legal counsel if you have 
                    questions about these terms or their application to your specific situation.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Footer />
    </div>
  );
}