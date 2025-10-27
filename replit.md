# ICP RWA Pawn Platform

## Overview

This is a decentralized Real World Asset (RWA) pawning platform built on the Internet Computer Protocol (ICP). The platform allows users to submit real-world assets for verification, receive instant liquidity through pawn loans, and participate in a marketplace for expired assets. The system combines traditional pawn shop functionality with modern blockchain technology to create a transparent, secure, and decentralized lending platform.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
The frontend is built using React with TypeScript, utilizing a modern component-based architecture. The application uses Wouter for client-side routing and TanStack Query for efficient data fetching and caching. The UI is constructed with shadcn/ui components built on top of Radix UI primitives, styled with Tailwind CSS for consistent design. The frontend follows a page-based routing structure with dedicated pages for home, dashboard, marketplace, bridge functionality, and admin panel.

### Backend Architecture
The backend is built with Express.js in TypeScript, providing RESTful API endpoints for all platform functionality. The server architecture includes middleware for request logging, error handling, and JSON parsing. The application uses a layered architecture with separate modules for database operations (storage), route handling, and server configuration. The backend serves both API endpoints and static files, with Vite integration for development hot reloading.

### Database Layer
The system uses Drizzle ORM with PostgreSQL as the database solution, specifically configured for Neon Database hosting. The database schema includes tables for users, RWA submissions, pawn loans, marketplace assets, bids, transactions, and bridge transactions. The schema supports the complete lifecycle of asset pawning from submission through loan management to marketplace transactions. All tables include proper relationships and constraints to maintain data integrity.

### Authentication and User Management
User authentication is based on wallet addresses, providing a seamless Web3 experience. The system supports user registration and management through wallet connections, with additional profile information stored in the database. Admin users have elevated privileges for managing submissions and platform operations.

### File Upload and Storage
The platform integrates with Google Cloud Storage for secure file handling, supporting document uploads for certificates of authenticity, NFT representations, and physical documentation. The system uses Uppy for frontend file upload handling with support for drag-and-drop, progress tracking, and multiple file types.

### Asset Lifecycle Management
The platform implements a complete asset lifecycle from submission to final disposition. RWA submissions go through a review process by admin users, approved assets can be used as collateral for pawn loans with automated expiry tracking, and expired loans result in assets being listed on the marketplace for public bidding.

### Blockchain Integration
The system includes ICP blockchain integration with wallet connectivity and transaction management. The platform maintains transaction records and supports both ICP and traditional payment methods.

**Chain Fusion Bridge (Production-Ready Oracle Integration)**:
The bridge infrastructure now includes production-grade oracle integration:
- ✅ Frontend UI complete with estimation, initiation, and history views
- ✅ Backend API endpoints functional (/estimate, /initiate, /status, /history)
- ✅ Database-backed monitoring service with job persistence and recovery
- ✅ ICP canister integration architecture (ckETH, ckUSDC, evmRPC)
- ✅ Real-time gas price oracles using Etherscan API with fallback
- ✅ Price oracle integration via CoinGecko API for accurate FX conversion
- ✅ Precise BigInt decimal parsing (no float precision loss)
- ✅ Validated bridge pairs (restricted to 1:1 wrapped tokens only)
  
**Oracle Services:**
- **Price Oracle**: CoinGecko API with 5-minute caching
  - Fetches real-time prices for ETH, ICP, USDC
  - Automatic fallback to cached or hardcoded values on API failure
  - Supports token-to-token price conversion for fee normalization

- **Gas Oracle**: Etherscan Gas Tracker API
  - Real-time Ethereum gas price estimation (~100K gas units for bridge)
  - EIP-1559 support with base fee + priority fee
  - Conservative $15 fallback for API failures
  
- **Fee Structure**:
  - Protocol fee: 0.5% of bridged amount
  - Network fee (Ethereum): Real-time gas cost in USD (~$5-$20 typical)
  - Network fee (ICP): ~$0.0003 (minimal)
  - Total fee dynamically calculated based on real market conditions

**Supported Bridge Pairs** (1:1 wrapped tokens only):
- ETH (Ethereum) ↔ ckETH (ICP)
- USDC (Ethereum) ↔ ckUSDC (ICP)

