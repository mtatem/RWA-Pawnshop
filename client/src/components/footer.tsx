import { Coins } from "lucide-react";

export default function Footer() {
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
          {/* Brand */}
          <div className="sm:col-span-2 lg:col-span-1 mb-6 sm:mb-0">
            <div className="flex items-center space-x-2 mb-3 sm:mb-4">
              <Coins className="text-primary text-lg sm:text-xl" />
              <span className="text-base sm:text-lg font-bold">ICP RWA Pawn</span>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Decentralized pawning platform for real world assets on the Internet Computer Protocol.
            </p>
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
        </div>

        <div className="border-t border-border mt-8 pt-8 text-center text-sm text-muted-foreground">
          <p>&copy; 2025 ICP RWA Pawn. All rights reserved. Powered by Internet Computer Protocol.</p>
        </div>
      </div>
    </footer>
  );
}
