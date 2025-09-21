import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Lock, User } from "lucide-react";
import logoImage from "@assets/rwa1_1758232271312.png";

export default function AdminLogin() {
  const [credentials, setCredentials] = useState({
    username: "",
    password: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // Check if already authenticated
  const adminToken = localStorage.getItem('adminToken');
  if (adminToken && !isAuthenticated) {
    // Verify token with server
    fetch('/api/admin/verify', {
      headers: {
        'Authorization': `Bearer ${adminToken}`
      }
    })
    .then(res => {
      if (res.ok) {
        setIsAuthenticated(true);
      } else {
        localStorage.removeItem('adminToken');
      }
    })
    .catch(() => {
      localStorage.removeItem('adminToken');
    });
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      const data = await response.json();

      if (data.success) {
        localStorage.setItem('adminToken', data.token);
        toast({
          title: "Login Successful",
          description: "Welcome to the admin panel",
        });
        setLocation('/admin');
      } else {
        toast({
          title: "Login Failed",
          description: data.error || "Invalid credentials",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Login Error",
        description: "Unable to connect to server",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      setLocation('/admin');
    }
  }, [isAuthenticated, setLocation]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md p-6 sm:p-8 glass-effect">
        <div className="text-center mb-6">
          <img 
            src={logoImage} 
            alt="RWA Pawnshop" 
            className="h-16 w-auto mx-auto mb-4 object-contain"
          />
          <h1 className="text-xl sm:text-2xl font-bold mb-2">Admin Login</h1>
          <p className="text-sm text-muted-foreground">
            Access the RWA Pawnshop admin panel
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username" className="text-sm font-medium">
              Username
            </Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="username"
                type="text"
                placeholder="Enter username"
                value={credentials.username}
                onChange={(e) => setCredentials(prev => ({ ...prev, username: e.target.value }))}
                className="pl-10 h-11"
                data-testid="input-admin-username"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-medium">
              Password
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="password"
                type="password"
                placeholder="Enter password"
                value={credentials.password}
                onChange={(e) => setCredentials(prev => ({ ...prev, password: e.target.value }))}
                className="pl-10 h-11"
                data-testid="input-admin-password"
                required
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={isLoading || !credentials.username || !credentials.password}
            className="w-full h-11 mt-6"
            data-testid="button-admin-login"
          >
            {isLoading ? "Signing in..." : "Sign In"}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-xs text-muted-foreground">
            Authorized admin access only
          </p>
        </div>
      </Card>
    </div>
  );
}