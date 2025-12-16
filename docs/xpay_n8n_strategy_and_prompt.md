# xPay n8n Integration: Strategy & Master Build Plan

**Version:** 2.0 (Trigger-First Architecture)
**Date:** December 2025
**Objective:** Launch the `n8n-nodes-xpay` package to enable "Payment Triggers" for agent workflows.

---

## 🧠 Part 1: Strategic Decisions & FAQ

### 1. Trigger Node vs. Intermediate Node
**Decision: Start with Trigger Node Only (V1).**

* **Why?**
    * **The "Pause" Problem:** If xPay is an *intermediate* node (in the middle of a workflow), n8n requires the workflow to "pause and wait" for an external callback. While n8n supports this (via "Wait" nodes), it creates a huge UX gap: *How does the user get the payment link?*
    * If you build an intermediate node, you force the developer to build a complex logic: `Agent Work -> Send Email with Link -> Wait for Payment -> Resume`.
    * **The "Trigger" Advantage:** It replaces the "Start" button. The workflow *only* runs if paid. This handles 90% of use cases (SEO Audits, Paid Reports, Premium Alerts) with 0% friction.

### 2. Testing & Simulation
**Decision: Built-in "Sandbox Mode".**

* **Mechanism:** Add a boolean toggle in the node settings: `Test Mode (Sandbox)`.
* **Behavior:**
    * **Production:** The generated link (`pay.xpay.sh/...`) connects to Mainnet (Base/Solana). Real money must move.
    * **Sandbox:** The generated link opens a "Mock Payment" page. It shows a big yellow banner: *"Test Mode"*. The user clicks "Simulate Payment," and xPay fires the webhook instantly without touching the blockchain.
    * **Why?** This allows builders to test their entire n8n flow (Email sending, PDF generation) without draining their own crypto wallets.

### 3. Branding & Domains (Solving the Confusion)
**Decision: Separate "Infrastructure" from "Marketplace".**

* **The Confusion:** You are right. If a developer uses "xPay" infrastructure, seeing a "GlyphRun" URL feels like a bait-and-switch.
* **The Fix:** Use a dedicated subdomain for these headless payment forms.
    * **Checkout URL:** `https://pay.xpay.sh/p/{node_id}` (Clean, neutral, infrastructure-branded).
    * **Dashboard:** `https://app.xpay.sh` (Transaction history, API keys).
    * **Docs:** `https://docs.xpay.sh` (Update with "Integrations > n8n").
    * **GlyphRun:** Remains the *consumer marketplace* where these tools can *optionally* be listed later.

---

## 🛠️ Part 2: Product Requirements (PRD)

### The "xPay Payment Trigger"
A strict "Pay-to-Run" gate. The workflow execution ID is only created *after* the payment is confirmed.

**User Flow:**
1.  **Builder** drags `xPay Trigger` onto the canvas.
2.  **Builder** configures:
    * `Name`: "Premium SEO Audit"
    * `Price`: 5.00 USDC
    * `Inputs`: [Email], [Website URL]
    * `Mode`: Sandbox (Test)
3.  **Node Output:**
    * `Payment URL`: `https://pay.xpay.sh/p/abc-123`
4.  **End User** visits URL $\rightarrow$ Fills Form $\rightarrow$ Pays.
5.  **n8n Workflow** starts.

**Data Payload (What n8n receives):**
```json
{
  "payment": {
    "txHash": "0x123...",
    "amount": 5.00,
    "currency": "USDC",
    "payer": "0xABC...",
    "network": "base"
  },
  "input": {
    "email": "customer@gmail.com",
    "website": "example.com"
  }
}