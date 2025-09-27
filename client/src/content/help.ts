export interface HelpSection {
  heading: string;
  paragraphs: string[];
  tips?: string[];
  list?: string[];
  warning?: string;
}

export interface HelpArticle {
  id: string;
  slug: string;
  title: string;
  category: string;
  categorySlug: string;
  summary: string;
  readTime: string;
  sections: HelpSection[];
  relatedArticles?: string[];
  lastUpdated: string;
}

export interface HelpCategory {
  id: string;
  slug: string;
  title: string;
  description: string;
  articleCount: number;
  color: string;
  icon: string;
}

export const helpCategories: HelpCategory[] = [
  {
    id: "getting-started",
    slug: "getting-started",
    title: "Getting Started",
    description: "Complete guide to setting up your account and making your first pawn",
    articleCount: 8,
    color: "bg-blue-500/10 text-blue-600",
    icon: "HelpCircle"
  },
  {
    id: "asset-submission",
    slug: "asset-submission", 
    title: "Asset Submission",
    description: "Everything about submitting, documenting, and managing your assets",
    articleCount: 12,
    color: "bg-green-500/10 text-green-600",
    icon: "Coins"
  },
  {
    id: "security-verification",
    slug: "security-verification",
    title: "Security & Verification", 
    description: "Keep your account secure and complete identity verification",
    articleCount: 9,
    color: "bg-purple-500/10 text-purple-600",
    icon: "Shield"
  },
  {
    id: "cross-chain-bridge",
    slug: "cross-chain-bridge",
    title: "Cross-Chain Bridge",
    description: "Convert between ETH/USDC and ICP using our secure bridge", 
    articleCount: 7,
    color: "bg-orange-500/10 text-orange-600",
    icon: "ArrowRightLeft"
  },
  {
    id: "loans-repayment",
    slug: "loans-repayment",
    title: "Loans & Repayment",
    description: "Managing active loans, repayments, and loan extensions",
    articleCount: 10,
    color: "bg-red-500/10 text-red-600",
    icon: "Settings"
  },
  {
    id: "troubleshooting",
    slug: "troubleshooting",
    title: "Troubleshooting",
    description: "Solutions to common issues and technical problems",
    articleCount: 14,
    color: "bg-yellow-500/10 text-yellow-600",
    icon: "MessageCircle"
  }
];

