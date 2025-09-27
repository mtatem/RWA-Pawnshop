import Navigation from "@/components/navigation";
import Footer from "@/components/footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Search, HelpCircle, BookOpen, MessageCircle, Settings, Shield, Coins, ArrowRightLeft } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";
import { helpCategories, helpArticles, popularArticles, getArticlesByCategory } from "@/content/help";

export default function HelpCenter() {
  const [searchQuery, setSearchQuery] = useState("");

  // Icon mapping for categories
  const getIcon = (iconName: string) => {
    const iconMap = {
      "HelpCircle": <HelpCircle className="w-8 h-8 text-primary" />,
      "Coins": <Coins className="w-8 h-8 text-primary" />,
      "Shield": <Shield className="w-8 h-8 text-primary" />,
      "ArrowRightLeft": <ArrowRightLeft className="w-8 h-8 text-primary" />,
      "Settings": <Settings className="w-8 h-8 text-primary" />,
      "MessageCircle": <MessageCircle className="w-8 h-8 text-primary" />
    };
    return iconMap[iconName as keyof typeof iconMap] || <HelpCircle className="w-8 h-8 text-primary" />;
  };

  // Get popular articles with their full data
  const popularArticleData = popularArticles.map(slug => 
    helpArticles.find(article => article.slug === slug)
  ).filter(Boolean).slice(0, 12);

  const faqs = {
    general: [
      {
        question: "What is ICP RWA Pawn and how does it work?",
        answer: "ICP RWA Pawn is a decentralized platform that allows you to pawn real-world assets for cryptocurrency loans. You submit your asset with documentation, our team verifies it, and you receive up to 70% of its value as an instant ICP loan."
      },
      {
        question: "What types of assets can I pawn?",
        answer: "We accept various real-world assets including jewelry, watches, art, collectibles, precious metals, and high-value electronics. Each asset must be accompanied by proper documentation and certificates of authenticity where applicable."
      },
      {
        question: "How long does the verification process take?",
        answer: "Standard verification typically takes 24-48 hours. Express processing is available for 1 ICP additional fee, reducing verification time to under 24 hours."
      },
      {
        question: "What happens if I can't repay my loan?",
        answer: "If you cannot repay your loan within the 90-day term, your asset will be permanently forfeited and listed on our marketplace for sale. This process is irreversible, so please only borrow what you can afford to repay."
      }
    ],
    technical: [
      {
        question: "Which wallets are supported?",
        answer: "We support Internet Identity and Plug Wallet for ICP transactions. Our cross-chain bridge also supports MetaMask and other Ethereum-compatible wallets for ETH/USDC transactions."
      },
      {
        question: "How does the cross-chain bridge work?",
        answer: "Our bridge uses Chain Fusion technology to convert between ETH/USDC and ckETH/ckUSDC. Transactions are secured by multiple validators and typically complete within 10-30 minutes."
      },
      {
        question: "Are my documents secure?",
        answer: "Yes, all documents are encrypted with AES-256 encryption and stored securely. We use advanced OCR and fraud detection to verify authenticity while protecting your privacy."
      },
      {
        question: "Can I extend my loan term?",
        answer: "Yes, loan extensions are available for 1% of the loan amount, extending your term by an additional 30 days. Extensions must be requested before your current loan expires."
      }
    ],
    fees: [
      {
        question: "What fees do you charge?",
        answer: "We charge a 2 ICP platform fee for asset submission, 8.5% APR interest on loans, and 0.5% for cross-chain bridge transactions. All fees are disclosed upfront with no hidden charges."
      },
      {
        question: "Are there any additional costs?",
        answer: "Optional services include express processing (1 ICP), loan extensions (1% of loan amount), and physical inspection (50 USDC). Insurance coverage is available for 2% of asset value per year."
      },
      {
        question: "Do you offer any discounts?",
        answer: "Yes, we offer early repayment discounts and bulk processing discounts for multiple asset submissions. Contact our support team for details on current promotional offers."
      }
    ]
  };

  return (
    <div className="min-h-screen bg-black">
      <Navigation />
      
      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-6" style={{ color: '#ffffff' }}>
            Help Center
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Find answers to your questions, learn how to use our platform, and get the support you need.
          </p>
        </div>

        {/* Search Bar */}
        <div className="max-w-2xl mx-auto mb-12">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
            <Input
              type="search"
              placeholder="Search for help articles, guides, and tutorials..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-3 text-lg"
              data-testid="search-input"
            />
            <Button className="absolute right-2 top-1/2 transform -translate-y-1/2" data-testid="search-button">
              Search
            </Button>
          </div>
        </div>

        {/* Help Categories */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-center mb-4">Browse by Category</h2>
          <p className="text-center text-muted-foreground mb-8 max-w-3xl mx-auto">
            Explore comprehensive guides organized by topic to find exactly what you need
          </p>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {helpCategories.map((category, index) => {
              const categoryArticles = getArticlesByCategory(category.slug);
              return (
                <Card key={category.id} className="hover:shadow-lg transition-all duration-300 cursor-pointer group hover:border-primary/50" data-testid={`category-${index}`}>
                  <CardHeader className="pb-4">
                    <div className="flex items-center space-x-4">
                      <div className={`p-3 rounded-lg ${category.color} group-hover:scale-110 transition-transform duration-300`}>
                        {getIcon(category.icon)}
                      </div>
                      <div>
                        <CardTitle className="text-lg group-hover:text-primary transition-colors">{category.title}</CardTitle>
                        <Badge variant="secondary" className="mt-1">
                          {categoryArticles.length} articles
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">{category.description}</p>
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Featured Articles:</p>
                      <ul className="text-xs text-muted-foreground space-y-1">
                        {categoryArticles.slice(0, 3).map((article, articleIndex) => (
                          <li key={article.id} className="flex items-center space-x-2">
                            <div className="w-1 h-1 bg-primary rounded-full"></div>
                            <Link href={`/help/${article.categorySlug}/${article.slug}`} className="truncate hover:text-primary transition-colors">
                              {article.title}
                            </Link>
                          </li>
                        ))}
                        {categoryArticles.length > 3 && (
                          <li className="text-primary font-medium">
                            +{categoryArticles.length - 3} more articles
                          </li>
                        )}
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Popular Articles */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-center mb-4">Popular Articles</h2>
          <p className="text-center text-muted-foreground mb-8 max-w-3xl mx-auto">
            Most read guides and tutorials to help you get the most out of your RWA pawn experience
          </p>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {popularArticleData.map((article, index) => (
              <Link key={article!.id} href={`/help/${article!.categorySlug}/${article!.slug}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer group" data-testid={`quick-link-${index}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start space-x-3">
                      <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                        <BookOpen className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm leading-snug mb-1 group-hover:text-primary transition-colors">{article!.title}</h4>
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-muted-foreground">{article!.category}</p>
                          <Badge variant="outline" className="text-xs">{article!.readTime}</Badge>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>

        {/* FAQ Section */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-center mb-8">Frequently Asked Questions</h2>
          <div className="max-w-4xl mx-auto">
            <Tabs defaultValue="general" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="general">General</TabsTrigger>
                <TabsTrigger value="technical">Technical</TabsTrigger>
                <TabsTrigger value="fees">Fees & Pricing</TabsTrigger>
              </TabsList>
              
              {Object.entries(faqs).map(([category, questions]) => (
                <TabsContent key={category} value={category}>
                  <Card>
                    <CardContent className="pt-6">
                      <Accordion type="single" collapsible className="w-full">
                        {questions.map((faq, index) => (
                          <AccordionItem key={index} value={`${category}-${index}`} data-testid={`faq-${category}-${index}`}>
                            <AccordionTrigger className="text-left">
                              {faq.question}
                            </AccordionTrigger>
                            <AccordionContent className="text-muted-foreground">
                              {faq.answer}
                            </AccordionContent>
                          </AccordionItem>
                        ))}
                      </Accordion>
                    </CardContent>
                  </Card>
                </TabsContent>
              ))}
            </Tabs>
          </div>
        </div>

        {/* Still Need Help */}
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="pt-6 text-center">
            <MessageCircle className="w-12 h-12 text-primary mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Still Need Help?</h3>
            <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
              Can't find what you're looking for? Our support team is here to help you with any questions or issues you might have.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/contact-us">
                <Button className="inline-flex items-center space-x-2" data-testid="contact-support">
                  <MessageCircle className="w-4 h-4" />
                  <span>Contact Support</span>
                </Button>
              </Link>
              <Button variant="outline" className="inline-flex items-center space-x-2" data-testid="live-chat">
                <MessageCircle className="w-4 h-4" />
                <span>Start Live Chat</span>
              </Button>
            </div>
            <p className="text-sm text-muted-foreground mt-4">
              Average response time: Under 2 hours • Available 24/7
            </p>
          </CardContent>
        </Card>
      </div>

      <Footer />
    </div>
  );
}