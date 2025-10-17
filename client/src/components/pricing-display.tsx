import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { RefreshCw, TrendingUp, TrendingDown, AlertCircle, CheckCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { PricingQuery, PricingResponse } from "@shared/schema";

interface PricingDisplayProps {
  query: PricingQuery;
  onPriceUpdate?: (pricing: PricingResponse) => void;
  showRefreshButton?: boolean;
  compact?: boolean;
  className?: string;
}

interface ConfidenceBadgeProps {
  confidence: number;
}

const ConfidenceBadge = ({ confidence }: ConfidenceBadgeProps) => {
  const getConfidenceColor = (score: number) => {
    if (score >= 0.9) return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
    if (score >= 0.7) return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
    return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
  };

  const getConfidenceText = (score: number) => {
    if (score >= 0.9) return "High";
    if (score >= 0.7) return "Medium";
    return "Low";
  };

  return (
    <Badge 
      className={getConfidenceColor(confidence)}
      data-testid="badge-confidence"
    >
      {getConfidenceText(confidence)} ({Math.round(confidence * 100)}%)
    </Badge>
  );
};

interface PriceRangeProps {
  p25?: number;
  median: number;
  p75?: number;
  currency: string;
  compact?: boolean;
}

const PriceRange = ({ p25, median, p75, currency, compact = false }: PriceRangeProps) => {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: currency === 'USD' ? 2 : 8,
      maximumFractionDigits: currency === 'USD' ? 2 : 8,
    }).format(price);
  };

  if (compact) {
    return (
      <div className="text-lg font-semibold" data-testid="text-price-median">
        {formatPrice(median)}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="text-2xl font-bold text-center" data-testid="text-price-median">
        {formatPrice(median)}
      </div>
      {p25 && p75 && (
        <div className="text-sm text-muted-foreground text-center">
          <span data-testid="text-price-range">
            Range: {formatPrice(p25)} - {formatPrice(p75)}
          </span>
        </div>
      )}
    </div>
  );
};

