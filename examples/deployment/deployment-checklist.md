# RWAPAWN Token Deployment Checklist

## Prerequisites Setup

### 1. Development Environment
- [ ] Install DFX (DFINITY SDK): `sh -ci "$(curl -fsSL https://sdk.dfinity.org/install.sh)"`
- [ ] Install Vessel (Motoko package manager): `npm i -g vessel`
- [ ] Create new IC project: `dfx new rwapawn_token`
- [ ] Configure `dfx.json` for token canister

### 2. ICP Wallet Setup  
- [ ] Create ICP wallet with sufficient ICP for deployment (~5-10 ICP)
- [ ] Get cycles for canister deployment (convert ICP to cycles)
- [ ] Set up Internet Identity or other ICP wallet
- [ ] Configure principal IDs for platform wallets

### 3. Code Preparation
- [ ] Copy `rwapawn-token.mo` to `src/rwapawn_token/main.mo`
- [ ] Update principal IDs in canister code (treasury, team, liquidity)
- [ ] Create `.did` interface file for frontend integration
- [ ] Write unit tests for all canister functions

## Local Testing Phase

### 1. Local Deployment
```bash
# Start local IC replica
dfx start --background

# Deploy canister locally
dfx deploy rwapawn_token

# Get local canister ID
dfx canister id rwapawn_token
```

### 2. Function Testing
- [ ] Test `initialize_distribution()` - verify token allocation
- [ ] Test `icrc1_balance_of()` - check platform wallet balances  
- [ ] Test `icrc1_transfer()` - transfer between test principals
- [ ] Test `mint_for_purchase()` - mint tokens for purchases
- [ ] Test `burn_tokens()` - deflationary mechanism
- [ ] Verify all balances add up to 10B total supply

### 3. Integration Testing
- [ ] Connect frontend to local canister
- [ ] Test purchase flow: Stripe → token minting
- [ ] Test balance display from blockchain
- [ ] Test token transfer functionality
- [ ] Verify error handling for insufficient funds, etc.

## Security Audit Phase

### 1. Code Review
- [ ] External security audit of canister code
- [ ] Review access controls (only treasury can mint/burn)
- [ ] Verify overflow/underflow protection
- [ ] Check for reentrancy vulnerabilities
- [ ] Validate transfer fee logic

### 2. Economic Model Validation
- [ ] Verify token distribution matches whitepaper
- [ ] Test deflationary mechanism (burn functions)
- [ ] Validate staking reward calculations  
- [ ] Check fee structures align with documentation

## Mainnet Deployment Phase  

### 1. Production Setup
- [ ] Create production `.env` with real canister IDs
- [ ] Set up monitoring and alerting for canister health
- [ ] Prepare rollback plan in case of issues
- [ ] Document all deployment steps

### 2. Canister Deployment
```bash
# Deploy to IC mainnet (costs cycles)
dfx deploy --network ic rwapawn_token

# Verify deployment
dfx canister --network ic status rwapawn_token

# Initialize token distribution  
dfx canister --network ic call rwapawn_token initialize_distribution
```

### 3. Post-Deployment Verification
- [ ] Verify total supply = 10,000,000,000.00000000 tokens
- [ ] Check platform wallet balances match allocation:
  - Treasury: 2,500,000,000 RWAPAWN (25%)
  - Liquidity: 3,000,000,000 RWAPAWN (30%) 
  - Team: 2,000,000,000 RWAPAWN (20%)
  - Remaining: 2,500,000,000 RWAPAWN (25%)
- [ ] Test first real purchase → token minting
- [ ] Verify canister appears in ICP blockchain explorers

## Platform Integration Phase

### 1. Backend Updates
- [ ] Update `server/routes.ts` to use real token service
- [ ] Replace database balance queries with blockchain queries
- [ ] Update purchase endpoints to mint real tokens
- [ ] Add migration endpoints for existing users

### 2. Frontend Updates  
- [ ] Update token balance displays to read from blockchain
- [ ] Add wallet connection flows (Internet Identity, Plug)
- [ ] Update purchase confirmation to show real transaction IDs
- [ ] Add migration UI for existing users

### 3. Database Schema Updates
```sql
-- Add blockchain tracking columns
ALTER TABLE users ADD COLUMN blockchain_principal_id TEXT;
ALTER TABLE users ADD COLUMN migrated_to_blockchain BOOLEAN DEFAULT FALSE;

-- Track real blockchain transactions
CREATE TABLE blockchain_transactions (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR REFERENCES users(id),
  transaction_type VARCHAR, -- 'purchase', 'transfer', 'burn'
  amount_tokens DECIMAL(20,8),
  blockchain_tx_id TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## Go-Live Checklist

### 1. Infrastructure Ready
- [ ] Canister deployed and verified on IC mainnet
- [ ] All platform wallets funded with correct token amounts
- [ ] Monitoring dashboards configured
- [ ] Support documentation updated

### 2. User Experience Ready
- [ ] Migration UI tested and functional
- [ ] Help documentation updated for real tokens
- [ ] Support team trained on blockchain token system
- [ ] FAQ updated with wallet connection guides

### 3. Business Operations Ready  
- [ ] Legal review of token terms updated for blockchain deployment
- [ ] Compliance verification for token operations
- [ ] Accounting procedures updated for blockchain transactions
- [ ] Insurance coverage reviewed for token custody

## Monitoring & Maintenance

### 1. Operational Monitoring
- [ ] Canister cycle balance monitoring (auto-top-up if needed)
- [ ] Transaction volume and gas cost tracking
- [ ] User migration rate monitoring
- [ ] Platform wallet balance alerts

### 2. Security Monitoring
- [ ] Unusual transaction pattern detection
- [ ] Large transfer alerts
- [ ] Unauthorized access attempt monitoring
- [ ] Regular security audit scheduling

### 3. Performance Monitoring
- [ ] Query response time tracking
- [ ] Canister CPU/memory utilization
- [ ] Failed transaction rate monitoring
- [ ] User experience metrics during migration

## Emergency Procedures

### 1. Canister Issues
- [ ] Emergency stop procedures (if critical bug found)
- [ ] Canister upgrade process for fixes
- [ ] Communication plan for downtime
- [ ] Rollback to database-only mode if needed

### 2. User Support
- [ ] Failed migration recovery procedures
- [ ] Lost wallet recovery assistance
- [ ] Transaction investigation process
- [ ] Escalation procedures for complex issues

## Success Criteria

### Technical Success
- ✅ 10 billion RWAPAWN tokens successfully deployed on ICP
- ✅ All platform features working with real blockchain tokens
- ✅ <0.1% failed transactions or errors
- ✅ Sub-second balance query response times

### Business Success  
- ✅ >95% user migration rate within 6 weeks
- ✅ Zero security incidents or token loss
- ✅ Enhanced platform credibility and user trust
- ✅ Ready for DEX listings and broader ecosystem integration

### User Experience Success
- ✅ Seamless wallet connection and token management
- ✅ Clear understanding of benefits vs database tokens
- ✅ Positive user feedback on real token ownership
- ✅ Increased platform engagement and retention

---

**Important Notes:**
- Budget ~50-100 ICP for deployment and initial operations
- Plan for 2-3 months total timeline from dev to full migration
- Have 24/7 monitoring during first weeks after go-live
- Keep database system as backup during initial migration period