# 🏗️ Master Prompt: Build `n8n-nodes-xpay` (V2 - "The Launcher")

**Role:** Senior TypeScript Developer & n8n Ecosystem Expert.
**Goal:** Build the `n8n-nodes-xpay` package.
**Concept:** A "Pay-to-Start" Trigger Node. It generates a `start.xpay.sh` link that gates the workflow execution behind a crypto payment.

---

## 📋 Phase 1: Setup & Config

**Instruction:** Initialize project from `n8n-nodes-starter`.

1.  **`package.json`**:
    * Name: `n8n-nodes-xpay`
    * Keywords: Add `n8n-community-node-package` (Critical for discovery).
    * Description: "The Crypto Paywall for n8n. Gate your workflows with xPay."
    * License: MIT.

2.  **`tsconfig.json`**: Standard ES2019 target.

---

## 🔐 Phase 2: Credentials

**Instruction:** Create `nodes/XPayApi/XPayApi.credentials.ts`.

* **Class:** `XPayApi`
* **Properties:**
    * `apiKey`: String (Password). Label: "xPay API Secret".
    * `environment`: Options (`Production` | `Sandbox`). Default: `Sandbox`.
* **Help Text:** "Get your keys at app.xpay.sh."

---

## ⚡ Phase 3: The Trigger Node (`XPayTrigger.node.ts`)

**Instruction:** Implement the core logic.

* **Name:** `xPayTrigger`
* **Display:** "xPay Start Gate"
* **Description:** "Pauses workflow until a payment is confirmed via start.xpay.sh."
* **Icon:** `file:xpay.svg`

**UI Inputs (Properties):**
1.  `productName` (String): "What is the user paying for?" (e.g., SEO Audit).
2.  `amount` (Number): Price (e.g., 5.00).
3.  `currency` (Options): `USDC`, `ETH`, `SOL`.
4.  `redirectUrl` (String, Optional): "Where to send user after payment?"
5.  `testMode` (Boolean): "Enable Sandbox Mode?"

**Webhook Registration (The "Handshake"):**
* **Trigger:** On workflow activation.
* **Request:** `POST https://api.xpay.sh/v1/webhooks/register`
* **Payload:**
    ```json
    {
      "target_url": "$WEBHOOK_URL",
      "settings": {
        "price": $amount,
        "currency": $currency,
        "product_name": $productName,
        "test_mode": $testMode
      }
    }
    ```
* **API Response Handling:**
    * The API will return: `{ "checkout_url": "https://start.xpay.sh/p/uuid-123" }`
    * **CRITICAL:** You must log this URL to the n8n execution console/UI so the builder can copy it.

**Execution Logic:**
* **Validate:** Check `X-xPay-Signature` header.
* **Output:** Return `{ "payment": {...}, "customer_input": {...} }`.

---

## 📄 Phase 4: README (The Sales Pitch)

**Instruction:** Write a high-conversion README.

* **Title:** "Monetize n8n with xPay"
* **Hook:** "Turn your workflows into revenue streams in 60 seconds."
* **Usage:**
    1.  Drag "xPay Start Gate" to canvas.
    2.  Set Price.
    3.  Send the generated `start.xpay.sh` link to users.
    4.  Get paid in USDC/SOL instantly.

---

## 🚀 Phase 5: Deployment Scripts

**Instruction:** Provide commands for:
1.  `npm run build`
2.  `npm link` (Local testing).
3.  `npm publish --access public`.