export const helpArticles: HelpArticle[] = [
  // Getting Started Articles
  {
    id: "creating-account",
    slug: "creating-account",
    title: "Creating Your RWA Pawn Account",
    category: "Getting Started",
    categorySlug: "getting-started",
    summary: "Step-by-step guide to setting up your account and getting started with RWA pawning",
    readTime: "5 min",
    lastUpdated: "2024-09-27",
    sections: [
      {
        heading: "Account Registration",
        paragraphs: [
          "Creating an account on ICP RWA Pawn is simple and secure. You'll need a valid email address and either an ICP wallet connection or traditional login credentials.",
          "Start by visiting our registration page and choosing your preferred signup method. We support both email/password registration and direct wallet connection for a seamless Web3 experience."
        ],
        tips: [
          "Use a strong, unique password if choosing email registration",
          "Keep your recovery information safe and accessible",
          "Verify your email address immediately to unlock all features"
        ]
      },
      {
        heading: "Identity Verification (KYC)",
        paragraphs: [
          "To comply with regulations and ensure platform security, all users must complete identity verification. This process typically takes 24-48 hours.",
          "You'll need to provide a government-issued ID and proof of address. Our secure OCR system automatically processes and verifies your documents."
        ],
        list: [
          "Valid government-issued photo ID (passport, driver's license, or national ID)",
          "Recent utility bill or bank statement showing your address",
          "Clear, well-lit photos with all text readable"
        ]
      },
      {
        heading: "Account Security Setup",
        paragraphs: [
          "Securing your account is crucial when dealing with valuable assets. We strongly recommend enabling two-factor authentication (2FA) immediately after registration.",
          "Choose from authenticator apps like Google Authenticator, Authy, or 1Password for the highest security level."
        ],
        warning: "Never share your login credentials or 2FA codes with anyone. Our support team will never ask for this information."
      }
    ],
    relatedArticles: ["connecting-wallet", "kyc-process", "two-factor-auth"]
  },
  {
    id: "connecting-wallet", 
    slug: "connecting-wallet",
    title: "Connecting Your ICP Wallet",
    category: "Getting Started",
    categorySlug: "getting-started", 
    summary: "Learn how to connect Internet Identity and Plug Wallet to your account",
    readTime: "7 min",
    lastUpdated: "2024-09-27",
    sections: [
      {
        heading: "Supported Wallets",
        paragraphs: [
          "ICP RWA Pawn supports the two most popular ICP wallets: Internet Identity and Plug Wallet. Both provide secure, decentralized authentication.",
          "Internet Identity offers the highest security with biometric authentication, while Plug Wallet provides a familiar browser extension experience."
        ]
      },
      {
        heading: "Connecting Internet Identity",
        paragraphs: [
          "Internet Identity uses advanced cryptography and device-based authentication to secure your account without passwords.",
          "Click 'Connect Internet Identity' on our login page, then follow the prompts to create or connect your existing Internet Identity anchor."
        ],
        list: [
          "Visit identity.ic0.app to create an anchor if you don't have one",
          "Use a security key, biometric authentication, or secure device",
          "Your anchor number is your unique identifier - keep it safe"
        ]
      },
      {
        heading: "Using Plug Wallet",
        paragraphs: [
          "Plug Wallet is a browser extension that makes ICP transactions simple and secure. Install it from the official Chrome Web Store or Firefox Add-ons.",
          "After installation, create a new wallet or import an existing seed phrase, then connect it to our platform."
        ],
        tips: [
          "Always download Plug Wallet from official sources only",
          "Back up your seed phrase in a secure location", 
          "Never share your seed phrase with anyone"
        ]
      },
      {
        heading: "Wallet Security Best Practices",
        paragraphs: [
          "Your wallet contains the keys to your digital assets. Following security best practices protects both your funds and your pawned assets.",
          "Regularly update your wallet software, use strong device security, and be cautious of phishing attempts."
        ],
        warning: "Always verify you're on the correct website (rwa-pawn.com) before connecting your wallet."
      }
    ],
    relatedArticles: ["creating-account", "wallet-security", "transaction-issues"]
  },
  {
    id: "loan-terms",
    slug: "loan-terms", 
    title: "Understanding Loan Terms and Interest Rates",
    category: "Getting Started",
    categorySlug: "getting-started",
    summary: "Complete breakdown of loan terms, interest rates, and repayment options", 
    readTime: "10 min",
    lastUpdated: "2024-09-27",
    sections: [
      {
        heading: "Loan Basics",
        paragraphs: [
          "ICP RWA Pawn offers asset-backed loans with competitive rates and flexible terms. Loans are collateralized by your real-world assets, providing instant liquidity.",
          "Loan amounts are determined by professional appraisal and typically range from 40-70% of your asset's verified market value."
        ]
      },
      {
        heading: "Interest Rates and Fees",
        paragraphs: [
          "Our standard interest rate is 8.5% APR, calculated monthly. This competitive rate reflects the secured nature of asset-backed lending.",
          "Additional fees include a 2 ICP platform fee for asset submission and 0.5% for cross-chain bridge transactions when applicable."
        ],
        list: [
          "8.5% APR interest rate on all loans",
          "2 ICP platform fee for asset submission",
          "0.5% bridge fee for cross-chain transactions",
          "1% fee for loan extensions (per 30-day period)",
          "Express processing available for 1 ICP"
        ]
      },
      {
        heading: "Loan Terms and Repayment",
        paragraphs: [
          "Standard loan terms are 90 days with flexible repayment options. You can make partial payments, pay early for discounts, or extend your loan if needed.",
          "Early repayment discounts encourage quick repayment and can save you significant interest costs."
        ],
        tips: [
          "Pay early to receive up to 2% discount on interest",
          "Set up payment reminders to avoid missing deadlines",
          "Contact support if you need help with repayment planning"
        ]
      },
      {
        heading: "What Happens at Loan Expiry",
        paragraphs: [
          "If your loan isn't repaid within the 90-day term, your asset becomes forfeit and will be listed on our marketplace.",
          "This process is automatic and irreversible, so plan your repayment carefully and consider loan extensions if needed."
        ],
        warning: "Assets become permanently forfeit after loan expiry. Extensions must be requested before your loan expires."
      }
    ],
    relatedArticles: ["loan-repayment", "loan-extensions", "marketplace-process"]
  },
  {
    id: "dashboard-navigation",
    slug: "dashboard-navigation",
    title: "Platform Overview: Dashboard Navigation", 
    category: "Getting Started",
    categorySlug: "getting-started",
    summary: "Navigate your dashboard and understand all available features and tools",
    readTime: "6 min",
    lastUpdated: "2024-09-27",
    sections: [
      {
        heading: "Dashboard Overview",
        paragraphs: [
          "Your dashboard is the command center for all your pawn activities. Here you can submit new assets, monitor active loans, track submissions, and access all platform features.",
          "The dashboard is organized into clear sections for easy navigation and quick access to your most important information."
        ]
      },
      {
        heading: "Main Navigation Sections",
        paragraphs: [
          "The main navigation includes Dashboard, Submit Asset, Marketplace, Bridge, Profile, and Help sections.",
          "Each section provides specific functionality designed to streamline your experience and keep you informed about your assets and loans."
        ],
        list: [
          "Dashboard - Overview of active loans and recent activity",
          "Submit Asset - Start new pawn submissions",
          "Marketplace - Browse and bid on available assets", 
          "Bridge - Convert between ETH/USDC and ICP",
          "Profile - Manage account settings and security",
          "Help Center - Access guides and support resources"
        ]
      },
      {
        heading: "Quick Actions and Status Cards",
        paragraphs: [
          "Your dashboard displays quick action cards for common tasks and status summaries for all your active engagements.",
          "Status cards show real-time information about submission progress, loan balances, and upcoming payment deadlines."
        ]
      },
      {
        heading: "Notifications and Alerts",
        paragraphs: [
          "Important notifications appear in your dashboard to keep you informed about submission updates, payment reminders, and marketplace activities.",
          "Configure notification preferences in your profile settings to receive alerts via email or in-app notifications."
        ],
        tips: [
          "Check your dashboard daily for important updates",
          "Use quick actions to save time on common tasks",
          "Set up email notifications for payment reminders"
        ]
      }
    ],
    relatedArticles: ["first-submission", "loan-management", "profile-settings"]
  },
  {
    id: "first-submission",
    slug: "first-submission",
    title: "Your First Asset Submission - Step by Step",
    category: "Getting Started", 
    categorySlug: "getting-started",
    summary: "Complete walkthrough of submitting your first asset for pawn loan approval",
    readTime: "8 min",
    lastUpdated: "2024-09-27",
    sections: [
      {
        heading: "Before You Start",
        paragraphs: [
          "Ensure your account is fully verified and you have completed KYC before submitting assets. Have your asset documentation ready, including certificates of authenticity if applicable.",
          "Review our asset guidelines to confirm your item meets our acceptance criteria and prepare high-quality photos."
        ],
        list: [
          "Complete account verification and KYC",
          "Gather all relevant documentation",
          "Take clear, well-lit photos from multiple angles",
          "Research your asset's current market value",
          "Have 2 ICP available for the submission fee"
        ]
      },
      {
        heading: "Step 1: Asset Information",
        paragraphs: [
          "Start by selecting your asset category and providing detailed information. Accuracy is crucial for proper valuation and faster processing.",
          "Include brand, model, year, condition, and any unique characteristics that affect value."
        ]
      },
      {
        heading: "Step 2: Documentation Upload", 
        paragraphs: [
          "Upload all required documents including certificates of authenticity, purchase receipts, and insurance appraisals if available.",
          "Our system accepts PDF, JPG, and PNG files up to 10MB each. Ensure all text is clearly readable."
        ],
        tips: [
          "Scan documents at high resolution for best results",
          "Include purchase receipts to verify provenance",
          "Certificate of authenticity greatly speeds approval"
        ]
      },
      {
        heading: "Step 3: Photography",
        paragraphs: [
          "Take multiple high-resolution photos showing your asset from all angles. Include close-ups of any serial numbers, signatures, or identifying marks.",
          "Good lighting and clear focus are essential for accurate assessment. Avoid shadows and reflections that obscure details."
        ]
      },
      {
        heading: "Step 4: Review and Submit",
        paragraphs: [
          "Review all information for accuracy before final submission. Once submitted, you cannot modify your application during the review process.",
          "Pay the 2 ICP submission fee to begin professional review. Standard processing takes 24-48 hours."
        ],
        warning: "Double-check all information before submitting. Inaccurate information can delay approval or result in rejection."
      }
    ],
    relatedArticles: ["asset-documentation", "photography-guidelines", "submission-status"]
  },
  {
    id: "loan-agreement",
    slug: "loan-agreement",
    title: "Reading Your Loan Agreement",
    category: "Getting Started",
    categorySlug: "getting-started", 
    summary: "Understand all terms and conditions in your loan agreement before accepting",
    readTime: "7 min",
    lastUpdated: "2024-09-27",
    sections: [
      {
        heading: "Loan Agreement Basics",
        paragraphs: [
          "Your loan agreement contains all terms and conditions for your asset-backed loan. Read carefully before accepting to understand your rights and obligations.",
          "The agreement is legally binding and outlines loan amount, interest rate, repayment terms, and consequences of default."
        ]
      },
      {
        heading: "Key Terms to Understand",
        paragraphs: [
          "Principal amount is the cash you receive, typically 40-70% of your asset's appraised value. Interest accrues daily at the stated APR.",
          "The maturity date is when full repayment is due. Late payments may trigger additional fees and eventual asset forfeiture."
        ],
        list: [
          "Principal Amount - The loan amount you receive",
          "Interest Rate - 8.5% APR calculated monthly", 
          "Term Length - Standard 90-day repayment period",
          "Maturity Date - Final repayment deadline",
          "Collateral Description - Detailed asset information",
          "Default Conditions - What triggers asset forfeiture"
        ]
      },
      {
        heading: "Repayment Options",
        paragraphs: [
          "You can repay your loan in full at any time, make partial payments, or extend the loan term for additional fees.",
          "Early repayment often qualifies for interest discounts, while extensions require payment of extension fees."
        ]
      },
      {
        heading: "Default and Asset Forfeiture",
        paragraphs: [
          "If you fail to repay or extend your loan by the maturity date, your asset becomes forfeit and will be sold on our marketplace.",
          "This process is automatic and irreversible. Plan ahead and contact support if you anticipate repayment difficulties."
        ],
        warning: "Asset forfeiture is permanent and cannot be reversed after the maturity date passes."
      }
    ],
    relatedArticles: ["loan-terms", "repayment-options", "loan-extensions"]
  },
  {
    id: "two-factor-auth",
    slug: "two-factor-auth",
    title: "Setting Up Two-Factor Authentication",
    category: "Getting Started",
    categorySlug: "getting-started",
    summary: "Secure your account with two-factor authentication for maximum protection",
    readTime: "5 min", 
    lastUpdated: "2024-09-27",
    sections: [
      {
        heading: "Why Use Two-Factor Authentication",
        paragraphs: [
          "Two-factor authentication (2FA) adds an essential security layer to protect your account and valuable assets from unauthorized access.",
          "Even if someone obtains your password, they cannot access your account without the second authentication factor from your device."
        ]
      },
      {
        heading: "Supported Authenticator Apps",
        paragraphs: [
          "We support all standard Time-based One-Time Password (TOTP) authenticator apps including Google Authenticator, Authy, 1Password, and Microsoft Authenticator.",
          "Choose an authenticator app that syncs across your devices for convenient access while maintaining security."
        ],
        list: [
          "Google Authenticator - Simple and widely used",
          "Authy - Cloud backup and multi-device sync",
          "1Password - Integrated with password manager",
          "Microsoft Authenticator - Enterprise features",
          "Any TOTP-compatible authenticator app"
        ]
      },
      {
        heading: "Setup Process",
        paragraphs: [
          "Navigate to Security Settings in your profile and click 'Enable Two-Factor Authentication'. Scan the QR code with your authenticator app.",
          "Enter the 6-digit code from your app to verify setup. Save your backup codes in a secure location."
        ],
        tips: [
          "Test your 2FA setup immediately after enabling",
          "Store backup codes separately from your devices",
          "Consider using multiple authenticator apps for redundancy"
        ]
      },
      {
        heading: "Account Recovery",
        paragraphs: [
          "If you lose access to your authenticator app, use your backup codes to regain account access. Each backup code can only be used once.",
          "Contact support if you lose both your authenticator and backup codes. Additional verification may be required for security."
        ],
        warning: "Store backup codes securely offline. You cannot access your account without them if you lose your authenticator device."
      }
    ],
    relatedArticles: ["account-security", "password-security", "account-recovery"]
  },
  {
    id: "account-verification",
    slug: "account-verification", 
    title: "Account Verification Requirements",
    category: "Getting Started",
    categorySlug: "getting-started",
    summary: "Complete guide to account verification and KYC compliance requirements",
    readTime: "6 min",
    lastUpdated: "2024-09-27",
    sections: [
      {
        heading: "Verification Overview",
        paragraphs: [
          "Account verification ensures platform security and regulatory compliance. All users must complete Know Your Customer (KYC) verification before submitting assets.",
          "The process typically takes 24-48 hours and requires government-issued identification and proof of address."
        ]
      },
      {
        heading: "Required Documents",
        paragraphs: [
          "You'll need a valid government-issued photo ID and recent proof of address. Documents must be current, clearly readable, and issued within specified timeframes.",
          "Our automated system processes most verifications quickly, but complex cases may require manual review."
        ],
        list: [
          "Government-issued photo ID (passport, driver's license, national ID)",
          "Utility bill, bank statement, or lease agreement (within 90 days)",
          "Clear, well-lit photos with all text readable",
          "Matching name and address information"
        ]
      },
      {
        heading: "Photo Requirements",
        paragraphs: [
          "Take photos in good lighting with all text clearly visible. Avoid glare, shadows, or obstructions that make text unreadable.",
          "Include the full document in frame with all four corners visible. Multiple photos may be needed for double-sided documents."
        ],
        tips: [
          "Use natural light or bright indoor lighting",
          "Hold camera steady and avoid blurriness",
          "Ensure all text and photos are clearly readable",
          "Take separate photos for front and back of documents"
        ]
      },
      {
        heading: "Verification Status",
        paragraphs: [
          "Track your verification status in the Profile section. You'll receive email notifications about status updates and any additional requirements.",
          "Most verifications complete automatically within hours. Complex cases requiring manual review may take up to 48 hours."
        ],
        warning: "Submitting false or altered documents is prohibited and will result in permanent account suspension."
      }
    ],
    relatedArticles: ["kyc-process", "document-security", "account-recovery"]
  },

  // Asset Submission Articles
  {
    id: "acceptable-assets",
    slug: "acceptable-assets",
    title: "Acceptable Asset Types and Categories",
    category: "Asset Submission",
    categorySlug: "asset-submission",
    summary: "Learn which assets we accept and how different categories are evaluated",
    readTime: "4 min",
    lastUpdated: "2024-09-27",
    sections: [
      {
        heading: "Accepted Asset Categories",
        paragraphs: [
          "ICP RWA Pawn accepts a wide range of valuable assets including jewelry, watches, art, collectibles, precious metals, and electronics.",
          "Each category has specific requirements for documentation, condition assessment, and valuation methodology."
        ],
        list: [
          "Fine Jewelry - Diamonds, precious stones, gold, silver, platinum",
          "Luxury Watches - Swiss brands, limited editions, vintage timepieces",
          "Art & Antiques - Paintings, sculptures, authenticated artwork",
          "Collectibles - Coins, stamps, trading cards, memorabilia",
          "Precious Metals - Bullion, bars, certified precious metal items",
          "Electronics - High-value cameras, audio equipment, computers"
        ]
      },
      {
        heading: "Minimum Value Requirements",
        paragraphs: [
          "Assets must have a minimum appraised value of $500 USD to qualify for pawning. Higher value items receive priority processing and better loan terms.",
          "We focus on assets with established markets and reliable valuation methods to ensure fair pricing and successful outcomes."
        ]
      },
      {
        heading: "Items We Cannot Accept",
        paragraphs: [
          "For legal and practical reasons, we cannot accept certain items including weapons, hazardous materials, perishables, or items without clear ownership.",
          "Stolen, counterfeit, or questionably obtained items are strictly prohibited and may result in account suspension."
        ],
        list: [
          "Weapons or military equipment",
          "Hazardous or toxic materials", 
          "Perishable or organic items",
          "Items without clear ownership documentation",
          "Suspected stolen or counterfeit goods",
          "Items under $500 USD in value"
        ],
        warning: "Submitting prohibited items or stolen goods will result in immediate account suspension and possible legal action."
      },
      {
        heading: "Special Considerations",
        paragraphs: [
          "Some items require additional documentation or specialized handling. Rare or unique items may need expert appraisal or extended processing time.",
          "Contact our support team before submitting unusual or exceptionally valuable items to ensure proper handling."
        ]
      }
    ],
    relatedArticles: ["asset-documentation", "valuation-process", "submission-guidelines"]
  },
  {
    id: "asset-documentation",
    slug: "asset-documentation",
    title: "Required Documentation for Different Assets",
    category: "Asset Submission",
    categorySlug: "asset-submission",
    summary: "Comprehensive guide to documentation requirements for each asset category",
    readTime: "12 min",
    lastUpdated: "2024-09-27",
    sections: [
      {
        heading: "Universal Documentation Requirements",
        paragraphs: [
          "All assets require basic documentation including proof of ownership, detailed descriptions, and high-quality photographs from multiple angles.",
          "Additional category-specific documentation may be required based on your asset type and value."
        ],
        list: [
          "Proof of ownership (purchase receipt, inheritance documents, gift documentation)",
          "Detailed written description including dimensions, weight, materials",
          "Multiple high-resolution photographs",
          "Any existing appraisals or insurance valuations",
          "Certificates of authenticity when applicable"
        ]
      },
      {
        heading: "Jewelry Documentation",
        paragraphs: [
          "Jewelry requires detailed documentation of materials, stones, and craftsmanship. Include any gemological certificates or appraisals.",
          "Document any designer marks, hallmarks, or signatures that establish authenticity and value."
        ],
        list: [
          "GIA, AGS, or other gemological certificates for diamonds",
          "Precious metal hallmarks and purity documentation",
          "Designer authentication certificates",
          "Previous insurance appraisals",
          "Close-up photos of stamps, signatures, and markings"
        ]
      },
      {
        heading: "Watch Documentation",
        paragraphs: [
          "Luxury watches require extensive documentation including service records, warranty cards, and original packaging when available.",
          "Serial numbers, model references, and movement details help establish authenticity and value."
        ],
        list: [
          "Original warranty cards and certificates",
          "Service records and maintenance history",
          "Original box and papers",
          "Serial number and model reference photos",
          "Movement photos showing manufacturer markings"
        ]
      },
      {
        heading: "Art and Collectibles",
        paragraphs: [
          "Art requires provenance documentation showing ownership history and authenticity. Museum or gallery documentation adds significant value.",
          "Collectibles need authentication from recognized grading services or expert authentication."
        ],
        list: [
          "Provenance documentation and ownership history",
          "Artist signatures and authentication certificates",
          "Museum or gallery exhibition records",
          "Professional grading service certifications",
          "Condition reports from conservators"
        ]
      },
      {
        heading: "Electronics and Equipment",
        paragraphs: [
          "Electronic items require proof of working condition, original packaging, and any warranty information.",
          "Include serial numbers, model specifications, and any professional calibration certificates."
        ],
        tips: [
          "Include all original accessories and cables",
          "Document any modifications or upgrades",
          "Provide proof of working condition with test photos/videos"
        ]
      }
    ],
    relatedArticles: ["photography-guidelines", "authenticity-certificates", "valuation-process"]
  },
  {
    id: "photography-guidelines",
    slug: "photography-guidelines",
    title: "Photography Guidelines for Asset Submission",
    category: "Asset Submission",
    categorySlug: "asset-submission",
    summary: "Professional tips for photographing your assets to ensure accurate appraisal",
    readTime: "6 min",
    lastUpdated: "2024-09-27",
    sections: [
      {
        heading: "General Photography Principles",
        paragraphs: [
          "High-quality photographs are essential for accurate asset appraisal. Use good lighting, stable camera positioning, and multiple angles to showcase your asset completely.",
          "Clear, detailed photos speed up the review process and help ensure accurate valuation of your items."
        ]
      },
      {
        heading: "Lighting and Environment",
        paragraphs: [
          "Use natural daylight or bright, even artificial lighting. Avoid direct sunlight, shadows, and reflective surfaces that can obscure details.",
          "Photograph against a neutral background like white or gray paper to help your asset stand out clearly."
        ],
        tips: [
          "Take photos near a large window with indirect natural light",
          "Use multiple light sources to eliminate shadows",
          "Avoid overhead lighting that creates harsh shadows",
          "Turn off camera flash to prevent glare and reflections"
        ]
      },
      {
        heading: "Camera Settings and Technique",
        paragraphs: [
          "Use your camera's highest resolution setting and ensure sharp focus on important details. Take multiple shots to ensure at least some are perfectly clear.",
          "Hold the camera steady or use a tripod to avoid blur. Take photos from multiple distances to show both overall appearance and fine details."
        ],
        list: [
          "Use highest resolution camera setting available",
          "Ensure sharp focus on all important details",
          "Take multiple shots from each angle",
          "Include both wide shots and close-up details",
          "Photograph any serial numbers or markings clearly"
        ]
      },
      {
        heading: "Required Angles and Views",
        paragraphs: [
          "Every asset needs photos from multiple angles showing front, back, sides, top, and bottom views when applicable.",
          "Include extreme close-ups of any hallmarks, serial numbers, signatures, or other identifying features."
        ]
      },
      {
        heading: "Category-Specific Photography",
        paragraphs: [
          "Different asset types require specific photographic approaches. Jewelry needs macro shots of stones and settings, while watches need clear movement photos.",
          "Art requires raking light photos to show texture and condition, while electronics need photos of screens, connections, and any damage."
        ],
        warning: "Blurry, dark, or incomplete photos can significantly delay your submission review or result in rejection."
      }
    ],
    relatedArticles: ["asset-documentation", "submission-guidelines", "photo-editing-tips"]
  },

  // More Asset Submission Articles
  {
    id: "authenticity-certificates",
    slug: "authenticity-certificates",
    title: "Certificate of Authenticity Requirements",
    category: "Asset Submission",
    categorySlug: "asset-submission",
    summary: "Understanding when and how to provide certificates of authenticity for your assets",
    readTime: "5 min",
    lastUpdated: "2024-09-27",
    sections: [
      {
        heading: "What is a Certificate of Authenticity?",
        paragraphs: [
          "A Certificate of Authenticity (COA) is an official document that verifies the genuineness of an asset. It's particularly important for art, collectibles, and luxury goods.",
          "COAs provide crucial information about provenance, materials, and expert verification that significantly impacts asset value and loan approval speed."
        ]
      },
      {
        heading: "When COAs are Required",
        paragraphs: [
          "COAs are mandatory for high-value art pieces, designer items, collectibles, and any asset claiming significant brand or artist association.",
          "Without proper authentication, these items may be valued significantly lower or rejected entirely."
        ],
        list: [
          "Original artwork and limited edition prints",
          "Designer handbags, shoes, and accessories",
          "Autographed memorabilia and collectibles",
          "Vintage items claiming specific provenance",
          "High-end watches without original papers"
        ]
      },
      {
        heading: "Accepted Authentication Sources",
        paragraphs: [
          "We accept COAs from recognized industry experts, official brand representatives, and established authentication services.",
          "Third-party authentication services must be widely recognized and have established reputations in their respective fields."
        ]
      }
    ],
    relatedArticles: ["asset-documentation", "valuation-process", "expert-appraisal"]
  },
  {
    id: "valuation-process",
    slug: "valuation-process", 
    title: "Asset Valuation Process Explained",
    category: "Asset Submission",
    categorySlug: "asset-submission",
    summary: "How our expert team determines the fair market value of your assets",
    readTime: "8 min",
    lastUpdated: "2024-09-27",
    sections: [
      {
        heading: "Professional Valuation Standards",
        paragraphs: [
          "Our certified appraisers use industry-standard methodologies to determine fair market value based on current market conditions, condition, rarity, and provenance.",
          "Valuations consider multiple factors including recent sales data, market trends, and asset-specific characteristics."
        ]
      },
      {
        heading: "Valuation Methodology",
        paragraphs: [
          "We research recent comparable sales, consult industry databases, and apply condition adjustments to arrive at current market value.",
          "Different asset categories use specialized valuation approaches appropriate to their specific markets and characteristics."
        ],
        list: [
          "Market research and comparable sales analysis",
          "Condition assessment and adjustment factors",
          "Provenance and authenticity verification",
          "Current market trends and demand analysis",
          "Expert specialist consultation when needed"
        ]
      },
      {
        heading: "Loan-to-Value Ratios",
        paragraphs: [
          "Loan amounts typically range from 40-70% of appraised value depending on asset type, market liquidity, and condition.",
          "More liquid assets with established markets receive higher loan-to-value ratios, while unique or illiquid items receive more conservative ratios."
        ]
      }
    ],
    relatedArticles: ["loan-terms", "asset-categories", "market-analysis"]
  },

  // Security & Verification Articles
  {
    id: "kyc-process",
    slug: "kyc-process",
    title: "Identity Verification (KYC) Process",
    category: "Security & Verification",
    categorySlug: "security-verification",
    summary: "Complete walkthrough of the Know Your Customer verification process",
    readTime: "7 min",
    lastUpdated: "2024-09-27",
    sections: [
      {
        heading: "Why KYC is Required",
        paragraphs: [
          "Know Your Customer (KYC) verification is required by law to prevent money laundering, fraud, and ensure platform security.",
          "KYC protects both the platform and users by verifying identities and maintaining regulatory compliance."
        ]
      },
      {
        heading: "KYC Process Steps",
        paragraphs: [
          "The KYC process involves document upload, identity verification, and address confirmation. Our automated system processes most applications within hours.",
          "You'll need government-issued ID and proof of address. The system guides you through each step with clear instructions."
        ],
        list: [
          "Upload government-issued photo ID",
          "Provide proof of current address",
          "Take a verification selfie",
          "Complete identity questionnaire",
          "Wait for automated verification"
        ]
      },
      {
        heading: "Document Requirements",
        paragraphs: [
          "Upload clear, legible photos of your documents. Ensure all text is readable and photos include all four corners of documents.",
          "Documents must be current and match the name and address information in your account."
        ],
        tips: [
          "Use good lighting and avoid shadows",
          "Ensure all text is clearly readable",
          "Include full document with all corners visible",
          "Use most recent versions of all documents"
        ]
      },
      {
        heading: "Verification Timeline",
        paragraphs: [
          "Most KYC verifications complete automatically within 2-6 hours. Complex cases requiring manual review may take up to 48 hours.",
          "You'll receive email notifications about status updates and any additional requirements."
        ],
        warning: "Providing false or altered documents will result in permanent account suspension."
      }
    ],
    relatedArticles: ["account-verification", "document-security", "identity-protection"]
  },

  // Cross-Chain Bridge Articles
  {
    id: "bridge-eth-to-icp",
    slug: "bridge-eth-to-icp",
    title: "Bridge Transaction Tutorial: ETH to ICP",
    category: "Cross-Chain Bridge",
    categorySlug: "cross-chain-bridge",
    summary: "Step-by-step guide to convert ETH/USDC to ICP using our secure bridge",
    readTime: "10 min",
    lastUpdated: "2024-09-27",
    sections: [
      {
        heading: "Before You Start",
        paragraphs: [
          "Ensure you have MetaMask or another Ethereum-compatible wallet connected and funded with ETH or USDC.",
          "Have your ICP wallet (Internet Identity or Plug) ready to receive the converted funds."
        ],
        list: [
          "MetaMask wallet with ETH/USDC balance",
          "Connected ICP wallet (Internet Identity or Plug)",
          "Sufficient ETH for gas fees",
          "Understanding of bridge fees (0.5%)"
        ]
      },
      {
        heading: "Step 1: Connect Wallets",
        paragraphs: [
          "Navigate to the Bridge section and connect both your Ethereum and ICP wallets.",
          "Verify that both wallets show correct balances before proceeding with the bridge transaction."
        ]
      },
      {
        heading: "Step 2: Set Transaction Details",
        paragraphs: [
          "Select ETH or USDC as your source token and specify the amount to bridge.",
          "Review the conversion rate, bridge fees, and estimated gas costs before confirming."
        ],
        tips: [
          "Start with smaller amounts for your first bridge transaction",
          "Check current gas prices and consider timing",
          "Review all fees and final amounts carefully"
        ]
      },
      {
        heading: "Step 3: Execute Bridge Transaction",
        paragraphs: [
          "Confirm the transaction in MetaMask and wait for Ethereum network confirmation.",
          "The bridge process typically takes 10-30 minutes depending on network congestion."
        ]
      },
      {
        heading: "Step 4: Receive ICP Funds",
        paragraphs: [
          "Your converted funds will appear in your ICP wallet as ckETH or ckUSDC.",
          "You can now use these funds for pawn loans or other platform activities."
        ],
        warning: "Bridge transactions are irreversible once confirmed on the blockchain. Double-check all details before confirming."
      }
    ],
    relatedArticles: ["bridge-icp-to-eth", "bridge-fees", "metamask-setup"]
  },

  // Loans & Repayment Articles  
  {
    id: "loan-repayment",
    slug: "loan-repayment",
    title: "Making Loan Payments and Repayments",
    category: "Loans & Repayment",
    categorySlug: "loans-repayment",
    summary: "Complete guide to making payments and managing your loan repayment",
    readTime: "8 min",
    lastUpdated: "2024-09-27",
    sections: [
      {
        heading: "Payment Methods",
        paragraphs: [
          "Make loan payments using ICP, ckETH, or ckUSDC directly from your connected wallet.",
          "Payments are processed immediately on the ICP network with minimal transaction fees."
        ]
      },
      {
        heading: "Full vs Partial Payments",
        paragraphs: [
          "You can make full repayment at any time or make partial payments to reduce your balance and interest charges.",
          "Partial payments are applied to accrued interest first, then principal balance."
        ],
        list: [
          "Full repayment closes loan and releases asset",
          "Partial payments reduce interest charges",
          "Minimum payment requirements apply",
          "Early repayment discounts available",
          "Payment confirmation sent immediately"
        ]
      },
      {
        heading: "Early Repayment Benefits",
        paragraphs: [
          "Paying off your loan early can qualify you for interest discounts up to 2% depending on timing.",
          "Early repayment also frees up your asset sooner and improves your credit standing for future loans."
        ]
      },
      {
        heading: "Payment Tracking",
        paragraphs: [
          "All payments are tracked in real-time in your dashboard. View payment history, remaining balance, and next due dates.",
          "Set up email reminders to ensure you never miss important payment deadlines."
        ],
        tips: [
          "Set calendar reminders for payment due dates",
          "Make payments a few days early to account for processing",
          "Keep records of all payment confirmations"
        ]
      }
    ],
    relatedArticles: ["loan-extensions", "early-repayment", "payment-plans"]
  },

  // Troubleshooting Articles
  {
    id: "transaction-failed",
    slug: "transaction-failed",
    title: "Transaction Failed: Common Causes and Solutions",
    category: "Troubleshooting",
    categorySlug: "troubleshooting",
    summary: "Diagnose and resolve common transaction failures and blockchain issues",
    readTime: "9 min",
    lastUpdated: "2024-09-27",
    sections: [
      {
        heading: "Common Failure Causes",
        paragraphs: [
          "Transaction failures typically result from insufficient funds, gas estimation errors, network congestion, or wallet connectivity issues.",
          "Understanding the specific error message helps determine the appropriate solution."
        ],
        list: [
          "Insufficient balance for transaction + fees",
          "Gas price too low during network congestion",
          "Wallet connectivity or timeout issues",
          "Network congestion causing timeouts",
          "Invalid transaction parameters"
        ]
      },
      {
        heading: "Ethereum Network Issues",
        paragraphs: [
          "High gas prices during network congestion can cause transaction failures or long delays.",
          "Check current gas prices and consider waiting for lower network activity."
        ],
        tips: [
          "Use gas tracking tools to monitor network fees",
          "Increase gas limit for complex transactions",
          "Try transactions during off-peak hours",
          "Use fast gas price recommendations"
        ]
      },
      {
        heading: "ICP Network Issues",
        paragraphs: [
          "ICP transactions rarely fail but may be delayed during high network activity.",
          "Wallet sync issues can sometimes cause apparent transaction failures."
        ]
      },
      {
        heading: "Resolution Steps",
        paragraphs: [
          "Check your wallet balance, verify network status, and retry with appropriate gas settings.",
          "Contact support if problems persist after trying standard troubleshooting steps."
        ],
        warning: "Never share private keys or seed phrases when seeking transaction help. Support will never ask for this information."
      }
    ],
    relatedArticles: ["wallet-connectivity", "gas-fee-issues", "network-status"]
  },
  {
    id: "wallet-connectivity",
    slug: "wallet-connectivity",
    title: "Wallet Connection Issues",
    category: "Troubleshooting",
    categorySlug: "troubleshooting",
    summary: "Resolve common wallet connection and sync problems",
    readTime: "8 min",
    lastUpdated: "2024-09-27",
    sections: [
      {
        heading: "Common Connection Issues",
        paragraphs: [
          "Wallet connection problems often stem from browser extensions, network settings, or wallet configuration issues.",
          "Most connection issues can be resolved by refreshing the browser, clearing cache, or reconnecting your wallet."
        ]
      },
      {
        heading: "Internet Identity Issues",
        paragraphs: [
          "Internet Identity connection problems may be caused by browser compatibility, device security settings, or anchor configuration issues.",
          "Ensure your browser supports WebAuthn and has the latest security updates installed."
        ],
        list: [
          "Clear browser cache and cookies",
          "Update browser to latest version",
          "Check device security settings",
          "Verify anchor number accuracy",
          "Try alternative authentication method"
        ]
      },
      {
        heading: "Plug Wallet Issues",
        paragraphs: [
          "Plug Wallet connection issues often involve extension conflicts, outdated versions, or network connectivity problems.",
          "Keep your Plug Wallet extension updated and check for browser compatibility issues."
        ],
        tips: [
          "Update Plug Wallet to latest version",
          "Disable conflicting browser extensions",
          "Check network connectivity",
          "Clear extension data if needed"
        ]
      },
      {
        heading: "MetaMask and Ethereum Wallets",
        paragraphs: [
          "MetaMask connection issues may involve network configuration, RPC endpoint problems, or transaction queue conflicts.",
          "Ensure you're connected to the correct network and have sufficient ETH for gas fees."
        ]
      }
    ],
    relatedArticles: ["connecting-wallet", "network-settings", "browser-compatibility"]
  }
];

// Helper function to get article by slug
export function getArticleBySlug(categorySlug: string, articleSlug: string): HelpArticle | undefined {
  return helpArticles.find(article => 
    article.categorySlug === categorySlug && article.slug === articleSlug
  );
}

// Helper function to get articles by category
export function getArticlesByCategory(categorySlug: string): HelpArticle[] {
  return helpArticles.filter(article => article.categorySlug === categorySlug);
}

// Helper function to get category by slug
export function getCategoryBySlug(slug: string): HelpCategory | undefined {
  return helpCategories.find(category => category.slug === slug);
}

// Popular articles (most read)
export const popularArticles = [
  "first-submission",
  "asset-documentation", 
  "loan-terms",
  "connecting-wallet",
  "kyc-process",
  "loan-repayment",
  "acceptable-assets",
  "photography-guidelines"
];