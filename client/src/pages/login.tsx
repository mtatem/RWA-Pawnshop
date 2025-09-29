import { useState } from "react";
import { useLocation, Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Lock, User, Eye, EyeOff, ArrowRight, UserPlus } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import logoImage from "@assets/rwa-pawnshop-logo_1759117333505.png";
import { z } from "zod";

// Login form schema - matches userLoginSchema from backend
const loginFormSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().default(false),
});

type LoginFormData = z.infer<typeof loginFormSchema>;

export default function Login() {
  const [, setLocation] = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      email: "",
      password: "",
      rememberMe: false,
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);

    try {
      const response = await apiRequest('POST', '/api/auth/login', {
        email: data.email,
        password: data.password,
        rememberMe: data.rememberMe,
      });

      const result = await response.json();

      if (result.success) {
        // Store user data (in a real app, this would be handled by context/state management)
        localStorage.setItem('user', JSON.stringify(result.user));
        
        toast({
          title: "Login Successful",
          description: `Welcome back, ${result.user.firstName || result.user.email}!`,
        });

        // Redirect to dashboard
        setLocation('/dashboard');
      } else {
        toast({
          title: "Login Failed",
          description: result.error || "Invalid credentials",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error('Login error:', error);
      
      // Parse error message from API response
      let errorMessage = "Unable to connect to server";
      if (error.message) {
        if (error.message.includes('423')) {
          errorMessage = "Account is temporarily locked due to too many failed attempts";
        } else if (error.message.includes('401')) {
          errorMessage = "Invalid email or password";
        } else if (error.message.includes('500')) {
          errorMessage = "Server error - please try again later";
        }
      }

      toast({
        title: "Login Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black p-4">
      <Card className="w-full max-w-md p-8 space-y-6 shadow-lg">
        <div className="text-center space-y-2">
          <img 
            src={logoImage} 
            alt="RWA Pawn Platform" 
            className="mx-auto h-12 w-auto"
          />
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
            Welcome Back
          </h1>
          <p className="text-sm text-muted-foreground">
            Sign in to your account to continue
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" data-testid="form-login">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
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

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        {...field}
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your password"
                        className="pl-10 pr-10"
                        data-testid="input-password"
                        disabled={isLoading}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                        data-testid="button-toggle-password"
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex items-center justify-between">
              <FormField
                control={form.control}
                name="rememberMe"
                render={({ field }) => (
                  <FormItem className="flex items-center space-x-2">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="checkbox-remember-me"
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormLabel className="text-sm font-normal">
                      Remember me
                    </FormLabel>
                  </FormItem>
                )}
              />

              <Link 
                href="/forgot-password"
                className="text-sm text-primary hover:underline"
                data-testid="link-forgot-password"
              >
                Forgot password?
              </Link>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
              data-testid="button-login"
            >
              {isLoading ? (
                "Signing in..."
              ) : (
                <>
                  Sign In
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </form>
        </Form>

        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-3">
            New to RWA Pawn Platform?
          </p>
          <Link href="/register">
            <Button
              variant="outline"
              className="w-full"
              data-testid="button-register"
            >
              <UserPlus className="mr-2 h-4 w-4" />
              Create Account
            </Button>
          </Link>
        </div>

        <Separator />

        <div className="text-center space-y-4">
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

          <div className="text-xs text-muted-foreground">
            <p>Or continue with</p>
            <div className="mt-2">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => window.location.href = '/api/login'}
                data-testid="button-replit-auth"
              >
                Replit Auth (OAuth)
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}