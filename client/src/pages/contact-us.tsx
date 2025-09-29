import Navigation from "@/components/navigation";
import Footer from "@/components/footer";
import ChatPopup from "@/components/chat-popup";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  Mail, 
  MessageCircle, 
  Phone, 
  MapPin, 
  Clock, 
  Send,
  AlertCircle,
  HelpCircle,
  Shield,
  Coins,
  Settings,
  Bug
} from "lucide-react";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import SEO from "@/components/seo";

export default function ContactUs() {
  const { toast } = useToast();
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    category: "",
    message: "",
    priority: "normal"
  });

  const contactMethods = [
    {
      icon: <MessageCircle className="w-8 h-8 text-blue-500" />,
      title: "Live Chat",
      description: "Get instant help from our support team",
      availability: "24/7 Available",
      responseTime: "Usually within minutes",
      action: "Start Chat",
      color: "bg-blue-500/10 border-blue-500/20"
    },
    {
      icon: <Mail className="w-8 h-8 text-green-500" />,
      title: "Email Support",
      description: "Send us a detailed message about your issue",
      availability: "info@rwapawn.io",
      responseTime: "Within 2 hours",
      action: "Send Email",
      color: "bg-green-500/10 border-green-500/20"
    },
    {
      icon: <Phone className="w-8 h-8 text-purple-500" />,
      title: "Phone Support",
      description: "Speak directly with our support specialists",
      availability: "772-834-5081",
      responseTime: "Mon-Fri 9AM-6PM PST",
      action: "Call Now",
      color: "bg-purple-500/10 border-purple-500/20"
    }
  ];

  const supportCategories = [
    { icon: <HelpCircle className="w-5 h-5" />, label: "General Questions", value: "general" },
    { icon: <Coins className="w-5 h-5" />, label: "Asset Submission", value: "assets" },
    { icon: <Settings className="w-5 h-5" />, label: "Account Issues", value: "account" },
    { icon: <Shield className="w-5 h-5" />, label: "Security Concerns", value: "security" },
    { icon: <Bug className="w-5 h-5" />, label: "Technical Problems", value: "technical" },
    { icon: <AlertCircle className="w-5 h-5" />, label: "Billing & Payments", value: "billing" }
  ];

  const offices = [
    {
      name: "RWAPAWN Headquarters",
      address: "4406 SE Graham Dr.",
      city: "Stuart, Florida 34997",
      country: "United States",
      phone: "772-834-5081",
      email: "info@rwapawn.io",
      contact: "Matt Tatem",
      role: "Support and Technical Assistance"
    }
  ];

  // Contact form submission mutation
  const contactMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await apiRequest("POST", "/api/contact", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Message Sent!",
        description: "Thank you for contacting RWAPAWN.io. We'll get back to you soon. If this is an emergency please call us directly 772-834-5081",
      });
      // Reset form
      setFormData({
        name: "",
        email: "",
        subject: "",
        category: "",
        message: "",
        priority: "normal"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Send Message",
        description: error.message || "Please try again later.",
        variant: "destructive",
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!formData.name || !formData.email || !formData.subject || !formData.category || !formData.message) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }
    
    contactMutation.mutate(formData);
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="min-h-screen bg-black">
      <SEO 
        title="Contact Us - Support for Real World Assets on ICP | RWAPAWN"
        description="Get in touch with RWAPAWN support for help with pawning real world assets on the ICP blockchain. 24/7 support for cryptocurrency loans, ICP assets, and blockchain pawnshop services."
        keywords="Pawning Real World Assets, ICP Blockchain, Real World Assets Support, ICP Assets, Cryptocurrency Loans, Blockchain Pawnshop"
        ogTitle="Contact Us - RWAPAWN Support"
        ogDescription="Contact RWAPAWN for support with real world assets on the ICP blockchain. 24/7 assistance available."
      />
      <Navigation />
      
      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-6" style={{ color: '#ffffff' }}>
            Contact Us
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Have questions or need support? We're here to help. Choose the best way to reach us 
            and we'll get back to you as soon as possible.
          </p>
        </div>

        {/* Contact Methods */}
        <div className="grid md:grid-cols-3 gap-6 mb-16">
          {contactMethods.map((method, index) => {
            const getButtonProps = () => {
              if (method.action === "Start Chat") {
                return {
                  onClick: () => setIsChatOpen(true),
                  "data-testid": "button-start-chat"
                };
              } else if (method.action === "Send Email") {
                return {
                  as: "a",
                  href: "mailto:info@rwapawn.io",
                  "data-testid": "button-email-support"
                };
              } else if (method.action === "Call Now") {
                return {
                  as: "a",
                  href: "tel:7728345081",
                  "data-testid": "button-call-now"
                };
              }
              return {};
            };
            
            return (
              <Card key={index} className={`${method.color} hover:shadow-lg transition-shadow`} data-testid={`contact-method-${index}`}>
                <CardHeader className="pb-4">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center justify-center w-12 h-12 bg-white/20 rounded-full">
                      {method.icon}
                    </div>
                    <div>
                      <CardTitle className="text-lg">{method.title}</CardTitle>
                      <Badge variant="secondary" className="mt-1">
                        {method.responseTime}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">{method.description}</p>
                  <p className="font-semibold text-sm">{method.availability}</p>
                  <Button className="w-full" variant="outline" {...getButtonProps()}>
                    {method.action}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="grid lg:grid-cols-2 gap-12 mb-16">
          {/* Contact Form */}
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl flex items-center space-x-2">
                <Send className="w-6 h-6 text-primary" />
                <span>Send us a Message</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      placeholder="Your full name"
                      data-testid="input-name"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      placeholder="your.email@example.com"
                      data-testid="input-email"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Issue Category</Label>
                  <Select onValueChange={(value) => handleInputChange('category', value)}>
                    <SelectTrigger data-testid="select-category">
                      <SelectValue placeholder="Select the type of inquiry" />
                    </SelectTrigger>
                    <SelectContent>
                      {supportCategories.map((category, index) => (
                        <SelectItem key={index} value={category.value}>
                          <div className="flex items-center space-x-2">
                            {category.icon}
                            <span>{category.label}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="subject">Subject</Label>
                  <Input
                    id="subject"
                    value={formData.subject}
                    onChange={(e) => handleInputChange('subject', e.target.value)}
                    placeholder="Brief description of your issue"
                    data-testid="input-subject"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="priority">Priority Level</Label>
                  <Select onValueChange={(value) => handleInputChange('priority', value)} defaultValue="normal">
                    <SelectTrigger data-testid="select-priority">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low - General inquiry</SelectItem>
                      <SelectItem value="normal">Normal - Standard issue</SelectItem>
                      <SelectItem value="high">High - Urgent matter</SelectItem>
                      <SelectItem value="critical">Critical - System down</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message">Message</Label>
                  <Textarea
                    id="message"
                    value={formData.message}
                    onChange={(e) => handleInputChange('message', e.target.value)}
                    placeholder="Please provide detailed information about your issue or question..."
                    className="min-h-32"
                    data-testid="textarea-message"
                    required
                  />
                </div>

                <Button type="submit" className="w-full" size="lg" data-testid="button-submit" disabled={contactMutation.isPending}>
                  <Send className="w-4 h-4 mr-2" />
                  {contactMutation.isPending ? "Sending..." : "Send Message"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Office Locations */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl flex items-center space-x-2">
                  <MapPin className="w-6 h-6 text-primary" />
                  <span>Our Offices</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {offices.map((office, index) => (
                  <div key={index} className="border-b border-border last:border-0 pb-4 last:pb-0" data-testid={`office-${index}`}>
                    <h4 className="font-semibold text-lg mb-2">{office.name}</h4>
                    <div className="space-y-1 text-sm text-muted-foreground">
                      <p className="flex items-center space-x-2">
                        <MapPin className="w-4 h-4" />
                        <span>{office.address}</span>
                      </p>
                      <p className="ml-6">{office.city}</p>
                      <p className="ml-6">{office.country}</p>
                      <p className="flex items-center space-x-2">
                        <Phone className="w-4 h-4" />
                        <span>{office.phone}</span>
                      </p>
                      <p className="flex items-center space-x-2">
                        <Mail className="w-4 h-4" />
                        <span>{office.email}</span>
                      </p>
                      {office.contact && (
                        <p className="flex items-center space-x-2 pt-2">
                          <span className="font-medium">Contact: {office.contact}</span>
                        </p>
                      )}
                      {office.role && (
                        <p className="ml-6 text-xs">{office.role}</p>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Clock className="w-5 h-5 text-primary" />
                  <span>Support Hours</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Live Chat</span>
                  <Badge className="bg-green-500/10 text-green-600">24/7</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-medium">Email Support</span>
                  <Badge className="bg-green-500/10 text-green-600">24/7</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-medium">Phone Support</span>
                  <Badge variant="secondary">Mon-Fri 9AM-6PM PST</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-medium">Emergency Line</span>
                  <Badge className="bg-red-500/10 text-red-600">24/7</Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* FAQ Quick Access */}
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="pt-6 text-center">
            <HelpCircle className="w-12 h-12 text-primary mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Looking for Quick Answers?</h3>
            <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
              Before contacting us, check our Help Center for instant answers to common questions 
              about asset submission, loans, security, and more.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/help-center">
                <Button variant="outline" className="inline-flex items-center space-x-2" data-testid="visit-help-center">
                  <HelpCircle className="w-4 h-4" />
                  <span>Visit Help Center</span>
                </Button>
              </Link>
              <Link href="/help-center">
                <Button variant="outline" className="inline-flex items-center space-x-2" data-testid="view-faqs">
                  <MessageCircle className="w-4 h-4" />
                  <span>View FAQs</span>
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      <Footer />
      
      <ChatPopup isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
    </div>
  );
}