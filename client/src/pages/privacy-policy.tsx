import Navigation from "@/components/navigation";
import Footer from "@/components/footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Shield, Eye, Lock, Database } from "lucide-react";

export default function PrivacyPolicy() {
  const sections = [
    {
      title: "1. Information We Collect",
      content: `1.1 Personal Information
We collect information you provide directly, including:
• Wallet addresses and blockchain identities
• Identity verification documents
• Contact information (email, phone)
• Financial information for loan processing

1.2 Asset Information
When you submit assets for pawning:
• Asset descriptions and photographs
• Certificates of authenticity and appraisals
• Ownership documentation
• Valuation data and pricing information

1.3 Technical Information
We automatically collect:
• IP addresses and device information
• Browser type and operating system
• Usage patterns and Platform interactions
• Transaction data and blockchain records
• Cookies and similar tracking technologies

1.4 Third-Party Information
We may receive information from:
• Blockchain networks and wallet providers
• Identity verification services
• Credit agencies and financial institutions
• Regulatory and compliance databases`
    },
    {
      title: "2. How We Use Your Information",
      content: `2.1 Platform Operations
We use your information to:
• Process asset submissions and loan applications
• Verify identity and prevent fraud
• Manage user accounts and transactions
• Provide customer support and communications
• Improve Platform functionality and user experience

2.2 Legal and Compliance
Your information helps us:
• Comply with anti-money laundering (AML) requirements
• Meet Know Your Customer (KYC) obligations
• Report to regulatory authorities as required
• Detect and prevent fraudulent activities
• Maintain accurate financial records

2.3 Communication
We may use your information to:
• Send transaction confirmations and updates
• Provide Platform announcements and security alerts
• Deliver marketing communications (with consent)
• Respond to inquiries and support requests

2.4 Analytics and Improvement
We analyze data to:
• Understand Platform usage patterns
• Enhance security measures
• Develop new features and services
• Conduct research and analytics`
    },
    {
      title: "3. Information Sharing and Disclosure",
      content: `3.1 Service Providers
We share information with trusted third parties who assist with:
• Identity verification and fraud detection
• Document processing and analysis
• Cloud hosting and data storage
• Payment processing and financial services
• Customer support and communications

3.2 Legal Requirements
We may disclose information when required to:
• Comply with legal obligations and court orders
• Respond to government and regulatory requests
• Cooperate with law enforcement investigations
• Protect our rights and enforce our agreements
• Prevent illegal activities and ensure Platform security

3.3 Business Transfers
In the event of a merger, acquisition, or sale:
• User information may be transferred to the acquiring entity
• You will be notified of any such transfer
• Your information will remain subject to privacy protections

3.4 Consent
We may share information with your explicit consent for:
• Third-party integrations you authorize
• Marketing partnerships you opt into
• Research studies you agree to participate in`
    },
    {
      title: "4. Data Security and Protection",
      content: `4.1 Security Measures
We implement comprehensive security controls:
• End-to-end encryption for sensitive data
• Multi-factor authentication requirements
• Regular security audits and penetration testing
• Access controls and employee training
• Incident response and monitoring systems

4.2 Blockchain Considerations
Please note that blockchain transactions:
• Are permanent and publicly viewable
• Cannot be deleted or modified
• May contain pseudonymous identifiers
• Are subject to network security measures

4.3 Data Retention
We retain information as needed to:
• Fulfill the purposes outlined in this policy
• Comply with legal and regulatory requirements
• Resolve disputes and enforce agreements
• Maintain business records and analytics

4.4 International Transfers
Your information may be transferred to and processed in:
• Countries where our service providers operate
• Jurisdictions with adequate data protection laws
• Locations necessary for Platform operations`
    },
    {
      title: "5. Your Privacy Rights and Choices",
      content: `5.1 Access and Correction
You have the right to:
• Access personal information we hold about you
• Correct inaccurate or incomplete information
• Request copies of your data in portable formats
• Understand how your information is processed

5.2 Data Deletion
You may request deletion of personal information, subject to:
• Legal and regulatory retention requirements
• Ongoing business relationships and obligations
• Technical limitations of blockchain records
• Legitimate business interests

5.3 Communication Preferences
You can control communications by:
• Updating your account notification settings
• Unsubscribing from marketing emails
• Adjusting cookie preferences in your browser
• Contacting us directly with preferences

5.4 Regulatory Rights
Depending on your location, you may have additional rights under:
• General Data Protection Regulation (GDPR)
• California Consumer Privacy Act (CCPA)
• Other applicable privacy laws and regulations`
    },
    {
      title: "6. Cookies and Tracking Technologies",
      content: `6.1 Types of Cookies
We use various cookies and similar technologies:
• Essential cookies for Platform functionality
• Analytics cookies to understand usage patterns
• Preference cookies to remember your settings
• Marketing cookies for personalized experiences

6.2 Third-Party Cookies
Our Platform may include cookies from:
• Analytics providers (Google Analytics, etc.)
• Social media platforms and widgets
• Advertising networks and partners
• Customer support and chat services

6.3 Cookie Management
You can manage cookies by:
• Adjusting browser settings and preferences
• Using cookie management tools and extensions
• Opting out of specific tracking services
• Contacting us for assistance with preferences

6.4 Do Not Track
We currently do not respond to "Do Not Track" signals, but we provide other privacy controls and choices throughout our Platform.`
    },
    {
      title: "7. Children's Privacy",
      content: `7.1 Age Requirements
Our Platform is not intended for users under 18 years of age. We do not knowingly collect personal information from children.

7.2 Parental Notification
If we become aware that we have collected information from a child under 18:
• We will take steps to delete the information promptly
• We will notify parents or guardians as required by law
• We will implement additional protections as necessary

7.3 Educational Use
Any educational or research use of our Platform must comply with applicable children's privacy laws and institutional requirements.`
    },
    {
      title: "8. Changes to This Privacy Policy",
      content: `8.1 Policy Updates
We may update this Privacy Policy to reflect:
• Changes in our information practices
• New legal or regulatory requirements
• Platform improvements and new features
• User feedback and industry best practices

8.2 Notification of Changes
We will notify you of significant changes through:
• Platform notifications and announcements
• Email communications to registered users
• Updated posting dates on this policy
• Other reasonable communication methods

8.3 Continued Use
Your continued use of the Platform after policy changes constitutes acceptance of the updated terms.`
    },
    {
      title: "9. Contact Information and Complaints",
      content: `9.1 Privacy Contact
For privacy-related questions or concerns, contact us at:
• Email: privacy@icp-rwa-pawn.com
• Address: [Data Protection Officer Address]
• Phone: [Privacy Contact Number]

9.2 Complaint Process
If you have concerns about our privacy practices:
• Contact us directly using the information above
• We will investigate and respond promptly
• You may also contact applicable regulatory authorities
• We are committed to resolving privacy issues fairly

9.3 Response Timeline
We aim to respond to privacy inquiries within:
• 48 hours for initial acknowledgment
• 30 days for complete investigation and response
• Additional time may be needed for complex requests

This Privacy Policy is effective as of January 1, 2025, and was last updated on January 1, 2025.`
    }
  ];

  const highlights = [
    {
      icon: <Shield className="w-6 h-6 text-primary" />,
      title: "Enterprise Security",
      description: "Military-grade encryption and comprehensive security measures protect your personal information."
    },
    {
      icon: <Eye className="w-6 h-6 text-primary" />,
      title: "Transparency",
      description: "Clear disclosure of how we collect, use, and protect your information with no hidden practices."
    },
    {
      icon: <Lock className="w-6 h-6 text-primary" />,
      title: "User Control",
      description: "Comprehensive privacy controls and rights to access, correct, or delete your personal information."
    },
    {
      icon: <Database className="w-6 h-6 text-primary" />,
      title: "Data Minimization",
      description: "We collect only the information necessary to provide our services and meet legal requirements."
    }
  ];

  return (
    <div className="min-h-screen bg-black">
      <Navigation />
      
      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-gray-900 dark:text-white mb-6">
            Privacy Policy
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Your privacy is important to us. This policy explains how we collect, use, and protect 
            your information when you use our platform.
          </p>
          <p className="text-sm text-muted-foreground mt-4">
            Last updated: January 1, 2025
          </p>
        </div>

        {/* Privacy Highlights */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {highlights.map((item, index) => (
            <Card key={index} data-testid={`privacy-highlight-${index}`}>
              <CardHeader className="pb-3">
                <div className="flex items-center space-x-3">
                  {item.icon}
                  <CardTitle className="text-lg">{item.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{item.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Privacy Policy Content */}
        <Card className="max-w-4xl mx-auto">
          <CardHeader>
            <CardTitle className="text-2xl">Privacy Policy Details</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[600px] pr-4">
              <div className="space-y-8">
                {sections.map((section, index) => (
                  <div key={index} data-testid={`privacy-section-${index}`}>
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

        {/* Contact Section */}
        <div className="max-w-4xl mx-auto mt-8">
          <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
            <CardContent className="pt-6">
              <div className="text-center">
                <h4 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">
                  Questions About Your Privacy?
                </h4>
                <p className="text-sm text-blue-700 dark:text-blue-300 mb-4">
                  We're committed to protecting your privacy and answering any questions you may have.
                </p>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  Contact our Privacy Team: <strong>privacy@icp-rwa-pawn.com</strong>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Footer />
    </div>
  );
}