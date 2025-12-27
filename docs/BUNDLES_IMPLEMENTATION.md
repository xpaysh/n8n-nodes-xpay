# Bundles Feature Implementation

This document describes the bundles feature implementation in the n8n XPay trigger node.

## Overview

The XPayTrigger node now supports enabling bundles for checkouts. When enabled, customers can purchase prepaid run bundles at discounted rates instead of paying per-run.

## Changes

### XPayTrigger.node.ts

Added new property `enableBundles` to the node configuration:

```typescript
{
  displayName: 'Enable Bundles',
  name: 'enableBundles',
  type: 'boolean',
  default: false,
  description: 'Allow customers to purchase run bundles at discounted rates. Configure bundle tiers in the xpay dashboard (app.xpay.sh).',
}
```

Location: After the `recipientWallet` property (~line 210)

### Webhook Registration

The `enableBundles` value is included in the webhook registration request:

```typescript
const config = {
  product_name: productName,
  description,
  price,
  currency,
  network,
  recipient_wallet: recipientWallet,
  fields: formattedFields,
  redirect_url: redirectUrl,
  callback_url: webhookUrl,
  test_mode: testMode,
  bundles_enabled: this.getNodeParameter('enableBundles', false) as boolean,  // NEW
};
```

Location: In the webhook activation method (~line 301)

## Usage

1. Add the XPay Trigger node to your workflow
2. Configure the checkout settings (product name, price, etc.)
3. Enable "Enable Bundles" checkbox if you want to offer bundle pricing
4. Save and activate the workflow
5. Configure bundle tiers in the xpay dashboard (app.xpay.sh)

## Bundle Flow

When bundles are enabled:

1. Customers see a toggle to switch between "Single Run" and "Bundle" mode
2. Bundle mode shows available tiers with pricing
3. Customer purchases a bundle and receives an API token
4. Customer uses the API token to consume runs without additional payment
5. Each run consumption triggers the n8n webhook as normal

## Backend Integration

The `bundles_enabled` flag is sent to:
- `POST /v1/webhooks/register` - Initial checkout registration

The backend handles:
- Storing the bundles_enabled flag in the checkout record
- Returning bundle tiers via `GET /v1/checkouts/{id}`
- Processing bundle purchases and run consumption

## Configuration

Bundle tiers are configured in the xpay-app dashboard:
- Navigate to Pay-to-Run > Your Checkout > Configure Bundles
- Enable bundles toggle
- Add preset tiers or create custom tiers
- Save changes

## File Changes

```
nodes/XPayTrigger/XPayTrigger.node.ts
├── Added enableBundles property definition
└── Include bundles_enabled in webhook registration
```

## Version

This feature was added in version 0.1.1 of the n8n-nodes-xpay package.