export const PricingDisplay = ({ 
  query, 
  onPriceUpdate, 
  showRefreshButton = true, 
  compact = false,
  className = "" 
}: PricingDisplayProps) => {
  const [refreshKey, setRefreshKey] = useState(0);
  const [autoRefresh, setAutoRefresh] = useState(false);

  // Build query string for the API call
  const buildQueryString = (q: PricingQuery) => {
    const params = new URLSearchParams();
    params.append('category', q.category);
    
    if (q.symbol) params.append('symbol', q.symbol);
    if (q.itemType) params.append('itemType', q.itemType);
    if (q.forceRefresh) params.append('forceRefresh', 'true');
    
    // Handle specifications
    if (q.specifications) {
      Object.entries(q.specifications).forEach(([key, value]) => {
        params.append(`specifications[${key}]`, String(value));
      });
    }
    
    return params.toString();
  };

  const queryString = buildQueryString({ ...query, forceRefresh: refreshKey > 0 });

  const { 
    data: pricing, 
    isLoading, 
    isError, 
    error, 
    refetch,
    isRefetching 
  } = useQuery<PricingResponse>({
    queryKey: ['/api/pricing/estimate', queryString, refreshKey],
    queryFn: async () => {
      const url = `/api/pricing/estimate?${queryString}`;
      const response = await fetch(url, {
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch pricing: ${response.statusText}`);
      }
      
      return response.json();
    },
    staleTime: query.category === 'crypto' ? 60000 : 300000, // 1 min for crypto, 5 min for others
    refetchInterval: autoRefresh ? (query.category === 'crypto' ? 60000 : 300000) : false,
  });

  // Notify parent component of price updates
  useEffect(() => {
    if (pricing && onPriceUpdate) {
      onPriceUpdate(pricing);
    }
  }, [pricing, onPriceUpdate]);

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
    refetch();
  };

  const toggleAutoRefresh = () => {
    setAutoRefresh(!autoRefresh);
  };

  const renderError = () => {
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch pricing data';
    
    return (
      <Alert className="border-red-200 dark:border-red-800">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription data-testid="text-error-message">
          {errorMessage}
          {showRefreshButton && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleRefresh}
              className="ml-2"
              data-testid="button-retry-pricing"
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Retry
            </Button>
          )}
        </AlertDescription>
      </Alert>
    );
  };

  const renderLoading = () => {
    if (compact) {
      return <Skeleton className="h-6 w-24" data-testid="skeleton-pricing-compact" />;
    }

    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-32 mx-auto" data-testid="skeleton-pricing-median" />
        <Skeleton className="h-4 w-48 mx-auto" data-testid="skeleton-pricing-range" />
        <div className="flex justify-center space-x-2">
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-5 w-20" />
        </div>
      </div>
    );
  };

  const renderContent = () => {
    if (!pricing) return null;

    const isStale = new Date(pricing.timestamp).getTime() < Date.now() - 300000; // 5 minutes
    const sources = Array.isArray(pricing.sources) ? pricing.sources : [];

    return (
      <div className={compact ? "flex items-center space-x-2" : "space-y-4"}>
        <PriceRange 
          p25={pricing.p25}
          median={pricing.median}
          p75={pricing.p75}
          currency={pricing.currency}
          compact={compact}
        />
        
        {!compact && (
          <>
            <div className="flex items-center justify-center space-x-2">
              <ConfidenceBadge confidence={pricing.confidence} />
              {isStale && (
                <Badge variant="outline" className="text-orange-600" data-testid="badge-stale">
                  Stale Data
                </Badge>
              )}
              {pricing.cached && (
                <Badge variant="outline" data-testid="badge-cached">
                  Cached
                </Badge>
              )}
            </div>

            <div className="text-xs text-muted-foreground text-center space-y-1">
              <div data-testid="text-pricing-sources">
                Sources: {sources.join(', ') || 'Unknown'}
              </div>
              <div data-testid="text-pricing-timestamp">
                Updated: {new Date(pricing.timestamp).toLocaleTimeString()}
              </div>
              {pricing.methodology && (
                <div className="text-xs text-gray-500" data-testid="text-pricing-methodology">
                  {pricing.methodology}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    );
  };

  if (compact) {
    return (
      <div className={`inline-flex items-center space-x-2 ${className}`}>
        {isLoading || isRefetching ? renderLoading() : isError ? (
          <span className="text-red-600 text-sm" data-testid="text-error-compact">
            Pricing error
          </span>
        ) : (
          renderContent()
        )}
      </div>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">
            Asset Pricing
            {pricing?.confidence && pricing.confidence >= 0.8 && (
              <CheckCircle className="inline ml-2 h-4 w-4 text-green-600" />
            )}
          </CardTitle>
          {showRefreshButton && (
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={toggleAutoRefresh}
                className={autoRefresh ? "bg-green-50 dark:bg-green-950" : ""}
                data-testid="button-auto-refresh"
              >
                {autoRefresh ? "Auto On" : "Auto Off"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={isLoading || isRefetching}
                data-testid="button-refresh-pricing"
              >
                <RefreshCw className={`h-3 w-3 ${isRefetching ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading || isRefetching ? renderLoading() : isError ? renderError() : renderContent()}
      </CardContent>
    </Card>
  );
};

// Specialized components for different asset types
export const CryptoPricingDisplay = ({ symbol, ...props }: { symbol: string } & Omit<PricingDisplayProps, 'query'>) => (
  <PricingDisplay query={{ category: 'crypto', symbol }} {...props} />
);

export const MetalsPricingDisplay = ({ symbol, ...props }: { symbol: string } & Omit<PricingDisplayProps, 'query'>) => (
  <PricingDisplay query={{ category: 'precious_metals', symbol }} {...props} />
);

export const JewelryPricingDisplay = ({ 
  itemType, 
  specifications, 
  ...props 
}: { 
  itemType: string;
  specifications: Record<string, any>;
} & Omit<PricingDisplayProps, 'query'>) => (
  <PricingDisplay 
    query={{ 
      category: 'jewelry', 
      itemType, 
      specifications 
    }} 
    {...props} 
  />
);

export const ElectronicsPricingDisplay = ({ 
  itemType, 
  specifications, 
  ...props 
}: { 
  itemType: string;
  specifications: Record<string, any>;
} & Omit<PricingDisplayProps, 'query'>) => (
  <PricingDisplay 
    query={{ 
      category: 'electronics', 
      itemType, 
      specifications 
    }} 
    {...props} 
  />
);

// Bulk pricing display for multiple assets
interface BulkPricingDisplayProps {
  queries: PricingQuery[];
  onPricesUpdate?: (prices: Record<string, PricingResponse>) => void;
  className?: string;
}

export const BulkPricingDisplay = ({ queries, onPricesUpdate, className }: BulkPricingDisplayProps) => {
  const { data: bulkPricing, isLoading, isError } = useQuery({
    queryKey: ['/api/pricing/bulk-estimate', queries],
    queryFn: async () => {
      const response = await fetch('/api/pricing/bulk-estimate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ queries }),
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch bulk pricing');
      }
      
      return response.json();
    },
    enabled: queries.length > 0,
  });

  useEffect(() => {
    if (bulkPricing?.results && onPricesUpdate) {
      const prices: Record<string, PricingResponse> = {};
      bulkPricing.results.forEach((result: any, index: number) => {
        if (result.status === 'success') {
          prices[`query_${index}`] = result.data;
        }
      });
      onPricesUpdate(prices);
    }
  }, [bulkPricing, onPricesUpdate]);

  if (isLoading) {
    return (
      <div className={`space-y-2 ${className}`}>
        {queries.map((_, index) => (
          <Skeleton key={index} className="h-16 w-full" data-testid={`skeleton-bulk-${index}`} />
        ))}
      </div>
    );
  }

  if (isError || !bulkPricing) {
    return (
      <Alert className="border-red-200 dark:border-red-800">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription data-testid="text-bulk-error">
          Failed to fetch bulk pricing data
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {bulkPricing.results.map((result: any, index: number) => {
        const query = queries[index];
        const queryDescription = `${query.category}${query.symbol ? ` - ${query.symbol}` : ''}${query.itemType ? ` - ${query.itemType}` : ''}`;
        
        return (
          <Card key={index} className="p-3" data-testid={`card-bulk-result-${index}`}>
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium" data-testid={`text-query-desc-${index}`}>
                {queryDescription}
              </div>
              {result.status === 'success' ? (
                <div className="text-right">
                  <div className="text-lg font-semibold" data-testid={`text-bulk-price-${index}`}>
                    {new Intl.NumberFormat('en-US', {
                      style: 'currency',
                      currency: result.data.currency,
                    }).format(result.data.median)}
                  </div>
                  <ConfidenceBadge confidence={result.data.confidence} />
                </div>
              ) : (
                <div className="text-red-600 text-sm" data-testid={`text-bulk-error-${index}`}>
                  {result.error || 'Pricing failed'}
                </div>
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
};

export default PricingDisplay;