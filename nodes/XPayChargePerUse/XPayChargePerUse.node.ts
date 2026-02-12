import type {
	IHookFunctions,
	IWebhookFunctions,
	IDataObject,
	INodeType,
	INodeTypeDescription,
	IWebhookResponseData,
	IHttpRequestOptions,
	NodeConnectionType,
} from 'n8n-workflow';
import * as crypto from 'crypto';

import type { ChargePricingModel } from '../../shared/types';

export class XPayChargePerUse implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'xpay✦ charge-per-use',
		name: 'xPayChargePerUse',
		icon: 'file:xpay.svg',
		group: ['trigger'],
		version: 1,
		subtitle: '={{$parameter["productName"]}}',
		description: 'Monetize your workflows with flexible pricing — customers pay per use via a hosted checkout form',
		defaults: {
			name: 'xpay✦ charge-per-use',
		},
		activationMessage: 'xpay✦ is active! Your checkout form URL is ready — check the Output panel.',
		inputs: [],
		outputs: ['main' as NodeConnectionType],
		credentials: [
			{
				name: 'xPayApi',
				required: true,
			},
		],
		webhooks: [
			{
				name: 'default',
				httpMethod: 'POST',
				responseMode: 'onReceived',
				path: 'webhook',
			},
			{
				name: 'setup',
				httpMethod: 'GET',
				responseMode: 'onReceived',
				path: 'webhook',
				restartWebhook: true,
			},
		],
		triggerPanel: {
			header: 'xpay✦ charge-per-use',
			executionsHelp: {
				inactive: 'Activate the workflow to generate your checkout form URL. POST an empty body to the webhook URL to get it.',
				active: 'Workflow is active! POST an empty body to the webhook URL shown above to get your checkout form URL.',
			},
			activationHint: 'POST an empty body {} to the webhook URL above to get your form URL, then simulate a test payment.',
		},
		properties: [
			// Instructions notice
			{
				displayName: 'After activating, POST {} to the webhook URL above to get your checkout URL. Manage all settings anytime at app.xpay.sh',
				name: 'notice',
				type: 'notice',
				default: '',
			},
			// Product Details Section
			{
				displayName: 'Product Name',
				name: 'productName',
				type: 'string',
				default: '',
				required: true,
				placeholder: 'e.g., Premium SEO Audit',
				description: 'Name displayed on the checkout page. Can be updated anytime at app.xpay.sh',
			},
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				typeOptions: {
					rows: 3,
				},
				default: '',
				placeholder: 'Brief description of what the customer will receive',
				description: 'Brief description shown below the product name. Supports basic formatting.',
			},

			// Pricing Section
			{
				displayName: 'Price',
				name: 'amount',
				type: 'number',
				default: 1.0,
				required: true,
				typeOptions: {
					minValue: 0.01,
					numberPrecision: 2,
				},
				description: 'Price in USD. Under $1: crypto wallet only. $1+: wallet or card. All payments settle in USDC on-chain.',
			},
			{
				displayName: 'Pricing Model',
				name: 'pricingModel',
				type: 'options',
				options: [
					{ name: 'Flat Per-Run', value: 'flat', description: 'Fixed price per execution' },
					{ name: 'Token-Based', value: 'token-based', description: 'Price based on input/output tokens consumed' },
					{ name: 'Dynamic Pricing', value: 'dynamic', description: 'Price varies by complexity or demand' },
					{ name: 'Time-Based', value: 'time-based', description: 'Billing per minute/hour of processing' },
					{ name: 'Per-Unit', value: 'per-unit', description: 'Per document, image, or content unit processed' },
					{ name: 'Tiered', value: 'tiered', description: 'Volume-based pricing with tier discounts' },
				],
				default: 'flat',
			},

			// Token-based pricing fields
			{
				displayName: 'Price Per Input Token ($)',
				name: 'pricePerInputToken',
				type: 'number',
				typeOptions: { minValue: 0, numberPrecision: 6 },
				default: 0.00003,
				displayOptions: { show: { pricingModel: ['token-based'] } },
				description: 'Cost per input token in USD',
			},
			{
				displayName: 'Price Per Output Token ($)',
				name: 'pricePerOutputToken',
				type: 'number',
				typeOptions: { minValue: 0, numberPrecision: 6 },
				default: 0.00006,
				displayOptions: { show: { pricingModel: ['token-based'] } },
				description: 'Cost per output token in USD',
			},
			{
				displayName: 'Estimated Tokens',
				name: 'estimatedTokens',
				type: 'number',
				typeOptions: { minValue: 0 },
				default: 1000,
				displayOptions: { show: { pricingModel: ['token-based'] } },
				description: 'Estimated total tokens for checkout display',
			},

			// Dynamic pricing fields
			{
				displayName: 'Base Price ($)',
				name: 'basePrice',
				type: 'number',
				typeOptions: { minValue: 0.01, numberPrecision: 2 },
				default: 1.0,
				displayOptions: { show: { pricingModel: ['dynamic'] } },
				description: 'Base price before complexity multiplier',
			},
			{
				displayName: 'Complexity Multiplier Min',
				name: 'complexityMultiplierMin',
				type: 'number',
				typeOptions: { minValue: 0.1, numberPrecision: 1 },
				default: 1.0,
				displayOptions: { show: { pricingModel: ['dynamic'] } },
				description: 'Minimum complexity multiplier applied to base price',
			},
			{
				displayName: 'Complexity Multiplier Max',
				name: 'complexityMultiplierMax',
				type: 'number',
				typeOptions: { minValue: 0.1, numberPrecision: 1 },
				default: 3.0,
				displayOptions: { show: { pricingModel: ['dynamic'] } },
				description: 'Maximum complexity multiplier applied to base price',
			},
			{
				displayName: 'Pricing Description',
				name: 'pricingDescription',
				type: 'string',
				default: '',
				placeholder: 'e.g., Price varies based on input complexity',
				displayOptions: { show: { pricingModel: ['dynamic'] } },
				description: 'Explanation shown to customers about how pricing varies',
			},

			// Time-based pricing fields
			{
				displayName: 'Price Per Minute ($)',
				name: 'pricePerMinute',
				type: 'number',
				typeOptions: { minValue: 0.01, numberPrecision: 2 },
				default: 0.10,
				displayOptions: { show: { pricingModel: ['time-based'] } },
				description: 'Cost per minute of processing time',
			},
			{
				displayName: 'Minimum Minutes',
				name: 'minimumMinutes',
				type: 'number',
				typeOptions: { minValue: 1 },
				default: 1,
				displayOptions: { show: { pricingModel: ['time-based'] } },
				description: 'Minimum billable minutes per execution',
			},
			{
				displayName: 'Estimated Minutes',
				name: 'estimatedMinutes',
				type: 'number',
				typeOptions: { minValue: 1 },
				default: 5,
				displayOptions: { show: { pricingModel: ['time-based'] } },
				description: 'Estimated processing time shown on checkout',
			},

			// Per-unit pricing fields
			{
				displayName: 'Price Per Unit ($)',
				name: 'pricePerUnit',
				type: 'number',
				typeOptions: { minValue: 0.01, numberPrecision: 2 },
				default: 0.50,
				displayOptions: { show: { pricingModel: ['per-unit'] } },
				description: 'Cost per unit processed',
			},
			{
				displayName: 'Unit Label',
				name: 'unitLabel',
				type: 'string',
				default: 'document',
				placeholder: 'e.g., document, image, second of video',
				displayOptions: { show: { pricingModel: ['per-unit'] } },
				description: 'What each unit represents (shown on checkout)',
			},
			{
				displayName: 'Estimated Units',
				name: 'estimatedUnits',
				type: 'number',
				typeOptions: { minValue: 1 },
				default: 10,
				displayOptions: { show: { pricingModel: ['per-unit'] } },
				description: 'Estimated number of units shown on checkout',
			},

			// Environment
			{
				displayName: 'Environment',
				name: 'environment',
				type: 'options',
				options: [
					{
						name: 'Development',
						value: 'development',
						description: 'Simulated payments for testing. No real transactions.',
					},
					{
						name: 'Staging',
						value: 'staging',
						description: 'Test network with free test tokens. Real blockchain, no real money.',
					},
					{
						name: 'Production',
						value: 'production',
						description: 'Live payments with real money. Use only when ready to go live.',
					},
				],
				default: 'development',
				description: 'Choose Development to test your workflow, Staging for test transactions, or Production for real payments.',
			},

			// Recipient Wallet
			{
				displayName: 'Recipient Wallet',
				name: 'walletType',
				type: 'options',
				options: [
					{
						name: 'Default Wallet',
						value: 'default',
						description: 'Use your xpay account wallet (created automatically when you signed up)',
					},
					{
						name: 'Custom Wallet',
						value: 'custom',
						description: 'Specify a different wallet address to receive payments',
					},
				],
				default: 'default',
				description: 'Choose where to receive payments. Manage wallets at app.xpay.sh',
			},
			{
				displayName: 'Wallet Address',
				name: 'customWalletAddress',
				type: 'string',
				default: '',
				required: true,
				placeholder: '0x742d35Cc6634C0532925a3b844Bc9e7595f8fE00',
				description: 'Your wallet address to receive USDC payments. Must be a valid Ethereum/Base address (0x...).',
				displayOptions: {
					show: {
						walletType: ['custom'],
					},
				},
			},

			// Customer Input Fields
			{
				displayName: 'Customer Form Fields',
				name: 'fields',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				default: {},
				placeholder: 'Add Field',
				description: 'Collect information from customers before payment. Data is included in the webhook payload.',
				options: [
					{
						name: 'fieldValues',
						displayName: 'Field',
						values: [
							{
								displayName: 'Field Name',
								name: 'name',
								type: 'string',
								default: '',
								placeholder: 'e.g., email',
								description: 'The field identifier (no spaces)',
							},
							{
								displayName: 'Label',
								name: 'label',
								type: 'string',
								default: '',
								placeholder: 'e.g., Email Address',
								description: 'Display label shown to customer',
							},
							{
								displayName: 'Field Type',
								name: 'type',
								type: 'options',
								options: [
									{ name: 'Text', value: 'text' },
									{ name: 'Email', value: 'email' },
									{ name: 'URL', value: 'url' },
									{ name: 'Number', value: 'number' },
									{ name: 'Textarea', value: 'textarea' },
								],
								default: 'text',
								description: 'Type of input field',
							},
							{
								displayName: 'Required',
								name: 'required',
								type: 'boolean',
								default: true,
								description: 'Whether this field is required',
							},
						],
					},
				],
			},

			// Configuration Section
			{
				displayName: 'Redirect URL',
				name: 'redirectUrl',
				type: 'string',
				default: '',
				placeholder: 'https://yoursite.com/thank-you',
				description: 'URL to redirect customers after successful payment. Leave empty to show a success message instead.',
			},
			{
				displayName: 'Enable Bundles',
				name: 'enableBundles',
				type: 'boolean',
				default: false,
				description: 'Let customers prepay for multiple runs at discounted rates. Configure tier pricing at app.xpay.sh after activation.',
			},

			// Advanced Options
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				options: [
					{
						displayName: 'Webhook URL Override',
						name: 'webhookUrlOverride',
						type: 'string',
						default: '',
						placeholder: 'https://your-n8n-domain.com/webhook/...',
						description: 'Override the webhook callback URL. Use this if your n8n is behind a reverse proxy and the auto-detected URL includes an internal port.',
					},
				],
			},
		],
	};

	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');
				return webhookData.checkoutId !== undefined;
			},

			async create(this: IHookFunctions): Promise<boolean> {
				let webhookUrl = this.getNodeWebhookUrl('default') as string;
				const credentials = await this.getCredentials('xPayApi');

				// Auto-fix: Strip internal n8n ports for reverse proxy setups
				if (webhookUrl) {
					try {
						const urlObj = new URL(webhookUrl);
						const internalPorts = ['5678', '5679', '5680'];
						if (internalPorts.includes(urlObj.port)) {
							urlObj.port = '';
							webhookUrl = urlObj.toString();
							console.log(`xpay✦: Auto-fixed webhook URL (removed internal port): ${webhookUrl}`);
						}
					} catch {
						// URL parsing failed, use as-is
					}
				}

				// Check for webhook URL override
				const options = this.getNodeParameter('options', {}) as IDataObject;
				if (options.webhookUrlOverride && typeof options.webhookUrlOverride === 'string' && options.webhookUrlOverride.trim() !== '') {
					webhookUrl = options.webhookUrlOverride.trim();
				}

				// Get node parameters
				const productName = this.getNodeParameter('productName') as string;
				const walletType = this.getNodeParameter('walletType', 'default') as string;

				// Determine recipient wallet
				let recipientWallet = '';
				if (walletType === 'custom') {
					recipientWallet = this.getNodeParameter('customWalletAddress', '') as string;
					if (!recipientWallet || !/^0x[a-fA-F0-9]{40}$/.test(recipientWallet)) {
						throw new Error('Invalid wallet address. Must be 42 characters starting with 0x (e.g., 0x742d35Cc6634C0532925a3b844Bc9e7595f8fE00)');
					}
				}

				const description = this.getNodeParameter('description', '') as string;
				const amount = this.getNodeParameter('amount') as number;
				const pricingModel = this.getNodeParameter('pricingModel', 'flat') as ChargePricingModel;
				const environment = this.getNodeParameter('environment', 'development') as string;
				const fieldsData = this.getNodeParameter('fields') as IDataObject;
				const redirectUrl = this.getNodeParameter('redirectUrl', '') as string;
				const enableBundles = this.getNodeParameter('enableBundles', false) as boolean;

				// Build pricing config based on model
				const pricingConfig: Record<string, any> = {};
				if (pricingModel === 'token-based') {
					pricingConfig.pricePerInputToken = this.getNodeParameter('pricePerInputToken', 0.00003) as number;
					pricingConfig.pricePerOutputToken = this.getNodeParameter('pricePerOutputToken', 0.00006) as number;
					pricingConfig.estimatedTokens = this.getNodeParameter('estimatedTokens', 1000) as number;
				} else if (pricingModel === 'dynamic') {
					pricingConfig.basePrice = this.getNodeParameter('basePrice', 1.0) as number;
					pricingConfig.complexityRange = [
						this.getNodeParameter('complexityMultiplierMin', 1.0) as number,
						this.getNodeParameter('complexityMultiplierMax', 3.0) as number,
					];
					pricingConfig.pricingDescription = this.getNodeParameter('pricingDescription', '') as string;
				} else if (pricingModel === 'time-based') {
					pricingConfig.pricePerMinute = this.getNodeParameter('pricePerMinute', 0.10) as number;
					pricingConfig.minimumMinutes = this.getNodeParameter('minimumMinutes', 1) as number;
					pricingConfig.estimatedMinutes = this.getNodeParameter('estimatedMinutes', 5) as number;
				} else if (pricingModel === 'per-unit') {
					pricingConfig.pricePerUnit = this.getNodeParameter('pricePerUnit', 0.50) as number;
					pricingConfig.unitLabel = this.getNodeParameter('unitLabel', 'document') as string;
					pricingConfig.estimatedUnits = this.getNodeParameter('estimatedUnits', 10) as number;
				}

				// Derive testMode and network from environment
				let testMode = true;
				let network = 'base-sepolia';
				if (environment === 'staging') {
					testMode = false;
					network = 'base-sepolia';
				} else if (environment === 'production') {
					testMode = false;
					network = 'base';
				}

				// Format fields for API
				const fields = ((fieldsData.fieldValues as IDataObject[]) || []).map((field) => ({
					name: field.name,
					label: field.label,
					type: field.type,
					required: field.required,
				}));

				// Determine API base URL based on environment selection
				const apiBaseUrls: Record<string, string> = {
					development: 'https://cja09z457f.execute-api.us-east-1.amazonaws.com/dev',
					staging: 'https://hkrqani0b0.execute-api.us-east-1.amazonaws.com/staging',
					production: 'https://m8efqvrb1b.execute-api.us-east-1.amazonaws.com/prod',
				};
				const apiBaseUrl = apiBaseUrls[environment] || apiBaseUrls.development;

				// Register webhook with xPay API
				const requestOptions: IHttpRequestOptions = {
					method: 'POST',
					url: `${apiBaseUrl}/v1/webhooks/register`,
					body: {
						callback_url: webhookUrl,
						config: {
							product_name: productName,
							description: description,
							price: amount,
							currency: 'USDC',
							network: network,
							recipient_wallet: recipientWallet,
							fields: fields,
							redirect_url: redirectUrl,
							test_mode: testMode,
							bundles_enabled: enableBundles || pricingModel === 'tiered',
							pricing_model: pricingModel,
							pricing_config: pricingConfig,
						},
					},
					json: true,
				};

				try {
					const response = (await this.helpers.httpRequestWithAuthentication.call(
						this,
						'xPayApi',
						requestOptions,
					)) as {
						checkout_id: string;
						checkout_url: string;
						webhook_secret: string;
					};

					// Store checkout data in workflow static data
					const webhookData = this.getWorkflowStaticData('node');
					webhookData.checkoutId = response.checkout_id;
					webhookData.checkoutUrl = response.checkout_url;
					webhookData.webhookSecret = response.webhook_secret;
					webhookData.environment = environment;

					console.log('\n========================================');
					console.log('xpay✦ charge-per-use Checkout Generated!');
					console.log('========================================');
					console.log(`Product: ${productName}`);
					console.log(`Price: $${amount} USDC (${pricingModel})`);
					console.log(`Form URL: ${response.checkout_url}`);
					console.log('========================================');
					console.log('Share this link with your customers to start the workflow.\n');

					return true;
				} catch (error) {
					console.warn('xPay API registration failed:', error);
					console.warn('Workflow will accept webhooks but checkout URL is not available.');

					const webhookData = this.getWorkflowStaticData('node');
					webhookData.checkoutId = 'local-test';
					webhookData.webhookSecret = 'test-secret';

					return true;
				}
			},

			async delete(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');
				const checkoutId = webhookData.checkoutId as string;
				const environment = (webhookData.environment as string) || 'development';

				if (!checkoutId || checkoutId === 'local-test') {
					return true;
				}

				const apiBaseUrls: Record<string, string> = {
					development: 'https://cja09z457f.execute-api.us-east-1.amazonaws.com/dev',
					staging: 'https://hkrqani0b0.execute-api.us-east-1.amazonaws.com/staging',
					production: 'https://m8efqvrb1b.execute-api.us-east-1.amazonaws.com/prod',
				};
				const apiBaseUrl = apiBaseUrls[environment] || apiBaseUrls.development;

				try {
					await this.helpers.httpRequestWithAuthentication.call(this, 'xPayApi', {
						method: 'DELETE',
						url: `${apiBaseUrl}/v1/webhooks/${checkoutId}`,
						json: true,
					});
				} catch (error) {
					console.warn('Failed to delete webhook:', error);
				}

				delete webhookData.checkoutId;
				delete webhookData.checkoutUrl;
				delete webhookData.webhookSecret;
				delete webhookData.environment;

				return true;
			},
		},
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const webhookName = this.getWebhookName();
		const req = this.getRequestObject();
		const webhookData = this.getWorkflowStaticData('node');

		// Handle GET request - show checkout URL info page
		if (webhookName === 'setup' || req.method === 'GET') {
			const checkoutUrl = webhookData.checkoutUrl as string;
			const productName = this.getNodeParameter('productName') as string;
			const amount = this.getNodeParameter('amount') as number;

			const html = `
<!DOCTYPE html>
<html>
<head>
    <title>xpay✦ charge-per-use Checkout Ready</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; background: #f5f5f5; }
        .card { background: white; border-radius: 12px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        h1 { color: #00DC9C; margin-top: 0; }
        .url-box { background: #f0fdf4; border: 2px solid #00DC9C; border-radius: 8px; padding: 15px; margin: 20px 0; word-break: break-all; }
        .copy-btn { background: #00DC9C; color: #000; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-size: 16px; margin-top: 10px; font-weight: 700; }
        .copy-btn:hover { background: #00B07D; }
        .info { color: #666; margin-top: 20px; }
        .test-btn { display: inline-block; background: #0F1C4D; color: white; text-decoration: none; padding: 12px 24px; border-radius: 6px; margin-top: 10px; }
    </style>
</head>
<body>
    <div class="card">
        <h1>xpay✦ charge-per-use Checkout Ready!</h1>
        <p><strong>Product:</strong> ${productName}</p>
        <p><strong>Price:</strong> $${amount} USDC</p>

        <h3>Your Checkout Form URL:</h3>
        <div class="url-box" id="checkoutUrl">${checkoutUrl || 'URL not available yet'}</div>
        <button class="copy-btn" onclick="navigator.clipboard.writeText('${checkoutUrl}'); this.textContent='Copied!'">Copy URL</button>

        ${checkoutUrl ? `<p><a href="${checkoutUrl}" target="_blank" class="test-btn">Open Checkout Form</a></p>` : ''}

        <div class="info">
            <p><strong>Next Steps:</strong></p>
            <ol>
                <li>Copy the form URL above</li>
                <li>Share it with your customers</li>
                <li>When they pay, your n8n workflow will trigger!</li>
            </ol>
        </div>
    </div>
</body>
</html>`;

			return {
				webhookResponse: {
					status: 200,
					headers: { 'Content-Type': 'text/html' },
					body: html,
				},
			};
		}

		// Handle POST request - actual payment webhook
		const body = this.getBodyData() as IDataObject;
		const headers = this.getHeaderData() as IDataObject;
		const webhookSecret = webhookData.webhookSecret as string;
		const checkoutUrl = webhookData.checkoutUrl as string;

		// Derive testMode from environment
		const environment = this.getNodeParameter('environment', 'development') as string;
		const testMode = environment === 'development';

		// If empty body or _getInfo flag, return helpful info
		if (!body || Object.keys(body).length === 0 || body._getInfo) {
			return {
				webhookResponse: {
					status: 200,
					body: {
						message: 'xpay✦ charge-per-use is listening!',
						form_url: checkoutUrl,
						checkout_id: webhookData.checkoutId,
						test_mode: testMode,
						instructions: testMode
							? 'Test mode is ON. Send a POST with {"payment": {"amount": 1}, "input": {"email": "test@example.com"}} to simulate a payment.'
							: 'Share the form_url with customers. When they pay, this webhook will receive the payment data.',
					},
				},
			};
		}

		// In test mode, skip signature verification for easier testing
		const skipSignatureVerification = testMode || webhookSecret === 'test-secret';

		if (!skipSignatureVerification) {
			const signature = headers['x-xpay-signature'] as string;
			const timestamp = headers['x-xpay-timestamp'] as string;

			if (!signature || !timestamp) {
				return {
					webhookResponse: {
						status: 401,
						body: { error: 'Missing signature headers' },
					},
				};
			}

			// Verify HMAC signature
			const payload = `${timestamp}.${JSON.stringify(body)}`;
			const expectedSignature = crypto
				.createHmac('sha256', webhookSecret)
				.update(payload)
				.digest('hex');

			const signatureValue = signature.replace('sha256=', '');
			if (signatureValue !== expectedSignature) {
				return {
					webhookResponse: {
						status: 401,
						body: { error: 'Invalid signature' },
					},
				};
			}

			// Check timestamp is recent (within 5 minutes)
			const timestampNum = parseInt(timestamp, 10);
			const now = Math.floor(Date.now() / 1000);
			if (Math.abs(now - timestampNum) > 300) {
				return {
					webhookResponse: {
						status: 401,
						body: { error: 'Timestamp too old' },
					},
				};
			}
		}

		// Extract payment, customer input, and pricing data
		const payment = (body.payment as IDataObject) || {};
		const customerInput = (body.input as IDataObject) || (body.customer_input as IDataObject) || {};
		const pricing = (body.pricing as IDataObject) || {};

		// Return data to workflow
		return {
			workflowData: [
				[
					{
						json: {
							payment: {
								txHash: payment.txHash || payment.tx_hash || '',
								amount: payment.amount || 0,
								currency: payment.currency || 'USDC',
								payer: payment.payer || payment.payer_address || '',
								network: payment.network || 'base',
								timestamp: payment.timestamp || Date.now(),
							},
							input: customerInput,
							pricing,
							metadata: {
								checkoutId: webhookData.checkoutId,
								receivedAt: new Date().toISOString(),
							},
						},
					},
				],
			],
			webhookResponse: {
				status: 200,
				body: { success: true },
			},
		};
	}
}
