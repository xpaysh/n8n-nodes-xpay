import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class XPayApi implements ICredentialType {
	name = 'xPayApi';
	displayName = 'xpay✦ API';
	documentationUrl = 'https://docs.xpay.sh/integrations/n8n';

	properties: INodeProperties[] = [
		{
			displayName: 'API Secret',
			name: 'apiKey',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
			required: true,
			placeholder: 'xpay_sk_...',
			description: 'Your xpay✦ API secret key (format: xpay_sk_xxx for sandbox, xpay_pk_xxx for production)',
			hint: 'Get your keys at app.xpay.sh/settings/api-keys',
		},
		{
			displayName: 'Environment',
			name: 'environment',
			type: 'options',
			options: [
				{
					name: 'Sandbox',
					value: 'sandbox',
					description: 'Test mode - no real payments',
				},
				{
					name: 'Production',
					value: 'production',
					description: 'Live mode - real payments',
				},
			],
			default: 'sandbox',
			description: 'Choose Sandbox for testing, Production for live payments',
		},
		{
			displayName: 'Enable Smart Proxy Features',
			name: 'smartProxyEnabled',
			type: 'boolean',
			default: false,
			description: 'Whether to enable Smart Proxy policy features (agent management, spending limits)',
		},
		{
			displayName: 'Customer ID',
			name: 'customerId',
			type: 'string',
			default: '',
			description: 'Your Smart Proxy Customer ID (required for policy operations)',
			hint: 'Find this at app.xpay.sh/smart-proxy/settings',
			displayOptions: {
				show: {
					smartProxyEnabled: [true],
				},
			},
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials.apiKey}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			// Use Glyphrun Core health endpoint for credential validation
			baseURL: '={{$credentials.environment === "production" ? "https://7qzahhyw77.execute-api.us-east-1.amazonaws.com/dev" : "https://7qzahhyw77.execute-api.us-east-1.amazonaws.com/dev"}}',
			url: '/health',
			method: 'GET',
		},
	};
}
