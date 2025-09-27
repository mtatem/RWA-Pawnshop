import OpenAI from "openai";

// Using OpenAI's API, which points to OpenAI's API servers and requires your own API key.
// The newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface ChatResponse {
  message: string;
  success: boolean;
  error?: string;
}

const SYSTEM_PROMPT = `You are a helpful customer support assistant for RWAPAWN (rwapawn.io), a decentralized Real World Asset (RWA) pawning platform built on the Internet Computer Protocol (ICP). 

Key platform information:
- Users can pawn real-world assets (jewelry, watches, art, collectibles, etc.) for cryptocurrency loans
- Platform accepts various assets with proper documentation and certificates of authenticity
- Verification typically takes 24-48 hours (express processing available for 1 ICP fee)
- Users receive up to 70% of asset value as instant ICP loans
- 90-day loan terms with 8.5% APR interest
- 2 ICP platform fee for asset submission
- Cross-chain bridge supports ETH/USDC conversion to ckETH/ckUSDC
- Supported wallets: Internet Identity, Plug Wallet, MetaMask (for bridge)
- If loans aren't repaid within 90 days, assets are forfeited and sold on marketplace
- Loan extensions available for 1% of loan amount (additional 30 days)
- Contact email: info@rwapawn.io
- Platform uses AES-256 encryption for document security

Be helpful, friendly, and knowledgeable about the platform. Keep responses concise but informative. If you don't know something specific, direct users to contact support at info@rwapawn.io or use the contact form.`;

export async function processChat(message: string, conversationHistory: ChatMessage[] = []): Promise<ChatResponse> {
  try {
    const messages = [
      { role: 'system' as const, content: SYSTEM_PROMPT },
      ...conversationHistory.map(msg => ({
        role: msg.role,
        content: msg.content
      })),
      { role: 'user' as const, content: message }
    ];

    const response = await openai.chat.completions.create({
      model: "gpt-5", // the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
      messages: messages,
      max_completion_tokens: 500
    });

    const assistantMessage = response.choices[0].message.content;

    if (!assistantMessage) {
      throw new Error('No response from AI');
    }

    return {
      message: assistantMessage,
      success: true
    };
  } catch (error) {
    console.error('Chat service error:', error);
    return {
      message: 'I apologize, but I\'m having trouble responding right now. Please try again or contact our support team at info@rwapawn.io.',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}