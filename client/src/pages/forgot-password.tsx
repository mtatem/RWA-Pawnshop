import { useState } from "react";
import { useLocation, Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Mail, ArrowLeft, Send } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import logoImage from "@assets/rwa1_1758232271312.png";
import { z } from "zod";

// Forgot password form schema
const forgotPasswordFormSchema = z.object({
  email: z.string().email('Invalid email format'),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordFormSchema>;

export default function ForgotPassword() {
  const [, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const { toast } = useToast();

  const form = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordFormSchema),
    defaultValues: {
      email: "",
    },
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setIsLoading(true);

    try {
      const response = await apiRequest('POST', '/api/auth/forgot-password', {
        email: data.email,
      });

      const result = await response.json();

      if (result.success) {
        setEmailSent(true);
        toast({
          title: "Reset Link Sent",
          description: result.message || "If an account with this email exists, a password reset link has been sent.",
        });
      } else {
        toast({
          title: "Request Failed",
          description: result.error || "Failed to process password reset request",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error('Forgot password error:', error);
      
      // Parse error message from API response
      let errorMessage = "Unable to connect to server";
      if (error.message) {
        if (error.message.includes('429')) {
          errorMessage = "Too many requests. Please wait before trying again.";
        } else if (error.message.includes('400')) {
          errorMessage = "Invalid email format";
        } else if (error.message.includes('500')) {
          errorMessage = "Server error - please try again later";
        }
      }

      toast({
        title: "Reset Request Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (emailSent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
        <Card className="w-full max-w-md p-8 space-y-6 shadow-lg text-center">
          <div className="space-y-4">
            <img 
              src={logoImage} 
              alt="RWA Pawn Platform" 
              className="mx-auto h-12 w-auto"
            />
            <div className="text-center">
              <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mb-4">
                <Send className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                Check Your Email
              </h1>
              <p className="text-sm text-muted-foreground mt-2">
                If an account with the email <strong>{form.getValues('email')}</strong> exists, 
                we've sent you a password reset link.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="text-sm text-muted-foreground bg-muted p-4 rounded-md">
              <p className="font-medium mb-2">Didn't receive the email?</p>
              <ul className="text-xs space-y-1 list-disc list-inside">
                <li>Check your spam/junk folder</li>
                <li>Make sure you entered the correct email address</li>
                <li>Wait a few minutes for the email to arrive</li>
              </ul>
            </div>

            <div className="flex flex-col gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setEmailSent(false);
                  form.reset();
                }}
                data-testid="button-try-again"
              >
                Try Another Email
              </Button>

              <Link href="/login">
                <Button variant="ghost" className="w-full" data-testid="button-back-login">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Sign In
                </Button>
              </Link>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <Card className="w-full max-w-md p-8 space-y-6 shadow-lg">
        <div className="text-center space-y-2">
          <img 
            src={logoImage} 
            alt="RWA Pawn Platform" 
            className="mx-auto h-12 w-auto"
          />
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
            Reset Password
          </h1>
          <p className="text-sm text-muted-foreground">
            Enter your email address and we'll send you a link to reset your password
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" data-testid="form-forgot-password">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        {...field}
                        type="email"
                        placeholder="Enter your email"
                        className="pl-10"
                        data-testid="input-email"
                        disabled={isLoading}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex flex-col gap-3">
              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
                data-testid="button-send-reset"
              >
                {isLoading ? (
                  "Sending..."
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Send Reset Link
                  </>
                )}
              </Button>

              <Link href="/login">
                <Button variant="ghost" className="w-full" data-testid="button-back-login">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Sign In
                </Button>
              </Link>
            </div>
          </form>
        </Form>

        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            Don't have an account?{" "}
            <Link 
              href="/register"
              className="text-primary hover:underline font-medium"
              data-testid="link-register"
            >
              Create one here
            </Link>
          </p>
        </div>
      </Card>
    </div>
  );
}