import { useParams } from "wouter";
import { ArrowLeft, Clock, Calendar, ExternalLink, AlertTriangle, Lightbulb, CheckCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import Navigation from "@/components/navigation";
import Footer from "@/components/footer";
import { getArticleBySlug, getCategoryBySlug, getArticlesByCategory, helpArticles, type HelpArticle } from "@/content/help";
import { Link } from "wouter";

export default function HelpArticle() {
  const params = useParams();
  const categorySlug = params.categorySlug;
  const articleSlug = params.articleSlug;

  // Get the article and category data
  const article = getArticleBySlug(categorySlug!, articleSlug!);
  const category = getCategoryBySlug(categorySlug!);
  const relatedArticles = getArticlesByCategory(categorySlug!).filter(a => a.slug !== articleSlug).slice(0, 3);

  // Handle 404 case
  if (!article || !category) {
    return (
      <div className="min-h-screen bg-black">
        <Navigation />
        <div className="container mx-auto px-4 py-16">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-white mb-4">Article Not Found</h1>
            <p className="text-muted-foreground mb-8">
              The help article you're looking for doesn't exist or has been moved.
            </p>
            <Link href="/help-center">
              <Button data-testid="back-to-help">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Help Center
              </Button>
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <Navigation />
      
      <div className="container mx-auto px-4 py-8">
        {/* Breadcrumb Navigation */}
        <nav className="flex items-center space-x-2 text-sm text-muted-foreground mb-8" data-testid="breadcrumb">
          <Link href="/help-center" className="hover:text-primary transition-colors" data-testid="breadcrumb-help">
            Help Center
          </Link>
          <span>/</span>
          <Link href={`/help-center#${categorySlug}`} className="hover:text-primary transition-colors" data-testid="breadcrumb-category">
            {category.title}
          </Link>
          <span>/</span>
          <span className="text-white">{article.title}</span>
        </nav>

        <div className="grid lg:grid-cols-4 gap-8">
          {/* Main Article Content */}
          <div className="lg:col-span-3">
            <Card>
              <CardContent className="pt-8">
                {/* Article Header */}
                <div className="mb-8">
                  <div className="flex flex-wrap items-center gap-4 mb-4">
                    <Badge variant="outline" className={category.color} data-testid="article-category">
                      {category.title}
                    </Badge>
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Clock className="w-4 h-4 mr-1" />
                      <span data-testid="read-time">{article.readTime} read</span>
                    </div>
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Calendar className="w-4 h-4 mr-1" />
                      <span data-testid="last-updated">Updated {article.lastUpdated}</span>
                    </div>
                  </div>
                  
                  <h1 className="text-3xl md:text-4xl font-bold text-white mb-4" data-testid="article-title">
                    {article.title}
                  </h1>
                  
                  <p className="text-lg text-muted-foreground" data-testid="article-summary">
                    {article.summary}
                  </p>
                </div>

                <Separator className="mb-8" />

                {/* Article Sections */}
                <div className="prose prose-invert max-w-none">
                  {article.sections.map((section, index) => (
                    <section key={index} className="mb-8" data-testid={`section-${index}`}>
                      <h2 className="text-2xl font-semibold text-white mb-4">
                        {section.heading}
                      </h2>
                      
                      {/* Paragraphs */}
                      {section.paragraphs.map((paragraph, pIndex) => (
                        <p key={pIndex} className="text-muted-foreground mb-4 leading-relaxed">
                          {paragraph}
                        </p>
                      ))}

                      {/* Lists */}
                      {section.list && (
                        <ul className="list-disc list-inside text-muted-foreground mb-4 space-y-2">
                          {section.list.map((item, lIndex) => (
                            <li key={lIndex} className="flex items-start">
                              <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      )}

                      {/* Tips */}
                      {section.tips && (
                        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 mb-4">
                          <div className="flex items-center mb-2">
                            <Lightbulb className="w-5 h-5 text-blue-400 mr-2" />
                            <h4 className="font-medium text-blue-400">Pro Tips</h4>
                          </div>
                          <ul className="space-y-1">
                            {section.tips.map((tip, tIndex) => (
                              <li key={tIndex} className="text-sm text-blue-200 flex items-start">
                                <span className="w-2 h-2 bg-blue-400 rounded-full mr-2 mt-2 flex-shrink-0"></span>
                                {tip}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Warning */}
                      {section.warning && (
                        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 mb-4">
                          <div className="flex items-start">
                            <AlertTriangle className="w-5 h-5 text-yellow-400 mr-3 mt-0.5 flex-shrink-0" />
                            <div>
                              <h4 className="font-medium text-yellow-400 mb-1">Important Warning</h4>
                              <p className="text-yellow-200 text-sm">{section.warning}</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </section>
                  ))}
                </div>

                {/* Related Articles */}
                {article.relatedArticles && article.relatedArticles.length > 0 && (
                  <div className="mt-12 pt-8 border-t border-border">
                    <h3 className="text-xl font-semibold text-white mb-4">Related Articles</h3>
                    <div className="grid md:grid-cols-2 gap-4">
                      {article.relatedArticles.slice(0, 4).map((relatedSlug, index) => {
                        // Find the actual article by slug
                        const relatedArticle = helpArticles.find(a => a.slug === relatedSlug);
                        if (!relatedArticle) return null;
                        
                        return (
                          <Link 
                            key={relatedSlug} 
                            href={`/help/${relatedArticle.categorySlug}/${relatedArticle.slug}`}
                            className="block"
                            data-testid={`related-article-main-${index}`}
                          >
                            <div className="flex items-center p-3 bg-muted/5 rounded-lg hover:bg-muted/10 transition-colors cursor-pointer">
                              <ExternalLink className="w-4 h-4 text-primary mr-3 flex-shrink-0" />
                              <div className="flex-1">
                                <span className="text-sm font-medium text-white hover:text-primary transition-colors">
                                  {relatedArticle.title}
                                </span>
                                <div className="flex items-center text-xs text-muted-foreground mt-1">
                                  <Clock className="w-3 h-3 mr-1" />
                                  {relatedArticle.readTime}
                                </div>
                              </div>
                            </div>
                          </Link>
                        );
                      }).filter(Boolean)}
                    </div>
                  </div>
                )}

                {/* Navigation */}
                <div className="mt-12 pt-8 border-t border-border flex justify-between items-center">
                  <Link href="/help-center">
                    <Button variant="outline" data-testid="back-to-help-center">
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Back to Help Center
                    </Button>
                  </Link>
                  
                  <div className="text-sm text-muted-foreground">
                    Was this article helpful?
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <Card className="sticky top-4">
              <CardContent className="pt-6">
                <h3 className="font-semibold text-white mb-4">More in {category.title}</h3>
                <div className="space-y-3">
                  {relatedArticles.map((related, index) => (
                    <Link 
                      key={related.slug} 
                      href={`/help/${related.categorySlug}/${related.slug}`}
                      className="block"
                      data-testid={`related-article-${index}`}
                    >
                      <div className="p-3 bg-muted/5 rounded-lg hover:bg-muted/10 transition-colors cursor-pointer">
                        <h4 className="text-sm font-medium text-white mb-1 line-clamp-2">
                          {related.title}
                        </h4>
                        <div className="flex items-center text-xs text-muted-foreground">
                          <Clock className="w-3 h-3 mr-1" />
                          {related.readTime}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>

                <Separator className="my-6" />

                <div>
                  <h4 className="font-medium text-white mb-3">Need More Help?</h4>
                  <Link href="/help-center#contact">
                    <Button variant="outline" size="sm" className="w-full" data-testid="contact-support-sidebar">
                      Contact Support
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}