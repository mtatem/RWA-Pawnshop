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
      { label: "Discord", href: "#" },
      { label: "Twitter", href: "#" },
    ],
    legal: [
      { label: "Terms of Service", href: "/terms-of-service" },
      { label: "Privacy Policy", href: "/privacy-policy" },
      { label: "Risk Disclosure", href: "/risk-disclosure" },
      { label: "Compliance", href: "/compliance" },
    ],
  };

  return (
    <footer className="border-t border-border py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <Coins className="text-primary text-xl" />
              <span className="text-lg font-bold">ICP RWA Pawn</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Decentralized pawning platform for real world assets on the Internet Computer Protocol.
            </p>
          </div>

          {/* Platform Links */}
          <div>
            <h3 className="font-semibold mb-4">Platform</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {footerLinks.platform.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="hover:text-foreground transition-colors"
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
            <h3 className="font-semibold mb-4">Support</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {footerLinks.support.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="hover:text-foreground transition-colors"
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
            <h3 className="font-semibold mb-4">Legal</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {footerLinks.legal.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="hover:text-foreground transition-colors"
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
