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
			description: 'Your xpay✦ API secret key',
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
			// TODO: Update to api.xpay.sh once DNS is configured
			baseURL: '={{$credentials.environment === "production" ? "https://cja09z457f.execute-api.us-east-1.amazonaws.com/dev" : "https://cja09z457f.execute-api.us-east-1.amazonaws.com/dev"}}',
			url: '/v1/health',
			method: 'GET',
		},
	};
}
