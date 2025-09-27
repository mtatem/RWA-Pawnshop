import nodemailer from 'nodemailer';

interface ContactFormData {
  name: string;
  email: string;
  subject: string;
  category: string;
  message: string;
  priority: string;
}

export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    // Configure the email transporter
    // Using a generic SMTP configuration that can be configured via environment variables
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  async sendContactFormSubmission(formData: ContactFormData): Promise<boolean> {
    try {
      const { name, email, subject, category, message, priority } = formData;

      // Create email content
      const htmlContent = `
        <h2>New Contact Form Submission - RWAPAWN</h2>
        <p><strong>From:</strong> ${name} (${email})</p>
        <p><strong>Subject:</strong> ${subject}</p>
        <p><strong>Category:</strong> ${category}</p>
        <p><strong>Priority:</strong> ${priority}</p>
        <p><strong>Website:</strong> https://rwapawn.io</p>
        <hr>
        <h3>Message:</h3>
        <p>${message.replace(/\n/g, '<br>')}</p>
        <hr>
        <p><em>This message was sent from the RWAPAWN contact form at https://rwapawn.io/contact-us</em></p>
      `;

      const textContent = `
New Contact Form Submission - RWAPAWN

From: ${name} (${email})
Subject: ${subject}
Category: ${category}
Priority: ${priority}
Website: https://rwapawn.io

Message:
${message}

---
This message was sent from the RWAPAWN contact form at https://rwapawn.io/contact-us
      `;

      // Send email
      const mailOptions = {
        from: process.env.SMTP_FROM || 'noreply@rwapawn.io',
        to: 'info@tatemwebdesign.com',
        subject: `[RWAPAWN Contact] ${subject}`,
        text: textContent,
        html: htmlContent,
        replyTo: email, // Allow direct reply to the sender
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log('Contact form email sent successfully:', result.messageId);
      return true;

    } catch (error) {
      console.error('Failed to send contact form email:', error);
      return false;
    }
  }

  async verifyConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      console.log('Email service connection verified');
      return true;
    } catch (error) {
      console.error('Email service connection failed:', error);
      return false;
    }
  }
}

// Export a singleton instance
export const emailService = new EmailService();