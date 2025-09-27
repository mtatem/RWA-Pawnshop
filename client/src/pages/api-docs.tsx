import Navigation from "@/components/navigation";
import Footer from "@/components/footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Code, Key, Globe, Shield, Zap, BookOpen } from "lucide-react";

export default function ApiDocs() {
  const endpoints = [
    {
      method: "POST",
      path: "/api/auth/login",
      description: "Authenticate user and create session",
      auth: false,
      rateLimit: "5/min"
    },
    {
      method: "GET", 
      path: "/api/auth/user",
      description: "Get current authenticated user information",
      auth: true,
      rateLimit: "30/min"
    },
    {
      method: "POST",
      path: "/api/rwa-submissions",
      description: "Submit a real-world asset for pawning",
      auth: true,
      rateLimit: "10/min"
    },
    {
      method: "GET",
      path: "/api/rwa-submissions",
      description: "List user's asset submissions with pagination",
      auth: true,
      rateLimit: "60/min"
    },
    {
      method: "POST",
      path: "/api/documents/upload",
      description: "Upload and analyze documents for asset verification",
      auth: true,
      rateLimit: "20/min"
    },
    {
      method: "GET",
      path: "/api/pricing/:category",
      description: "Get real-time asset pricing for category",
      auth: false,
      rateLimit: "100/min"
    },
    {
      method: "POST",
      path: "/api/bridge/initiate",
      description: "Initiate cross-chain bridge transaction",
      auth: true,
      rateLimit: "5/min"
    },
    {
      method: "GET",
      path: "/api/bridge/status/:id",
      description: "Get bridge transaction status and details",
      auth: true,
      rateLimit: "30/min"
    }
  ];

  const sdkExamples = {
    javascript: `// Install the SDK
npm install @rwapawn/sdk

// Initialize the client
import { RWAPawn } from '@rwapawn/sdk';

const client = new RWAPawn({
  apiKey: 'your-api-key',
  environment: 'production' // or 'sandbox'
});

// Submit an asset for pawning
const submission = await client.submissions.create({
  category: 'jewelry',
  description: 'Gold necklace with diamonds',
  estimatedValue: 1500,
  images: ['base64-image-data'],
  documents: ['certificate-of-authenticity.pdf']
});

// Check submission status
const status = await client.submissions.get(submission.id);
console.log('Status:', status.status);`,

    python: `# Install the SDK
pip install rwapawn-sdk

# Initialize the client
from rwapawn import Client

client = Client(
    api_key='your-api-key',
    environment='production'  # or 'sandbox'
)

# Submit an asset for pawning
submission = client.submissions.create(
    category='jewelry',
    description='Gold necklace with diamonds', 
    estimated_value=1500,
    images=['base64-image-data'],
    documents=['certificate-of-authenticity.pdf']
)

# Check submission status
status = client.submissions.get(submission.id)
print(f'Status: {status.status}')`,

    curl: `# Submit an asset for pawning
curl -X POST https://api.rwapawn.io/api/rwa-submissions \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "category": "jewelry",
    "description": "Gold necklace with diamonds",
    "estimatedValue": 1500,
    "images": ["base64-image-data"],
    "documents": ["certificate-of-authenticity.pdf"]
  }'

# Check submission status
curl https://api.rwapawn.io/api/rwa-submissions/123 \\
  -H "Authorization: Bearer YOUR_API_KEY"`
  };

  return (
    <div className="min-h-screen bg-black">
      <Navigation />
      
      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-6" style={{ color: '#ffffff' }}>
            Developer API Documentation
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Build powerful applications on top of our RWA pawning platform. 
            Our REST API provides programmatic access to all platform features.
          </p>
        </div>

        {/* Quick Start */}
        <Card className="mb-16">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Zap className="w-6 h-6 text-primary" />
              <span>Quick Start</span>
            </CardTitle>
            <CardDescription>
              Get started with the ICP RWA Pawn API in minutes
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center">
                <Key className="w-8 h-8 text-primary mx-auto mb-3" />
                <h4 className="font-semibold mb-2">1. Get API Key</h4>
                <p className="text-sm text-muted-foreground">
                  Register for a developer account and generate your API key
                </p>
              </div>
              <div className="text-center">
                <Code className="w-8 h-8 text-primary mx-auto mb-3" />
                <h4 className="font-semibold mb-2">2. Make API Call</h4>
                <p className="text-sm text-muted-foreground">
                  Use our REST endpoints or official SDKs to integrate
                </p>
              </div>
              <div className="text-center">
                <Globe className="w-8 h-8 text-primary mx-auto mb-3" />
                <h4 className="font-semibold mb-2">3. Go Live</h4>
                <p className="text-sm text-muted-foreground">
                  Deploy your application and start processing assets
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* API Information */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Base URL</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm font-mono bg-muted p-2 rounded">
                https://api.rwapawn.io
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Authentication</CardTitle>
            </CardHeader>
            <CardContent>
              <Badge className="mb-2">Bearer Token</Badge>
              <p className="text-xs text-muted-foreground">
                Include in Authorization header
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Response Format</CardTitle>
            </CardHeader>
            <CardContent>
              <Badge className="mb-2">JSON</Badge>
              <p className="text-xs text-muted-foreground">
                All responses in JSON format
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Rate Limiting</CardTitle>
            </CardHeader>
            <CardContent>
              <Badge variant="outline" className="mb-2">Included</Badge>
              <p className="text-xs text-muted-foreground">
                Per endpoint rate limits
              </p>
            </CardContent>
          </Card>
        </div>

        {/* API Endpoints */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-center mb-8">API Endpoints</h2>
          <div className="space-y-4">
            {endpoints.map((endpoint, index) => (
              <Card key={index} data-testid={`endpoint-${index}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Badge variant={endpoint.method === 'GET' ? 'secondary' : 'default'}>
                        {endpoint.method}
                      </Badge>
                      <code className="font-mono text-sm">{endpoint.path}</code>
                    </div>
                    <div className="flex items-center space-x-2">
                      {endpoint.auth && <Badge variant="outline">Auth Required</Badge>}
                      <Badge variant="secondary">{endpoint.rateLimit}</Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{endpoint.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Code Examples */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-center mb-8">SDK Examples</h2>
          <Tabs defaultValue="javascript" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="javascript">JavaScript</TabsTrigger>
              <TabsTrigger value="python">Python</TabsTrigger>
              <TabsTrigger value="curl">cURL</TabsTrigger>
            </TabsList>
            
            {Object.entries(sdkExamples).map(([lang, code]) => (
              <TabsContent key={lang} value={lang}>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg capitalize">{lang} Example</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
                      <code>{code}</code>
                    </pre>
                  </CardContent>
                </Card>
              </TabsContent>
            ))}
          </Tabs>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Shield className="w-6 h-6 text-primary" />
                <span>Secure by Design</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">
                All API endpoints are secured with OAuth 2.0, rate limiting, 
                and comprehensive request validation.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Zap className="w-6 h-6 text-primary" />
                <span>High Performance</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">
                Built for scale with sub-100ms response times and 99.9% uptime SLA 
                backed by enterprise infrastructure.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <BookOpen className="w-6 h-6 text-primary" />
                <span>Comprehensive Docs</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">
                Detailed documentation with examples, SDKs in multiple languages, 
                and interactive API playground.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Support */}
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader>
            <CardTitle className="text-center">Developer Support</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">
              Need help integrating our API? Our developer support team is here to help.
            </p>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold mb-2">Documentation</h4>
                <p className="text-sm text-muted-foreground">
                  Comprehensive guides, tutorials, and API reference documentation
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Developer Support</h4>
                <p className="text-sm text-muted-foreground">
                  Direct access to our engineering team via Discord and email
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Footer />
    </div>
  );
}