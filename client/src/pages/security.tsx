import Navigation from "@/components/navigation";
import Footer from "@/components/footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, Lock, Eye, Server, Fingerprint, AlertTriangle, CheckCircle, Globe } from "lucide-react";
import SEO from "@/components/seo";

export default function Security() {
  return (
    <div className="min-h-screen">
      <SEO 
        title="Security - Secure Real World Assets on ICP Blockchain | RWAPAWN"
        description="Enterprise-grade security for pawning real world assets on the ICP blockchain. Military-grade encryption, blockchain transparency, and secure cryptocurrency loans. Learn how we protect your ICP assets."
        keywords="ICP Blockchain, Real World Assets, ICP Assets, Blockchain Pawnshop, Cryptocurrency Pawnshop, Secure RWA"
        ogTitle="Security Features - Protected RWA on ICP Blockchain"
        ogDescription="Advanced security measures protect your real world assets on the ICP blockchain. Encrypted transactions, immutable records, verified authenticity."
      />
      <Navigation />
      <SecurityContent />
      <Footer />
    </div>
  );
}

function SecurityContent() {
  const securityFeatures = [
    {
      icon: <Shield className="w-8 h-8 text-primary" />,
      title: "Blockchain Security",
      description: "Built on Internet Computer Protocol with immutable transaction records and cryptographic security.",
      details: [
        "All transactions recorded on ICP blockchain",
        "Cryptographic proof of ownership and authenticity",
        "Immutable audit trails for all platform activities",
        "Decentralized architecture prevents single points of failure"
      ],
      level: "Enterprise"
    },
    {
      icon: <Lock className="w-8 h-8 text-primary" />,
      title: "Advanced Encryption",
      description: "End-to-end encryption for all sensitive data, documents, and communications.",
      details: [
        "AES-256 encryption for all stored documents",
        "TLS 1.3 for all data transmission",
        "Encrypted database storage with key rotation",
        "Secure key management and hardware security modules"
      ],
      level: "Military Grade"
    },
    {
      icon: <Fingerprint className="w-8 h-8 text-primary" />,
      title: "Identity Verification", 
      description: "Multi-factor authentication with wallet binding and biometric verification options.",
      details: [
        "Internet Identity and Plug wallet integration",
        "Cryptographic proof of wallet ownership",
        "Multi-factor authentication requirements",
        "Biometric verification for high-value transactions"
      ],
      level: "Multi-Layer"
    },
    {
      icon: <Eye className="w-8 h-8 text-primary" />,
      title: "Fraud Detection",
      description: "AI-powered fraud detection with real-time monitoring and suspicious activity alerts.",
      details: [
        "Machine learning algorithms detect fraudulent patterns",
        "Real-time document authenticity verification",
        "OCR analysis for certificate validation",
        "Behavioral analysis for suspicious activities"
      ],
      level: "AI-Powered"
    },
    {
      icon: <Server className="w-8 h-8 text-primary" />,
      title: "Infrastructure Security",
      description: "Enterprise-grade infrastructure with redundancy, monitoring, and disaster recovery.",
      details: [
        "Multi-region deployment with automatic failover",
        "24/7 security monitoring and incident response",
        "Regular security audits and penetration testing",
        "Compliance with SOC 2 and ISO 27001 standards"
      ],
      level: "Enterprise"
    },
    {
      icon: <Globe className="w-8 h-8 text-primary" />,
      title: "Cross-Chain Security",
      description: "Secure bridge technology for Ethereum ↔ ICP transactions with validation layers.",
      details: [
        "Chain Fusion technology for secure cross-chain transfers",
        "Multiple validation layers for bridge transactions",
        "Time-locked contracts and dispute resolution",
        "Real-time monitoring of all bridge activities"
      ],
      level: "Cross-Chain"
    }
  ];

  const complianceStandards = [
    { name: "SOC 2 Type II", description: "Security and availability controls" },
    { name: "ISO 27001", description: "Information security management" },
    { name: "GDPR", description: "Data protection and privacy compliance" },
    { name: "AML/KYC", description: "Anti-money laundering procedures" },
    { name: "PCI DSS", description: "Payment card industry standards" },
    { name: "CCPA", description: "California consumer privacy act" }
  ];

  return (
    <>
      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-6" style={{ color: '#ffffff' }}>
            Enterprise-Grade Security
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Your assets and data are protected by military-grade encryption, blockchain security, 
            and AI-powered fraud detection. We maintain the highest security standards in the industry.
          </p>
        </div>

        {/* Security Features */}
        <div className="grid gap-8 mb-16">
          {securityFeatures.map((feature, index) => (
            <Card key={index} className="overflow-hidden" data-testid={`security-feature-${index}`}>
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center justify-center w-12 h-12 bg-primary/10 rounded-full">
                      {feature.icon}
                    </div>
                    <div>
                      <CardTitle className="text-xl">{feature.title}</CardTitle>
                      <CardDescription className="mt-2 text-base">
                        {feature.description}
                      </CardDescription>
                    </div>
                  </div>
                  <Badge variant="secondary" className="ml-4">
                    {feature.level}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="grid md:grid-cols-2 gap-3">
                  {feature.details.map((detail, idx) => (
                    <li key={idx} className="flex items-start space-x-3">
                      <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-muted-foreground">{detail}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Compliance Section */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-center mb-8">Compliance & Standards</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {complianceStandards.map((standard, index) => (
              <Card key={index} data-testid={`compliance-${index}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <CardTitle className="text-lg">{standard.name}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{standard.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Security Commitment */}
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader>
            <div className="flex items-center space-x-3">
              <AlertTriangle className="w-6 h-6 text-primary" />
              <CardTitle>Our Security Commitment</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              We take security seriously and continuously invest in the latest technologies and best practices 
              to protect your valuable assets and personal information.
            </p>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold mb-2">24/7 Monitoring</h4>
                <p className="text-sm text-muted-foreground">
                  Our security team monitors the platform around the clock, with automated alerts 
                  for any suspicious activities or potential threats.
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Regular Audits</h4>
                <p className="text-sm text-muted-foreground">
                  We conduct regular third-party security audits and penetration testing to identify 
                  and address any potential vulnerabilities.
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Bug Bounty Program</h4>
                <p className="text-sm text-muted-foreground">
                  We maintain an active bug bounty program, rewarding security researchers 
                  who help us identify and fix security issues.
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Incident Response</h4>
                <p className="text-sm text-muted-foreground">
                  Our incident response team is ready to respond to any security incidents 
                  within minutes, with clear communication to all affected users.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}