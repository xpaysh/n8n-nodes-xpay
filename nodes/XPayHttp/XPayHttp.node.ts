import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeConnectionType,
	IHttpRequestOptions,
} from 'n8n-workflow';

import { smartProxyRequest, handleApiError } from '../../shared/api';

export class XPayHttp implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'xpay✦ HTTP',
		name: 'xPayHttp',
		icon: 'file:xpay-http.svg',
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["method"]}} {{$parameter["url"]}}',
		description: 'Make HTTP requests with automatic 402 payment handling and policy enforcement',
		defaults: {
			name: 'xpay✦ HTTP',
		},
		inputs: ['main' as NodeConnectionType],
		outputs: ['main' as NodeConnectionType],
		credentials: [
			{
				name: 'xPayApi',
				required: true,
			},
		],
		properties: [
			// ============================================
			// HTTP METHOD
			// ============================================
			{
				displayName: 'Method',
				name: 'method',
				type: 'options',
				options: [
					{ name: 'GET', value: 'GET' },
					{ name: 'POST', value: 'POST' },
					{ name: 'PUT', value: 'PUT' },
					{ name: 'PATCH', value: 'PATCH' },
					{ name: 'DELETE', value: 'DELETE' },
					{ name: 'HEAD', value: 'HEAD' },
					{ name: 'OPTIONS', value: 'OPTIONS' },
				],
				default: 'GET',
				description: 'The HTTP method to use',
			},

			// ============================================
			// URL
			// ============================================
			{
				displayName: 'URL',
				name: 'url',
				type: 'string',
				default: '',
				required: true,
				placeholder: 'https://api.example.com/endpoint',
				description: 'The URL to make the request to',
			},

			// ============================================
			// AUTHENTICATION
			// ============================================
			{
				displayName: 'Authentication',
				name: 'authentication',
				type: 'options',
				options: [
					{
						name: 'None',
						value: 'none',
						description: 'No authentication',
					},
					{
						name: 'API Key',
						value: 'apiKey',
						description: 'Use API key in header or query parameter',
					},
					{
						name: 'Bearer Token',
						value: 'bearer',
						description: 'Use Bearer token in Authorization header',
					},
					{
						name: 'Basic Auth',
						value: 'basic',
						description: 'Use Basic authentication',
					},
				],
				default: 'none',
				description: 'Authentication method for the target API',
			},

			// API Key authentication options
			{
				displayName: 'API Key Name',
				name: 'apiKeyName',
				type: 'string',
				displayOptions: {
					show: {
						authentication: ['apiKey'],
					},
				},
				default: 'X-API-Key',
				description: 'The name of the API key header or query parameter',
			},
			{
				displayName: 'API Key Value',
				name: 'apiKeyValue',
				type: 'string',
				typeOptions: {
					password: true,
				},
				displayOptions: {
					show: {
						authentication: ['apiKey'],
					},
				},
				default: '',
				description: 'The API key value',
			},
			{
				displayName: 'API Key Location',
				name: 'apiKeyLocation',
				type: 'options',
				displayOptions: {
					show: {
						authentication: ['apiKey'],
					},
				},
				options: [
					{ name: 'Header', value: 'header' },
					{ name: 'Query Parameter', value: 'query' },
				],
				default: 'header',
				description: 'Where to send the API key',
			},

			// Bearer Token
			{
				displayName: 'Bearer Token',
				name: 'bearerToken',
				type: 'string',
				typeOptions: {
					password: true,
				},
				displayOptions: {
					show: {
						authentication: ['bearer'],
					},
				},
				default: '',
				description: 'The Bearer token for Authorization header',
			},

			// Basic Auth
			{
				displayName: 'Username',
				name: 'basicUsername',
				type: 'string',
				displayOptions: {
					show: {
						authentication: ['basic'],
					},
				},
				default: '',
				description: 'Username for Basic authentication',
			},
			{
				displayName: 'Password',
				name: 'basicPassword',
				type: 'string',
				typeOptions: {
					password: true,
				},
				displayOptions: {
					show: {
						authentication: ['basic'],
					},
				},
				default: '',
				description: 'Password for Basic authentication',
			},

			// ============================================
			// HEADERS
			// ============================================
			{
				displayName: 'Headers',
				name: 'headers',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				placeholder: 'Add Header',
				default: {},
				options: [
					{
						name: 'header',
						displayName: 'Header',
						values: [
							{
								displayName: 'Name',
								name: 'name',
								type: 'string',
								default: '',
								placeholder: 'Content-Type',
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								default: '',
								placeholder: 'application/json',
							},
						],
					},
				],
			},

			// ============================================
			// QUERY PARAMETERS
			// ============================================
			{
				displayName: 'Query Parameters',
				name: 'queryParameters',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				placeholder: 'Add Parameter',
				default: {},
				options: [
					{
						name: 'parameter',
						displayName: 'Parameter',
						values: [
							{
								displayName: 'Name',
								name: 'name',
								type: 'string',
								default: '',
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								default: '',
							},
						],
					},
				],
			},

			// ============================================
			// BODY
			// ============================================
			{
				displayName: 'Body Content Type',
				name: 'bodyContentType',
				type: 'options',
				displayOptions: {
					show: {
						method: ['POST', 'PUT', 'PATCH'],
					},
				},
				options: [
					{ name: 'None', value: 'none' },
					{ name: 'JSON', value: 'json' },
					{ name: 'Form Data', value: 'formData' },
					{ name: 'Form URL Encoded', value: 'formUrlEncoded' },
					{ name: 'Raw', value: 'raw' },
				],
				default: 'json',
				description: 'The content type of the request body',
			},
			{
				displayName: 'Body (JSON)',
				name: 'bodyJson',
				type: 'json',
				displayOptions: {
					show: {
						method: ['POST', 'PUT', 'PATCH'],
						bodyContentType: ['json'],
					},
				},
				default: '{}',
				description: 'JSON body to send with the request',
			},
			{
				displayName: 'Body (Raw)',
				name: 'bodyRaw',
				type: 'string',
				typeOptions: {
					rows: 5,
				},
				displayOptions: {
					show: {
						method: ['POST', 'PUT', 'PATCH'],
						bodyContentType: ['raw'],
					},
				},
				default: '',
				description: 'Raw body content to send',
			},
			{
				displayName: 'Form Data',
				name: 'formData',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				displayOptions: {
					show: {
						method: ['POST', 'PUT', 'PATCH'],
						bodyContentType: ['formData', 'formUrlEncoded'],
					},
				},
				placeholder: 'Add Field',
				default: {},
				options: [
					{
						name: 'field',
						displayName: 'Field',
						values: [
							{
								displayName: 'Name',
								name: 'name',
								type: 'string',
								default: '',
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								default: '',
							},
						],
					},
				],
			},

			// ============================================
			// XPAY PAYMENT SETTINGS
			// ============================================
			{
				displayName: 'Payment Settings',
				name: 'paymentSettings',
				type: 'collection',
				placeholder: 'Configure Payment',
				default: {},
				options: [
					{
						displayName: 'Auto-Pay 402 Responses',
						name: 'autoPay402',
						type: 'boolean',
						default: true,
						description: 'Whether to automatically pay when the API returns HTTP 402 Payment Required',
					},
					{
						displayName: 'Max Payment Per Request ($)',
						name: 'maxPayment',
						type: 'number',
						typeOptions: {
							minValue: 0,
							numberPrecision: 2,
						},
						default: 1.00,
						description: 'Maximum amount to pay for a single request (overrides policy per-call limit if lower)',
					},
					{
						displayName: 'Fail on Limit Exceeded',
						name: 'failOnLimit',
						type: 'boolean',
						default: true,
						description: 'Whether to fail the workflow if payment would exceed policy limits',
					},
				],
			},

			// ============================================
			// ADVANCED OPTIONS
			// ============================================
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				options: [
					{
						displayName: 'Timeout (seconds)',
						name: 'timeout',
						type: 'number',
						default: 30,
						description: 'Request timeout in seconds',
					},
					{
						displayName: 'Retry on Failure',
						name: 'retryOnFailure',
						type: 'number',
						typeOptions: {
							minValue: 0,
							maxValue: 5,
						},
						default: 0,
						description: 'Number of times to retry on failure (0 = no retry)',
					},
					{
						displayName: 'Ignore SSL Issues',
						name: 'ignoreSSL',
						type: 'boolean',
						default: false,
						description: 'Whether to ignore SSL certificate errors',
					},
					{
						displayName: 'Follow Redirects',
						name: 'followRedirects',
						type: 'boolean',
						default: true,
						description: 'Whether to follow HTTP redirects',
					},
					{
						displayName: 'Full Response',
						name: 'fullResponse',
						type: 'boolean',
						default: false,
						description: 'Whether to return the full response including headers and status code',
					},
				],
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			try {
				// Get basic request parameters
				const method = this.getNodeParameter('method', i) as string;
				const url = this.getNodeParameter('url', i) as string;
				const authentication = this.getNodeParameter('authentication', i) as string;

				// Get headers
				const headersCollection = this.getNodeParameter('headers', i) as {
					header?: Array<{ name: string; value: string }>;
				};
				const headers: Record<string, string> = {};
				if (headersCollection.header) {
					for (const h of headersCollection.header) {
						if (h.name) headers[h.name] = h.value;
					}
				}

				// Add authentication headers
				if (authentication === 'apiKey') {
					const apiKeyName = this.getNodeParameter('apiKeyName', i) as string;
					const apiKeyValue = this.getNodeParameter('apiKeyValue', i) as string;
					const apiKeyLocation = this.getNodeParameter('apiKeyLocation', i) as string;
					if (apiKeyLocation === 'header') {
						headers[apiKeyName] = apiKeyValue;
					}
					// Query params handled below
				} else if (authentication === 'bearer') {
					const bearerToken = this.getNodeParameter('bearerToken', i) as string;
					headers['Authorization'] = `Bearer ${bearerToken}`;
				} else if (authentication === 'basic') {
					const username = this.getNodeParameter('basicUsername', i) as string;
					const password = this.getNodeParameter('basicPassword', i) as string;
					const credentials = Buffer.from(`${username}:${password}`).toString('base64');
					headers['Authorization'] = `Basic ${credentials}`;
				}

				// Get query parameters
				const queryCollection = this.getNodeParameter('queryParameters', i) as {
					parameter?: Array<{ name: string; value: string }>;
				};
				const queryParams: Record<string, string> = {};
				if (queryCollection.parameter) {
					for (const p of queryCollection.parameter) {
						if (p.name) queryParams[p.name] = p.value;
					}
				}

				// Add API key to query if needed
				if (authentication === 'apiKey') {
					const apiKeyLocation = this.getNodeParameter('apiKeyLocation', i) as string;
					if (apiKeyLocation === 'query') {
						const apiKeyName = this.getNodeParameter('apiKeyName', i) as string;
						const apiKeyValue = this.getNodeParameter('apiKeyValue', i) as string;
						queryParams[apiKeyName] = apiKeyValue;
					}
				}

				// Get body
				let body: any = undefined;
				let contentType: string | undefined = undefined;

				if (['POST', 'PUT', 'PATCH'].includes(method)) {
					const bodyContentType = this.getNodeParameter('bodyContentType', i) as string;

					if (bodyContentType === 'json') {
						const bodyJson = this.getNodeParameter('bodyJson', i) as string;
						try {
							body = JSON.parse(bodyJson);
						} catch {
							body = bodyJson;
						}
						contentType = 'application/json';
					} else if (bodyContentType === 'raw') {
						body = this.getNodeParameter('bodyRaw', i) as string;
					} else if (bodyContentType === 'formData' || bodyContentType === 'formUrlEncoded') {
						const formDataCollection = this.getNodeParameter('formData', i) as {
							field?: Array<{ name: string; value: string }>;
						};
						const formData: Record<string, string> = {};
						if (formDataCollection.field) {
							for (const f of formDataCollection.field) {
								if (f.name) formData[f.name] = f.value;
							}
						}
						body = formData;
						contentType = bodyContentType === 'formUrlEncoded'
							? 'application/x-www-form-urlencoded'
							: 'multipart/form-data';
					}

					if (contentType && !headers['Content-Type']) {
						headers['Content-Type'] = contentType;
					}
				}

				// Get payment settings
				const paymentSettings = this.getNodeParameter('paymentSettings', i) as {
					autoPay402?: boolean;
					maxPayment?: number;
					failOnLimit?: boolean;
				};

				// Get options
				const options = this.getNodeParameter('options', i) as {
					timeout?: number;
					retryOnFailure?: number;
					ignoreSSL?: boolean;
					followRedirects?: boolean;
					fullResponse?: boolean;
				};

				// Build the proxy request payload
				const proxyPayload = {
					target: {
						method,
						url,
						headers,
						queryParams: Object.keys(queryParams).length > 0 ? queryParams : undefined,
						body,
					},
					payment: {
						autoPay402: paymentSettings.autoPay402 ?? true,
						maxPayment: paymentSettings.maxPayment ?? 1.00,
						failOnLimit: paymentSettings.failOnLimit ?? true,
					},
					options: {
						timeout: (options.timeout ?? 30) * 1000, // Convert to ms
						retryOnFailure: options.retryOnFailure ?? 0,
						ignoreSSL: options.ignoreSSL ?? false,
						followRedirects: options.followRedirects ?? true,
					},
				};

				// Make request through Smart Proxy
				const response = await smartProxyRequest(this, 'POST', '/proxy', proxyPayload);

				// Format result
				let result: any;

				if (options.fullResponse) {
					result = {
						statusCode: response.statusCode,
						headers: response.headers,
						body: response.body,
						payment: response.payment,
						policy: response.policy,
					};
				} else {
					// Just return the body with payment info attached
					result = {
						...(typeof response.body === 'object' ? response.body : { data: response.body }),
						_xpay: {
							payment: response.payment,
							policy: response.policy,
						},
					};
				}

				returnData.push({
					json: result,
					pairedItem: { item: i },
				});
			} catch (error: any) {
				if (this.continueOnFail()) {
					returnData.push({
						json: {
							error: error.message,
							statusCode: error.statusCode,
						},
						pairedItem: { item: i },
					});
					continue;
				}
				handleApiError(error, 'HTTP Request');
			}
		}

		return [returnData];
	}
}
