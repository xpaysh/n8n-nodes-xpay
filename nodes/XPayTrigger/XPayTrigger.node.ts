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
		displayName: 'xPay Payment Trigger',
		name: 'xPayTrigger',
		icon: 'file:xpay.svg',
		group: ['trigger'],
		version: 1,
		subtitle: '={{$parameter["productName"]}}',
		description: 'Starts the workflow only after a crypto payment is received',
		defaults: {
			name: 'xPay Payment Trigger',
		},
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
		],
		properties: [
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
				placeholder: '0x...',
				description: 'Your wallet address to receive USDC payments',
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
				const description = this.getNodeParameter('description', '') as string;
				const amount = this.getNodeParameter('amount') as number;
				const network = this.getNodeParameter('network') as string;
				const recipientWallet = this.getNodeParameter('recipientWallet') as string;
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
				const apiBaseUrl =
					credentials.environment === 'production'
						? 'https://api.xpay.sh'
						: 'https://api.xpay.sh';

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
					console.log('xPay Payment Link Generated!');
					console.log('========================================');
					console.log(`Product: ${productName}`);
					console.log(`Price: $${amount} USDC`);
					console.log(`Checkout URL: ${response.checkout_url}`);
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
				const apiBaseUrl =
					credentials.environment === 'production'
						? 'https://api.xpay.sh'
						: 'https://api.xpay.sh';

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
		const req = this.getRequestObject();
		const body = this.getBodyData() as IDataObject;
		const headers = this.getHeaderData() as IDataObject;

		// Get stored webhook secret
		const webhookData = this.getWorkflowStaticData('node');
		const webhookSecret = webhookData.webhookSecret as string;

		// Verify signature (skip for local testing)
		if (webhookSecret && webhookSecret !== 'test-secret') {
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
