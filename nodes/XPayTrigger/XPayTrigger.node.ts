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

export class XPayTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'xpay✦ pay-to-run trigger',
		name: 'xPayTrigger',
		icon: 'file:xpay.svg',
		group: ['trigger'],
		version: 1,
		subtitle: '={{$parameter["productName"]}}',
		description: 'Starts the workflow when a customer pays via your hosted beautiful Pay to Run form',
		defaults: {
			name: 'xpay✦ pay-to-run trigger',
		},
		// Show activation message with checkout URL
		activationMessage: 'xpay✦ is active! Your Pay to Run form URL is ready - check the Output panel.',
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
		// Custom trigger panel text
		triggerPanel: {
			header: 'xpay✦ pay-to-run trigger',
			executionsHelp: {
				inactive: 'Activate the workflow to generate your Pay to Run form URL. POST an empty body to the webhook URL to get it.',
				active: 'Workflow is active! POST an empty body to the webhook URL shown above to get your Pay to Run form URL.',
			},
			activationHint: 'Activate the workflow (not just test) to keep your Pay to Run form URL active.',
		},
		properties: [
			// Instructions notice with actual content
			{
				displayName: 'After activating, POST an empty body {} to the webhook URL above. You will receive your Pay to Run form URL in the response.',
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
				description: 'The name of what customers are paying for',
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
				description: 'A short description shown on the payment page',
			},

			// Pricing Section
			{
				displayName: 'Price (USDC)',
				name: 'amount',
				type: 'number',
				default: 1.0,
				required: true,
				typeOptions: {
					minValue: 0.01,
					numberPrecision: 2,
				},
				description: 'Price in USDC (e.g., 5.00 for $5)',
			},
			{
				displayName: 'Network',
				name: 'network',
				type: 'options',
				options: [
					{
						name: 'Base',
						value: 'base',
						description: 'Base Mainnet (production)',
					},
					{
						name: 'Base Sepolia',
						value: 'base-sepolia',
						description: 'Base Sepolia (testnet)',
					},
				],
				default: 'base-sepolia',
				description: 'Blockchain network for payments',
			},

			// Recipient Wallet
			{
				displayName: 'Recipient Wallet',
				name: 'recipientWallet',
				type: 'string',
				default: '',
				required: true,
				placeholder: '0x742d35Cc6634C0532925a3b844Bc9e7595f8fE00',
				description: 'Your Ethereum wallet address (42 characters, starting with 0x)',
				validateType: 'string',
				typeOptions: {
					validationMessage: 'Must be a valid Ethereum address (42 characters starting with 0x)',
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
				description: 'Form fields the customer must fill before paying',
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
				description: 'Where to send customers after successful payment (optional)',
			},
			{
				displayName: 'Test Mode',
				name: 'testMode',
				type: 'boolean',
				default: true,
				description: 'Whether to enable sandbox mode (no real payments required)',
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
				const webhookUrl = this.getNodeWebhookUrl('default');
				const credentials = await this.getCredentials('xPayApi');

				// Get node parameters
				const productName = this.getNodeParameter('productName') as string;
				const recipientWallet = this.getNodeParameter('recipientWallet') as string;

				// Validate wallet address format
				if (!recipientWallet || !/^0x[a-fA-F0-9]{40}$/.test(recipientWallet)) {
					throw new Error('Invalid wallet address. Must be 42 characters starting with 0x (e.g., 0x742d35Cc6634C0532925a3b844Bc9e7595f8fE00)');
				}
				const description = this.getNodeParameter('description', '') as string;
				const amount = this.getNodeParameter('amount') as number;
				const network = this.getNodeParameter('network') as string;
				const fieldsData = this.getNodeParameter('fields') as IDataObject;
				const redirectUrl = this.getNodeParameter('redirectUrl', '') as string;
				const testMode = this.getNodeParameter('testMode') as boolean;

				// Format fields for API
				const fields = ((fieldsData.fieldValues as IDataObject[]) || []).map((field) => ({
					name: field.name,
					label: field.label,
					type: field.type,
					required: field.required,
				}));

				// Determine API base URL
				// TODO: Update to api.xpay.sh once DNS is configured
				const apiBaseUrl =
					credentials.environment === 'production'
						? 'https://cja09z457f.execute-api.us-east-1.amazonaws.com/dev'
						: 'https://cja09z457f.execute-api.us-east-1.amazonaws.com/dev';

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

					// Log the checkout URL for the builder to copy
					console.log('\n========================================');
					console.log('xpay✦ Pay to Run Form Generated!');
					console.log('========================================');
					console.log(`Product: ${productName}`);
					console.log(`Price: $${amount} USDC`);
					console.log(`Form URL: ${response.checkout_url}`);
					console.log('========================================');
					console.log('Share this link with your customers to start the workflow.\n');

					return true;
				} catch (error) {
					// For now, allow activation even if API fails (for local testing)
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

				if (!checkoutId || checkoutId === 'local-test') {
					return true;
				}

				const credentials = await this.getCredentials('xPayApi');
				// TODO: Update to api.xpay.sh once DNS is configured
				const apiBaseUrl =
					credentials.environment === 'production'
						? 'https://cja09z457f.execute-api.us-east-1.amazonaws.com/dev'
						: 'https://cja09z457f.execute-api.us-east-1.amazonaws.com/dev';

				try {
					await this.helpers.httpRequestWithAuthentication.call(this, 'xPayApi', {
						method: 'DELETE',
						url: `${apiBaseUrl}/v1/webhooks/${checkoutId}`,
						json: true,
					});
				} catch (error) {
					// Ignore errors on deletion
					console.warn('Failed to delete webhook:', error);
				}

				// Clear static data
				delete webhookData.checkoutId;
				delete webhookData.checkoutUrl;
				delete webhookData.webhookSecret;

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
    <title>xpay✦ Pay to Run Form Ready</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; background: #f5f5f5; }
        .card { background: white; border-radius: 12px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        h1 { color: #10b981; margin-top: 0; }
        .url-box { background: #f0fdf4; border: 2px solid #10b981; border-radius: 8px; padding: 15px; margin: 20px 0; word-break: break-all; }
        .copy-btn { background: #10b981; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-size: 16px; margin-top: 10px; }
        .copy-btn:hover { background: #059669; }
        .info { color: #666; margin-top: 20px; }
        .test-btn { display: inline-block; background: #3b82f6; color: white; text-decoration: none; padding: 12px 24px; border-radius: 6px; margin-top: 10px; }
    </style>
</head>
<body>
    <div class="card">
        <h1>✅ xpay✦ Pay to Run Form Ready!</h1>
        <p><strong>Product:</strong> ${productName}</p>
        <p><strong>Price:</strong> $${amount} USDC</p>

        <h3>Your Pay to Run Form URL:</h3>
        <div class="url-box" id="checkoutUrl">${checkoutUrl || 'URL not available yet'}</div>
        <button class="copy-btn" onclick="navigator.clipboard.writeText('${checkoutUrl}'); this.textContent='Copied!'">📋 Copy URL</button>

        ${checkoutUrl ? `<p><a href="${checkoutUrl}" target="_blank" class="test-btn">🚀 Open Pay to Run Form</a></p>` : ''}

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
		const testMode = this.getNodeParameter('testMode', true) as boolean;
		const checkoutUrl = webhookData.checkoutUrl as string;

		// If empty body or _getInfo flag, return helpful info
		if (!body || Object.keys(body).length === 0 || body._getInfo) {
			return {
				webhookResponse: {
					status: 200,
					body: {
						message: 'xpay✦ pay-to-run trigger is listening!',
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

		// Extract payment and customer input data
		const payment = (body.payment as IDataObject) || {};
		const customerInput = (body.input as IDataObject) || (body.customer_input as IDataObject) || {};

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
