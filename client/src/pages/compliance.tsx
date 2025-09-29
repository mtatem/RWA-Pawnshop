import Navigation from "@/components/navigation";
import Footer from "@/components/footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { CheckCircle, Shield, Globe, FileText, Users, AlertCircle } from "lucide-react";

export default function Compliance() {
  const complianceFrameworks = [
    {
      icon: <Shield className="w-8 h-8 text-green-600" />,
      title: "Anti-Money Laundering (AML)",
      status: "Compliant",
      description: "Comprehensive AML program to detect and prevent money laundering activities.",
      requirements: [
        "Customer Due Diligence (CDD) procedures",
        "Enhanced Due Diligence (EDD) for high-risk customers",
        "Ongoing transaction monitoring and reporting",
        "Suspicious Activity Report (SAR) filing",
        "Regular AML training for all personnel",
        "Independent AML compliance testing and audits"
      ]
    },
    {
      icon: <Users className="w-8 h-8 text-blue-600" />,
      title: "Know Your Customer (KYC)",
      status: "Implemented",
      description: "Identity verification and customer onboarding procedures to prevent fraud.",
      requirements: [
        "Identity document verification and validation",
        "Address verification and confirmation",
        "Beneficial ownership identification",
        "PEP (Politically Exposed Person) screening",
        "Sanctions list screening and monitoring",
        "Customer risk assessment and profiling"
      ]
    },
    {
      icon: <FileText className="w-8 h-8 text-purple-600" />,
      title: "Record Keeping",
      status: "Maintained",
      description: "Comprehensive record keeping and data retention practices.",
      requirements: [
        "Transaction records maintained for minimum 5 years",
        "Customer identification records retention",
        "AML compliance documentation archival",
        "Audit trail maintenance for all activities",
        "Secure storage and access controls",
        "Regular backup and disaster recovery procedures"
      ]
    },
    {
      icon: <Globe className="w-8 h-8 text-orange-600" />,
      title: "International Compliance",
      status: "Multi-Jurisdictional",
      description: "Compliance with international financial regulations and standards.",
      requirements: [
        "FATF (Financial Action Task Force) recommendations",
        "Basel Committee guidelines implementation",
        "Cross-border transaction reporting",
        "International sanctions compliance",
        "Tax information reporting (CRS/FATCA)",
        "Data protection regulation compliance (GDPR)"
      ]
    }
  ];

  const regulatoryReporting = [
    {
      report: "Suspicious Activity Reports (SARs)",
      frequency: "As Required",
      description: "Reports filed with FinCEN for suspicious transactions"
    },
    {
      report: "Currency Transaction Reports (CTRs)", 
      frequency: "Per Transaction",
      description: "Reports for transactions exceeding $10,000"
    },
    {
      report: "Large Cash Transaction Reports",
      frequency: "Daily",
      description: "Reports for cash transactions over regulatory thresholds"
    },
    {
      report: "Cross-Border Reports",
      frequency: "Per Transaction", 
      description: "Reports for international fund transfers"
    },
    {
      report: "Compliance Testing Reports",
      frequency: "Annually",
      description: "Independent compliance assessment reports"
    },
    {
      report: "Risk Assessment Updates",
      frequency: "Annually",
      description: "Comprehensive risk assessment documentation"
    }
  ];

  const complianceProgram = [
    {
      category: "Governance and Oversight",
      elements: [
        "Board of Directors compliance oversight",
        "Chief Compliance Officer designation", 
        "Compliance committee structure",
        "Regular compliance reporting to management",
        "Independent compliance testing and validation"
      ]
    },
    {
      category: "Policies and Procedures",
      elements: [
        "Written AML/BSA compliance program",
        "Customer identification procedures (CIP)",
        "Suspicious activity monitoring procedures",
        "Sanctions screening and interdiction procedures",
        "Employee training and certification programs"
      ]
    },
    {
      category: "Risk Assessment",
      elements: [
        "Customer risk categorization methodology",
        "Product and service risk assessment",
        "Geographic risk evaluation",
        "Transaction monitoring risk scoring",
        "Periodic risk assessment updates and reviews"
      ]
    },
    {
      category: "Technology and Systems",
      elements: [
        "Automated transaction monitoring systems",
        "Customer screening and filtering technology",
        "Record keeping and audit trail systems",
        "Regulatory reporting automation",
        "Data security and privacy protection systems"
      ]
    }
  ];

  const dataProtection = [
    {
      regulation: "GDPR (General Data Protection Regulation)",
      scope: "European Union",
      requirements: [
        "Lawful basis for processing personal data",
        "Data subject rights implementation",
        "Privacy by design and by default", 
        "Data breach notification procedures",
        "Data Protection Officer (DPO) appointment"
      ]
    },
    {
      regulation: "CCPA (California Consumer Privacy Act)",
      scope: "California, USA",
      requirements: [
        "Consumer right to know data collection",
        "Right to deletion of personal information",
        "Right to opt-out of data sales",
        "Non-discrimination for privacy rights exercise",
        "Privacy policy disclosure requirements"
      ]
    },
    {
      regulation: "PCI DSS (Payment Card Industry Data Security Standard)",
      scope: "Global",
      requirements: [
        "Secure network and systems maintenance",
        "Cardholder data protection",
        "Access control measures implementation",
        "Regular network monitoring and testing",
        "Information security policy maintenance"
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-black">
      <Navigation />
      
      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-6" style={{ color: '#ffffff' }}>
            Compliance Framework
          </h1>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
            Our comprehensive compliance program ensures adherence to all applicable financial regulations, 
            data protection laws, and industry standards across multiple jurisdictions.
          </p>
          <p className="text-sm text-muted-foreground mt-4">
            Last updated: September 29, 2025
          </p>
        </div>

        {/* Compliance Status Overview */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <CardTitle className="text-lg">AML Program</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                Fully Compliant
              </Badge>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <CardTitle className="text-lg">KYC Procedures</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                Implemented
              </Badge>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <CardTitle className="text-lg">Data Protection</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                GDPR/CCPA Ready
              </Badge>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <CardTitle className="text-lg">Auditing</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                SOC 2 Certified
              </Badge>
            </CardContent>
          </Card>
        </div>

        {/* Compliance Frameworks */}
        <div className="space-y-8 mb-16">
          <h2 className="text-3xl font-bold text-center">Regulatory Compliance</h2>
          {complianceFrameworks.map((framework, index) => (
            <Card key={index} data-testid={`framework-${index}`}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center justify-center w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-full">
                      {framework.icon}
                    </div>
                    <div>
                      <CardTitle className="text-xl">{framework.title}</CardTitle>
                      <p className="text-muted-foreground mt-1">{framework.description}</p>
                    </div>
                  </div>
                  <Badge variant="secondary">{framework.status}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4">
                  {framework.requirements.map((requirement, reqIndex) => (
                    <div key={reqIndex} className="flex items-start space-x-3">
                      <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-muted-foreground">{requirement}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Regulatory Reporting */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-center mb-8">Regulatory Reporting</h2>
          <Card>
            <CardHeader>
              <CardTitle>Required Reports and Filings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left p-4 font-semibold">Report Type</th>
                      <th className="text-left p-4 font-semibold">Frequency</th>
                      <th className="text-left p-4 font-semibold">Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {regulatoryReporting.map((report, index) => (
                      <tr key={index} className="border-b border-border" data-testid={`report-${index}`}>
                        <td className="p-4 font-medium">{report.report}</td>
                        <td className="p-4">
                          <Badge variant="outline">{report.frequency}</Badge>
                        </td>
                        <td className="p-4 text-sm text-muted-foreground">{report.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Compliance Program Components */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-center mb-8">Compliance Program Structure</h2>
          <div className="grid md:grid-cols-2 gap-8">
            {complianceProgram.map((component, index) => (
              <Card key={index} data-testid={`program-${index}`}>
                <CardHeader>
                  <CardTitle className="text-lg">{component.category}</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {component.elements.map((element, elementIndex) => (
                      <li key={elementIndex} className="flex items-start space-x-3">
                        <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                        <span className="text-sm text-muted-foreground">{element}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Data Protection Compliance */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-center mb-8">Data Protection Compliance</h2>
          <div className="space-y-6">
            {dataProtection.map((regulation, index) => (
              <Card key={index} data-testid={`data-protection-${index}`}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{regulation.regulation}</CardTitle>
                    <Badge variant="outline">{regulation.scope}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-4">
                    {regulation.requirements.map((requirement, reqIndex) => (
                      <div key={reqIndex} className="flex items-start space-x-3">
                        <CheckCircle className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-muted-foreground">{requirement}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Compliance Contact */}
        <Card className="max-w-4xl mx-auto">
          <CardHeader>
            <CardTitle className="text-2xl text-center">Compliance Management</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center space-y-6">
              <div className="grid md:grid-cols-3 gap-6">
                <div>
                  <h4 className="font-semibold mb-2">Chief Compliance Officer</h4>
                  <p className="text-sm text-muted-foreground">
                    info@rwapawn.io<br/>
                    +1 (772) 834-5081
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">AML/BSA Officer</h4>
                  <p className="text-sm text-muted-foreground">
                    info@rwapawn.io<br/>
                    +1 (772) 834-5081
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Data Protection Officer</h4>
                  <p className="text-sm text-muted-foreground">
                    info@rwapawn.io<br/>
                    +1 (772) 834-5081
                  </p>
                </div>
              </div>
              
              <Separator />

              <div className="flex items-center justify-center space-x-2 text-sm text-muted-foreground">
                <AlertCircle className="w-4 h-4" />
                <span>
                  For regulatory inquiries or compliance concerns, please contact our compliance team directly.
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Footer />
    </div>
  );
}