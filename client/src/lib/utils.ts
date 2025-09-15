import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Utility functions for formatting and validation
export function formatCurrency(amount: string | number, currency: string = "USD"): string {
  const numAmount = typeof amount === "string" ? parseFloat(amount) : amount;
  
  if (currency === "ICP") {
    return `${numAmount.toLocaleString()} ICP`;
  }
  
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(numAmount);
}

export function formatAddress(address: string, startChars: number = 6, endChars: number = 4): string {
  if (address.length <= startChars + endChars) {
    return address;
  }
  return `${address.slice(0, startChars)}...${address.slice(-endChars)}`;
}

export function formatTimeAgo(date: Date | string): string {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diffInMs = now.getTime() - dateObj.getTime();
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
  const diffInDays = Math.floor(diffInHours / 24);
  
  if (diffInDays > 0) {
    return `${diffInDays} day${diffInDays === 1 ? "" : "s"} ago`;
  } else if (diffInHours > 0) {
    return `${diffInHours} hour${diffInHours === 1 ? "" : "s"} ago`;
  } else {
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    if (diffInMinutes > 0) {
      return `${diffInMinutes} minute${diffInMinutes === 1 ? "" : "s"} ago`;
    } else {
      return "Just now";
    }
  }
}

export function formatCountdown(expiryDate: Date): {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isExpired: boolean;
} {
  const now = new Date();
  const diff = expiryDate.getTime() - now.getTime();
  
  if (diff <= 0) {
    return {
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      isExpired: true,
    };
  }
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);
  
  return {
    days,
    hours,
    minutes,
    seconds,
    isExpired: false,
  };
}

export function validateICPAddress(address: string): boolean {
  // Basic ICP address validation pattern
  const icpPattern = /^[a-zA-Z0-9]{27,63}$/;
  return icpPattern.test(address) || address.startsWith("icp_");
}

export function validateFileType(file: File, allowedTypes: string[]): boolean {
  return allowedTypes.includes(file.type);
}

export function validateFileSize(file: File, maxSizeInMB: number): boolean {
  const maxSizeInBytes = maxSizeInMB * 1024 * 1024;
  return file.size <= maxSizeInBytes;
}

export function generateMockTransactionHash(): string {
  return `icp_${Math.random().toString(36).substring(2, 15)}`;
}

export function calculateLoanProgress(startDate: Date, expiryDate: Date): number {
  const now = new Date();
  const totalDuration = expiryDate.getTime() - startDate.getTime();
  const elapsed = now.getTime() - startDate.getTime();
  
  if (elapsed <= 0) return 0;
  if (elapsed >= totalDuration) return 100;
  
  return (elapsed / totalDuration) * 100;
}

export function isExpiringSoon(expiryDate: Date, warningDays: number = 7): boolean {
  const now = new Date();
  const warningTime = warningDays * 24 * 60 * 60 * 1000; // Convert days to milliseconds
  const timeUntilExpiry = expiryDate.getTime() - now.getTime();
  
  return timeUntilExpiry <= warningTime && timeUntilExpiry > 0;
}

export function generateAssetId(): string {
  return `asset_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

export function parsePriceFilter(value: string): number | null {
  const parsed = parseFloat(value);
  return isNaN(parsed) ? null : parsed;
}

export function sortAssetsByPrice(assets: any[], order: "asc" | "desc" = "asc"): any[] {
  return [...assets].sort((a, b) => {
    const priceA = parseFloat(a.currentBid || a.startingPrice || a.originalValue);
    const priceB = parseFloat(b.currentBid || b.startingPrice || b.originalValue);
    
    return order === "asc" ? priceA - priceB : priceB - priceA;
  });
}

export function filterAssetsByCategory(assets: any[], category: string): any[] {
  if (!category || category === "all") return assets;
  
  return assets.filter(asset => 
    asset.category?.toLowerCase().includes(category.toLowerCase())
  );
}

export function filterAssetsByPriceRange(
  assets: any[], 
  minPrice: number | null, 
  maxPrice: number | null
): any[] {
  return assets.filter(asset => {
    const price = parseFloat(asset.currentBid || asset.startingPrice || asset.originalValue);
    
    if (minPrice !== null && price < minPrice) return false;
    if (maxPrice !== null && price > maxPrice) return false;
    
    return true;
  });
}

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

// Asset status helpers
export function getAssetStatusColor(status: string): string {
  switch (status.toLowerCase()) {
    case "active":
      return "text-secondary";
    case "expired":
    case "expiring":
      return "text-destructive";
    case "available":
      return "text-primary";
    case "sold":
      return "text-muted-foreground";
    case "pending":
      return "text-yellow-500";
    case "approved":
      return "text-green-500";
    case "rejected":
      return "text-destructive";
    default:
      return "text-muted-foreground";
  }
}

export function getAssetStatusBadgeVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  switch (status.toLowerCase()) {
    case "active":
    case "approved":
      return "secondary";
    case "expired":
    case "expiring":
    case "rejected":
      return "destructive";
    case "pending":
      return "outline";
    default:
      return "default";
  }
}

// File upload helpers
export function createFilePreview(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function getFileExtension(filename: string): string {
  return filename.slice(((filename.lastIndexOf(".") - 1) >>> 0) + 2);
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

// Local storage helpers for persisting user preferences
export function getLocalStorageItem<T>(key: string, defaultValue: T): T {
  if (typeof window === "undefined") return defaultValue;
  
  try {
    const item = window.localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch {
    return defaultValue;
  }
}

export function setLocalStorageItem<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn("Failed to save to localStorage:", error);
  }
}

export function removeLocalStorageItem(key: string): void {
  if (typeof window === "undefined") return;
  
  try {
    window.localStorage.removeItem(key);
  } catch (error) {
    console.warn("Failed to remove from localStorage:", error);
  }
}
