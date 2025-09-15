import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Wallet, Coins, Menu, X, LogOut, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

export default function Navigation() {
  const [location] = useLocation();
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();

  const handleLogin = () => {
    window.location.href = "/api/login";
  };

  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

  const navItems = [
    { href: "/", label: "Home" },
    { href: "/dashboard", label: "Dashboard" },
    { href: "/marketplace", label: "Marketplace" },
    { href: "/bridge", label: "Bridge" },
    { href: "/admin", label: "Admin" },
  ];

  const NavItems = ({ mobile = false }: { mobile?: boolean }) => (
    <>
      {navItems.map((item) => (
        <Link key={item.href} href={item.href}>
          <span
            className={`${
              location === item.href
                ? "text-primary"
                : "text-foreground hover:text-primary"
            } transition-colors cursor-pointer ${mobile ? "block py-2" : ""}`}
            data-testid={`nav-link-${item.label.toLowerCase()}`}
          >
            {item.label}
          </span>
        </Link>
      ))}
    </>
  );

  return (
    <nav className="sticky top-0 z-50 border-b border-border glass-effect">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/">
            <div className="flex items-center space-x-2 cursor-pointer" data-testid="logo">
              <Coins className="text-primary text-2xl" />
              <span className="text-xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                ICP RWA Pawn
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <NavItems />
          </div>

          {/* Authentication */}
          <div className="flex items-center space-x-4">
            {isLoading ? (
              <Button disabled className="bg-primary hover:bg-primary/90 text-primary-foreground">
                Loading...
              </Button>
            ) : isAuthenticated ? (
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  className="text-sm"
                  data-testid="button-user-profile"
                >
                  <User className="mr-2 h-4 w-4" />
                  {user?.firstName || user?.email || "User"}
                </Button>
                <Button
                  onClick={handleLogout}
                  variant="outline"
                  size="icon"
                  data-testid="button-logout"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <Button
                onClick={handleLogin}
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
                data-testid="button-login"
              >
                <User className="mr-2 h-4 w-4" />
                Login
              </Button>
            )}

            {/* Mobile Menu */}
            <Sheet>
              <SheetTrigger asChild className="md:hidden">
                <Button variant="ghost" size="icon" data-testid="button-mobile-menu">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-64">
                <div className="flex flex-col space-y-4 mt-8">
                  <NavItems mobile />
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </nav>
  );
}
