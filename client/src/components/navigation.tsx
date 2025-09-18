import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Wallet, Coins, Menu, X, LogOut, User, Plug } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useICPWallet } from "@/hooks/useICPWallet";

export default function Navigation() {
  const [location] = useLocation();
  const [showWalletDialog, setShowWalletDialog] = useState(false);
  const { user, isAuthenticated, isLoading } = useAuth();
  const { 
    wallet, 
    isConnecting, 
    isConnected, 
    connectPlug, 
    connectInternetIdentity, 
    disconnect, 
    isPlugAvailable 
  } = useICPWallet();
  const { toast } = useToast();

  const handleLogin = () => {
    window.location.href = "/api/login";
  };

  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

  const handleConnectWallet = async (type: 'plug' | 'internetIdentity') => {
    try {
      if (type === 'plug') {
        await connectPlug();
      } else {
        await connectInternetIdentity();
      }
      setShowWalletDialog(false);
    } catch (error) {
      console.error('Wallet connection failed:', error);
    }
  };

  const handleDisconnectWallet = async () => {
    await disconnect();
  };

  const baseNavItems = [
    { href: "/", label: "Home" },
    { href: "/how-it-works", label: "How it Works" },
    { href: "/dashboard", label: "Dashboard" },
    { href: "/marketplace", label: "Marketplace" },
    { href: "/bridge", label: "Bridge" },
    { href: "/token", label: "RWAPAWN Token" },
  ];

  // Only show admin menu to authenticated admin users
  const navItems = [
    ...baseNavItems,
    ...(isAuthenticated && user?.isAdmin ? [{ href: "/admin", label: "Admin" }] : [])
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
          {/* Logo - Mobile Responsive */}
          <Link href="/">
            <div className="flex items-center space-x-1 sm:space-x-2 cursor-pointer" data-testid="logo">
              <Coins className="text-primary text-xl sm:text-2xl" />
              <span className="text-base sm:text-xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                <span className="hidden sm:inline">RWA PAWN</span>
                <span className="sm:hidden">RWA Pawn</span>
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <NavItems />
          </div>

          {/* Authentication and Wallet - Mobile Optimized */}
          <div className="flex items-center space-x-2 sm:space-x-4">
            {/* Wallet Connection */}
            {isConnected && wallet ? (
              <div className="flex items-center space-x-1 sm:space-x-2">
                <Button
                  variant="outline"
                  className="text-xs sm:text-sm font-mono px-2 sm:px-3 h-8 sm:h-9"
                  data-testid="button-wallet-info"
                >
                  <Wallet className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden xs:inline">{wallet.balance.toFixed(4)} ICP</span>
                  <span className="xs:hidden">{wallet.balance.toFixed(2)}</span>
                </Button>
                <Button
                  onClick={handleDisconnectWallet}
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 sm:h-9 sm:w-9"
                  data-testid="button-disconnect-wallet"
                >
                  <X className="h-3 w-3 sm:h-4 sm:w-4" />
                </Button>
              </div>
            ) : (
              <Dialog open={showWalletDialog} onOpenChange={setShowWalletDialog}>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    disabled={isConnecting}
                    className="text-xs sm:text-sm px-2 sm:px-3 h-8 sm:h-9"
                    data-testid="button-connect-wallet"
                  >
                    <Wallet className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                    <span className="hidden sm:inline">{isConnecting ? "Connecting..." : "Connect Wallet"}</span>
                    <span className="sm:hidden">Wallet</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Connect ICP Wallet</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <Button
                      onClick={() => handleConnectWallet('plug')}
                      className="w-full flex items-center justify-center space-x-2"
                      disabled={isConnecting || !isPlugAvailable}
                      data-testid="button-connect-plug"
                    >
                      <Plug className="h-5 w-5" />
                      <span>Connect with Plug Wallet</span>
                    </Button>
                    {!isPlugAvailable && (
                      <p className="text-sm text-muted-foreground text-center">
                        Plug wallet extension not detected
                      </p>
                    )}
                    <Button
                      onClick={() => handleConnectWallet('internetIdentity')}
                      variant="outline"
                      className="w-full flex items-center justify-center space-x-2"
                      disabled={isConnecting}
                      data-testid="button-connect-internet-identity"
                    >
                      <span className="text-lg">🔐</span>
                      <span>Connect with Internet Identity</span>
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}

            {/* Authentication - Mobile Optimized */}
            {isLoading ? (
              <Button disabled className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs sm:text-sm px-2 sm:px-3 h-8 sm:h-9">
                Loading...
              </Button>
            ) : isAuthenticated ? (
              <div className="flex items-center space-x-1 sm:space-x-2">
                <Button
                  variant="outline"
                  className="text-xs sm:text-sm px-2 sm:px-3 h-8 sm:h-9"
                  data-testid="button-user-profile"
                >
                  <User className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">{user?.principalId?.slice(0, 8) + "..." || "User"}</span>
                  <span className="sm:hidden">{user?.principalId?.slice(0, 4) + "..." || "User"}</span>
                </Button>
                <Button
                  onClick={handleLogout}
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 sm:h-9 sm:w-9"
                  data-testid="button-logout"
                >
                  <LogOut className="h-3 w-3 sm:h-4 sm:w-4" />
                </Button>
              </div>
            ) : (
              <Button
                onClick={handleLogin}
                className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs sm:text-sm px-2 sm:px-3 h-8 sm:h-9"
                data-testid="button-login"
              >
                <User className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden xs:inline">Login</span>
                <span className="xs:hidden">Login</span>
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
