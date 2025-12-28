# n8n-nodes-xpay

[![npm version](https://img.shields.io/npm/v/@xpaysh/n8n-nodes-xpay.svg)](https://www.npmjs.com/package/@xpaysh/n8n-nodes-xpay)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

This is an n8n community node that enables you to monetize your n8n workflows with USDC payments on Base. Turn any workflow into a paid service in 60 seconds using [xpay](https://xpay.sh).

## Overview

The **xpay pay-to-run trigger** node creates a hosted payment form for your workflow. When a customer pays, your workflow runs automatically with their payment and form data.

**Key Features:**
- Accept USDC payments on Base network
- Hosted Pay to Run form - no frontend required
- Custom form fields for customer input
- Non-custodial - payments go directly to your wallet
- Sandbox mode for testing without real payments

## Installation

### n8n Cloud

1. Open **Settings > Community Nodes**
2. Click **Install a community node**
3. Enter `@xpaysh/n8n-nodes-xpay`
4. Click **Install**

### Self-Hosted n8n

```bash
npm install @xpaysh/n8n-nodes-xpay
```

Or via n8n UI:
1. Go to **Settings > Community Nodes**
2. Click **Install a community node**
3. Enter `@xpaysh/n8n-nodes-xpay`
4. Click **Install**

### Development

```bash
# Clone the repository
git clone https://github.com/xpaysh/n8n-nodes-xpay.git
cd n8n-nodes-xpay

# Install dependencies
npm install

# Build the node
npm run build

# Link to your n8n installation
npm link
cd ~/.n8n/custom
npm link @xpaysh/n8n-nodes-xpay
```

## Authentication

1. Sign up at [app.xpay.sh](https://app.xpay.sh)
2. Go to **Settings > API Keys**
3. Create a new API key
4. In n8n, go to **Credentials > Add Credential**
5. Search for "xpay API"
6. Paste your API key
7. Select environment: **Sandbox** (testing) or **Production** (real payments)

## Getting Started

### 1. Create a Paid Workflow

1. Create a new workflow in n8n
2. Add the **xpay pay-to-run trigger** node
3. Configure:
   - **Product Name**: e.g., "Premium SEO Audit"
   - **Price**: e.g., 5.00 (prices $1+ accept card payments)
   - **Environment**: Development (for testing)
   - **Recipient Wallet**: Default Wallet or Custom Wallet
   - **Customer Fields**: Add fields like "email", "website"
4. Connect your workflow nodes (HTTP Request, Send Email, etc.)
5. **Activate** the workflow

### 2. Get Your Pay to Run Form URL

**Option A: POST to Webhook URL (Recommended)**

```bash
curl -X POST <your-webhook-url>
```

Response:
```json
{
  "message": "xpay pay-to-run trigger is listening!",
  "form_url": "https://run.xpay.sh/p/chk_abc123",
  "test_mode": true
}
```

**Option B: Check n8n Logs**

After activating, check your n8n server logs for the form URL.

### 3. Test in Development Mode

With **Environment: Development**:
- Simulated payments - no real transactions
- Signature verification is skipped
- Use "Simulate Payment" on the form, or POST test data:

```bash
curl -X POST <your-webhook-url> \
  -H "Content-Type: application/json" \
  -d '{"payment":{"amount":5},"input":{"email":"test@example.com"}}'
```

## Node Properties

| Property | Description |
|----------|-------------|
| **Product Name** | Display name shown on payment form |
| **Description** | Brief description of what customer is paying for |
| **Price** | Amount in USD. Under $1: crypto wallet only. $1+: wallet or card. All payments settle in USDC. |
| **Environment** | Development (simulated), Staging (test network), or Production (real money) |
| **Recipient Wallet** | Default Wallet (your xpay account) or Custom Wallet (specify address) |
| **Customer Fields** | Custom input fields for customers to fill |
| **Redirect URL** | Optional URL to redirect after payment |
| **Enable Bundles** | Let customers prepay for multiple runs at discounted rates |

## Output Data

When a payment is received, your workflow receives:

```json
{
  "payment": {
    "txHash": "0x123...",
    "amount": 5.00,
    "currency": "USDC",
    "payer": "0xABC...",
    "network": "base",
    "timestamp": 1702841234
  },
  "input": {
    "email": "customer@example.com",
    "website": "https://example.com"
  },
  "metadata": {
    "checkoutId": "chk_abc123",
    "receivedAt": "2024-12-17T10:00:00.000Z"
  }
}
```

## Environment Modes

| Environment | Payments | Network | Use Case |
|-------------|----------|---------|----------|
| **Development** | Simulated (no real transactions) | Base Sepolia | Testing workflow logic |
| **Staging** | Real test tokens (free) | Base Sepolia | Testing with actual blockchain |
| **Production** | Real USDC | Base Mainnet | Live payments |

**Note:** When testing in n8n (clicking "Execute workflow"), a temporary checkout is created. For a persistent URL, **Activate** the workflow.

## Use Cases

- **SEO Audits**: Charge per website audit
- **Report Generation**: Sell custom data reports
- **API Access**: Monetize per-request API usage
- **Consultations**: Accept payment before scheduling
- **Digital Products**: Deliver files after payment
- **Lead Generation**: Qualify leads with payment intent

## Security

- **Non-custodial**: Payments flow directly to your wallet
- **HMAC signatures**: Webhooks are signed (production mode)
- **Replay protection**: Each payment triggers only once
- **Timestamp validation**: Stale requests are rejected

## Compatibility

- **n8n version**: 1.0.0+
- **Node.js**: 18.10+
- **Networks**: Base Mainnet, Base Sepolia

## Resources

- [xpay Documentation](https://docs.xpay.sh)
- [xpay Dashboard](https://app.xpay.sh)
- [n8n Community Nodes Guide](https://docs.n8n.io/integrations/community-nodes/)

## Support

- **Issues**: [GitHub Issues](https://github.com/xpaysh/n8n-nodes-xpay/issues)
- **Email**: xpaysh@gmail.com
- **Website**: [xpay.sh](https://xpay.sh)

## Development & Publishing

### Setup

```bash
git clone https://github.com/xpaysh/n8n-nodes-xpay.git
cd n8n-nodes-xpay
npm install
npm run build
```

### Publishing Checklist

Before publishing a new version:

1. **Update code** - Make your changes to `nodes/XPayTrigger/XPayTrigger.node.ts`
2. **Update README** - Update this file if properties or behavior changed
3. **Bump version** - Update version in `package.json`
4. **Build** - Run `npm run build` and verify no errors
5. **Test locally** - Link to local n8n and test the node works
6. **Commit** - `git add . && git commit -m "description"`
7. **Push** - `git push origin main`
8. **Publish** - Run the publish command below

### Publishing Commands

```bash
# Login to npm (required if token expired)
npm login

# Publish with public access (scoped package)
npm publish --access public
```

### Version Bumping

```bash
# Patch release (0.1.3 -> 0.1.4) - bug fixes
npm version patch

# Minor release (0.1.3 -> 0.2.0) - new features
npm version minor

# Major release (0.1.3 -> 1.0.0) - breaking changes
npm version major
```

### Post-Publish

After publishing:
1. Verify on npm: https://www.npmjs.com/package/@xpaysh/n8n-nodes-xpay
2. Test installation: `npm install @xpaysh/n8n-nodes-xpay`
3. Create GitHub release with changelog (optional)

## License

[MIT](LICENSE)