**Example Bridge Cost** (at current prices):
- 1 ETH → ckETH: ~0.0086 ETH total fee (0.5% + $15 gas = ~0.86%)
- 100 USDC → ckUSDC: ~$0.65 total fee (0.5% + ~$0.15 gas = ~0.65%)

### KYC Integration with Asset Submissions
The platform enforces mandatory KYC verification for loan eligibility, ensuring regulatory compliance and risk management. The system integrates KYC status directly into the asset review and loan approval workflow.

**KYC Eligibility Requirements:**
- Users must complete KYC verification to receive pawn loans
- KYC status is checked at loan approval time
- Submissions from unverified users are blocked from approval
- Clear error messages guide admins when KYC verification is missing

**Backend Implementation:**
- `getPendingRwaSubmissions()` JOINs with `kycInformation` table to fetch KYC status
- Both loan approval endpoints verify `kycStatus === 'approved'` before proceeding
- KYC check occurs BEFORE submission status update to maintain data consistency
- Endpoints: `/api/rwa-submissions/:id/status` (PATCH) and `/api/admin/assets/:submissionId/approve` (POST)

**Admin Interface Integration:**
- AssetReview component displays comprehensive KYC Eligibility Status section
- Color-coded badges show KYC status (green=approved, yellow=pending, red=rejected/not started)
- Eligibility messages explain whether user can receive loans
- Displays user name, email, KYC submission date, and rejection reasons when applicable
- Shield icon indicates security and compliance focus

**KYC Status Values:**
- `approved` - User verified, eligible for loans
- `pending` - KYC under review, loans blocked
- `rejected` - KYC denied, loans blocked with reason displayed
- `not_started` - No KYC submission, loans blocked

### Admin Dashboard
A comprehensive admin interface provides oversight of all platform operations including pending submissions review, active loan monitoring, marketplace oversight, and platform analytics. The admin panel includes approval workflows, KYC eligibility checks, and reporting functionality.

### Fee Waiver System
The platform includes an admin-based fee waiver system that automatically grants 100% fee exemption to administrators for beta testing purposes. This system applies to all platform fees.

**Admin Users (Complete Fee Waiver):**
- All users with `isAdmin = true` OR `role = 'administrator'` OR `role = 'manager'`
- Enables admins to beta test pawn asset functionality without incurring fees
- Fee waiver automatically applies based on user account status

**Fees Waived for Admins:**
- Listing Fee: $25 USDC per asset submission
- Marketplace Transaction Fee: 3% of sale price
- Loan Interest: 8.5% APR
- Bridge Transaction Fee: 0.5% of bridged amount

**Implementation:**
The fee waiver is implemented in `server/fee-waiver.ts` with centralized logic for:
- Fee calculation with automatic waiver detection for admin users
- Individual fee calculators for each fee type
- Fee waiver status API endpoint with admin support
- Comprehensive audit trail in transaction metadata

**API Endpoints:**
- GET `/api/user/fee-waiver-status` - Check current user's fee waiver eligibility and benefits

## External Dependencies

### Database Services
- **Neon Database**: Primary PostgreSQL database hosting with serverless scaling
- **Drizzle ORM**: Database abstraction layer with TypeScript support

### Cloud Storage
- **Google Cloud Storage**: File storage service for asset documentation and images

### UI Framework
- **Radix UI**: Unstyled, accessible UI primitives for React
- **shadcn/ui**: Pre-built component library with consistent styling
- **Tailwind CSS**: Utility-first CSS framework for styling

### Development Tools
- **Vite**: Build tool and development server with hot module replacement
- **TypeScript**: Type safety across frontend and backend
- **React Hook Form**: Form validation and management
- **Zod**: Runtime type validation and schema validation

### File Upload
- **Uppy**: Modular file uploader with cloud storage integration
- **AWS S3 Plugin**: S3-compatible storage integration for Uppy

### Data Management
- **TanStack Query**: Server state management with caching and synchronization
- **React Router (Wouter)**: Lightweight client-side routing

### Blockchain (Planned)
- **Internet Computer Protocol**: Target blockchain for deployment
- **Wallet Integration**: Support for ICP wallet connections and transactions