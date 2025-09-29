import { Coins, MessageCircle } from "lucide-react";
import logoImage from "@assets/rwapawnshop-logo-1_1759111692507.png";
import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import ChatPopup from "@/components/chat-popup";

export default function Footer() {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const footerLinks = {
    platform: [
      { label: "How it Works", href: "/how-it-works" },
      { label: "Security", href: "/security" },
      { label: "Fees", href: "/fees" },
      { label: "API Docs", href: "/api-docs" },
    ],
    support: [
      { label: "Help Center", href: "/help-center" },
      { label: "Contact Us", href: "/contact-us" },
      { label: "Whitepaper", href: "/whitepaper" },
      { label: "Buy RWAPAWN", href: "/token" },
    ],
    legal: [
      { label: "Terms of Service", href: "/terms-of-service" },
      { label: "Privacy Policy", href: "/privacy-policy" },
      { label: "Risk Disclosure", href: "/risk-disclosure" },
      { label: "Compliance", href: "/compliance" },
    ],
  };

  return (
    <footer className="border-t border-border py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
          {/* Legal Links */}
          <div>
            <h3 className="font-semibold mb-3 sm:mb-4 text-sm sm:text-base">Legal</h3>
            <ul className="space-y-2 text-xs sm:text-sm text-muted-foreground">
              {footerLinks.legal.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="hover:text-foreground transition-colors block py-1"
                    data-testid={`footer-link-${link.label.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Platform Links */}
          <div>
            <h3 className="font-semibold mb-3 sm:mb-4 text-sm sm:text-base">Platform</h3>
            <ul className="space-y-2 text-xs sm:text-sm text-muted-foreground">
              {footerLinks.platform.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="hover:text-foreground transition-colors block py-1"
                    data-testid={`footer-link-${link.label.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Support Links */}
          <div>
            <h3 className="font-semibold mb-3 sm:mb-4 text-sm sm:text-base">Support</h3>
            <ul className="space-y-2 text-xs sm:text-sm text-muted-foreground">
              {footerLinks.support.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="hover:text-foreground transition-colors block py-1"
                    data-testid={`footer-link-${link.label.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Brand */}
          <div className="sm:col-span-2 lg:col-span-1 mb-6 sm:mb-0">
            <div className="mb-3 sm:mb-4">
              <Link href="/">
                <img 
                  src={logoImage} 
                  alt="RWA Pawnshop on the ICP Blockchain. Pawn Your Real World Assets" 
                  className="h-10 w-auto sm:h-12 object-contain cursor-pointer hover:opacity-80 transition-opacity"
                />
              </Link>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground">RWAPAWN is the worlds first Real World Assets Pawnshop on the ICP Blockchain. Once approved, receive up to 70% of your asset's value as an instant ICP loan directly to your connected wallet. Get immediate access to funds without selling your valuable assets.</p>
          </div>
        </div>

        <div className="flex justify-center mt-8 mb-6">
          <Button 
            variant="outline" 
            size="sm"
            className="inline-flex items-center space-x-2 bg-white text-black border-2 border-black hover:bg-gray-50 hover:text-red-500" 
            onClick={() => setIsChatOpen(true)}
            data-testid="footer-live-chat"
          >
            <MessageCircle className="w-4 h-4 text-black hover:text-red-500" />
            <span>Start Live Chat</span>
          </Button>
        </div>

        <div className="border-t border-border pt-8 text-center text-sm text-muted-foreground">
          <p>&copy; 2025 ICP RWA Pawn. All rights reserved. Powered by Internet Computer Protocol.</p>
        </div>
      </div>
      
      <ChatPopup isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
    </footer>
  );
}
