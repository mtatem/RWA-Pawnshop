import { useState, useEffect, useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { icpWallet, type ICPWallet } from '@/lib/icp-service';
import { useAuth } from '@/hooks/useAuth';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

export interface UseICPWalletReturn {
  wallet: ICPWallet | null;
  isConnecting: boolean;
  isConnected: boolean;
  connectPlug: () => Promise<void>;
  connectInternetIdentity: () => Promise<void>;
  disconnect: () => Promise<void>;
  sendTransaction: (to: string, amount: number, type: string, memo?: string) => Promise<any>;
  refreshBalance: () => Promise<void>;
  isPlugAvailable: boolean;
  error: string | null;
}

export function useICPWallet(): UseICPWalletReturn {
  const [wallet, setWallet] = useState<ICPWallet | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Check if Plug is available
  const isPlugAvailable = icpWallet.isPlugAvailable();

  // Update user principal ID in backend after wallet connection
  const connectWalletMutation = useMutation({
    mutationFn: async ({ principalId, walletType }: { principalId: string; walletType: string }) => {
      if (!user?.id) throw new Error('User not authenticated');
      
      const response = await apiRequest('POST', '/api/user/connect-wallet', {
        principalId,
        walletType,
      });
      return response.json();
    },
    onSuccess: () => {
      // Invalidate user query to refresh user data
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
    }
  });

  // Restore connection on component mount
  useEffect(() => {
    const restoreConnection = async () => {
      try {
        const restoredWallet = await icpWallet.restoreConnection();
        if (restoredWallet) {
          setWallet(restoredWallet);
          // Note: Principal ID should already be set from previous connection
          // No need to update again on restore
        }
      } catch (error) {
        console.error('Failed to restore wallet connection:', error);
      }
    };

    restoreConnection();
  }, [isAuthenticated, user?.id]);

  // Connect to Plug wallet
  const connectPlug = useCallback(async () => {
    if (!isPlugAvailable) {
      setError('Plug wallet is not installed. Please install the Plug browser extension.');
      toast({
        title: 'Plug Wallet Required',
        description: 'Please install the Plug browser extension to connect.',
        variant: 'destructive',
      });
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      const connectedWallet = await icpWallet.connectPlug();
      setWallet(connectedWallet);

      // Update user profile if authenticated
      if (isAuthenticated && user) {
        await connectWalletMutation.mutateAsync({
          principalId: connectedWallet.principalId,
          walletType: 'plug',
        });
      }

      toast({
        title: 'Wallet Connected',
        description: `Successfully connected to Plug wallet. Balance: ${connectedWallet.balance.toFixed(4)} ICP`,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to connect to Plug wallet';
      setError(errorMessage);
      toast({
        title: 'Connection Failed',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsConnecting(false);
    }
  }, [isPlugAvailable, isAuthenticated, user, toast, connectWalletMutation]);

  // Connect to Internet Identity
  const connectInternetIdentity = useCallback(async () => {
    setIsConnecting(true);
    setError(null);

    try {
      const connectedWallet = await icpWallet.connectInternetIdentity();
      setWallet(connectedWallet);

      // Update user profile if authenticated
      if (isAuthenticated && user) {
        await connectWalletMutation.mutateAsync({
          principalId: connectedWallet.principalId,
          walletType: 'internetIdentity',
        });
      }

      toast({
        title: 'Wallet Connected',
        description: `Successfully connected with Internet Identity. Balance: ${connectedWallet.balance.toFixed(4)} ICP`,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to connect to Internet Identity';
      setError(errorMessage);
      toast({
        title: 'Connection Failed',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsConnecting(false);
    }
  }, [isAuthenticated, user, toast, connectWalletMutation]);

  // Disconnect wallet
  const disconnect = useCallback(async () => {
    try {
      await icpWallet.disconnectWallet();
      setWallet(null);
      setError(null);

      toast({
        title: 'Wallet Disconnected',
        description: 'Successfully disconnected from ICP wallet.',
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to disconnect wallet';
      setError(errorMessage);
      toast({
        title: 'Disconnection Failed',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  }, [toast]);

  // Send transaction
  const sendTransactionMutation = useMutation({
    mutationFn: async ({ to, amount, type, memo }: { 
      to: string; 
      amount: number; 
      type: string; 
      memo?: string;
    }) => {
      if (!wallet) throw new Error('No wallet connected');
      
      return await icpWallet.sendTransaction(
        to, 
        amount, 
        type as 'fee_payment' | 'loan_disbursement' | 'redemption_payment' | 'bid_payment', 
        memo
      );
    },
    onSuccess: (transaction) => {
      // Update local balance
      if (wallet) {
        setWallet({
          ...wallet,
          balance: wallet.balance - (transaction.amount + 0.0001), // Include fee
        });
      }
      
      toast({
        title: 'Transaction Sent',
        description: `Successfully sent ${transaction.amount} ICP`,
      });
    },
    onError: (err) => {
      const errorMessage = err instanceof Error ? err.message : 'Transaction failed';
      setError(errorMessage);
      toast({
        title: 'Transaction Failed',
        description: errorMessage,
        variant: 'destructive',
      });
    },
  });

  const sendTransaction = useCallback(async (
    to: string, 
    amount: number, 
    type: string, 
    memo?: string
  ) => {
    return sendTransactionMutation.mutateAsync({ to, amount, type, memo });
  }, [sendTransactionMutation]);

  // Refresh balance
  const refreshBalance = useCallback(async () => {
    if (!wallet) return;

    try {
      const newBalance = await icpWallet.getBalance();
      setWallet({
        ...wallet,
        balance: newBalance,
      });
    } catch (err) {
      console.error('Failed to refresh balance:', err);
    }
  }, [wallet]);

  return {
    wallet,
    isConnecting,
    isConnected: !!wallet?.connected,
    connectPlug,
    connectInternetIdentity,
    disconnect,
    sendTransaction,
    refreshBalance,
    isPlugAvailable,
    error,
  };
}