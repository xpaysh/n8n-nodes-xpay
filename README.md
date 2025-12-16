# n8n-nodes-xpay

**Monetize your n8n workflows with crypto payments.**

Turn any n8n workflow into a paid service in 60 seconds. Accept USDC payments on Base - no coding required.

## How It Works

1. Drag the **xPay Payment Trigger** node onto your canvas
2. Configure your product name and price
3. Add any customer input fields you need
4. Activate the workflow - you'll get a shareable payment link
5. Share the link with customers
6. When they pay, your workflow runs automatically

## Installation

### In n8n (Recommended)

1. Go to **Settings > Community Nodes**
2. Click **Install a community node**
3. Enter `n8n-nodes-xpay`
4. Click **Install**

### Manual Installation

```bash
npm install n8n-nodes-xpay
```

## Quick Start

### 1. Get Your API Key

1. Sign up at [app.xpay.sh](https://app.xpay.sh)
2. Go to **Settings > API Keys**
3. Create a new API key
4. Copy the secret key

### 2. Add Credentials in n8n

1. Go to **Credentials** in n8n
2. Click **Add Credential**
3. Search for "xPay API"
4. Paste your API secret
5. Choose **Sandbox** for testing or **Production** for real payments

### 3. Create Your First Paid Workflow

1. Create a new workflow
2. Add the **xPay Payment Trigger** node
3. Configure:
   - **Product Name**: "Premium SEO Audit"
   - **Price**: 5.00 (USDC)
   - **Recipient Wallet**: Your wallet address
   - **Customer Fields**: Add "email" and "website" fields
4. Connect your other nodes (e.g., HTTP Request, Send Email)
5. **Activate** the workflow
6. Check the logs for your checkout URL: `https://start.xpay.sh/p/...`

### 4. Test in Sandbox Mode

With **Test Mode** enabled:
- No real payments required
- Click "Simulate Payment" on the checkout page
- Workflow triggers immediately for testing

## Node Properties

| Property | Description |
|----------|-------------|
| **Product Name** | What customers are paying for |
| **Description** | Brief description shown on payment page |
| **Price (USDC)** | Amount in USDC (e.g., 5.00 = $5) |
| **Network** | Base (production) or Base Sepolia (testnet) |
| **Recipient Wallet** | Your wallet address to receive payments |
| **Customer Form Fields** | Input fields customers must fill |
| **Redirect URL** | Where to send customers after payment |
| **Test Mode** | Enable sandbox mode (no real payments) |

## Output Data

When a payment is received, the workflow gets:

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

## Use Cases

- **SEO Audits**: Charge $10 per website audit
- **Report Generation**: Sell custom reports
- **API Access**: Monetize your APIs per-request
- **Consultations**: Accept payment before scheduling
- **Digital Products**: Deliver files after payment
- **Lead Generation**: Qualify leads with payment

## Security

- **Non-custodial**: Payments go directly to your wallet
- **Signature verification**: All webhooks are HMAC-signed
- **Replay protection**: Each payment can only trigger once
- **Timestamp validation**: Old requests are rejected

## Support

- Documentation: [docs.xpay.sh/integrations/n8n](https://docs.xpay.sh/integrations/n8n)
- Issues: [GitHub Issues](https://github.com/xpay-sh/n8n-nodes-xpay/issues)
- Email: xpaysh@gmail.com

## License

MIT
