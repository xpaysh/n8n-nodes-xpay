import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeConnectionType,
} from 'n8n-workflow';

import { glyphCoreRequest, handleApiError } from '../../shared/api';
import { ENDPOINTS } from '../../shared/constants';

export class XPayPolicy implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'xpay✦ Policy',
		name: 'xPayPolicy',
		icon: 'file:xpay-policy.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"]}}',
		description: 'Configure spending policies and limits for your workflow',
		defaults: {
			name: 'xpay✦ Policy',
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
			// Operation selector
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Get Balance',
						value: 'getBalance',
						description: 'Check your wallet balance',
						action: 'Get balance',
					},
					{
						name: 'Set Policy',
						value: 'setPolicy',
						description: 'Configure spending limits and workflow intent for policy enforcement',
						action: 'Set policy',
					},
					{
						name: 'Get Spending',
						value: 'getSpending',
						description: 'View spending history and current limits',
						action: 'Get spending',
					},
				],
				default: 'getBalance',
			},

			// ============================================
			// SET POLICY - Workflow Description (Intent)
			// ============================================
			{
				displayName: 'Workflow Description',
				name: 'workflowDescription',
				type: 'string',
				typeOptions: {
					rows: 4,
				},
				displayOptions: {
					show: {
						operation: ['setPolicy'],
					},
				},
				default: '',
				required: true,
				placeholder: 'e.g., This workflow researches companies and generates sales outreach emails for the SDR team.',
				description: 'Describe what this workflow does. This is used for intent-based policy enforcement - the description helps xpay✦ understand which services are appropriate for this workflow.',
				hint: 'Be specific about the purpose, data accessed, and expected outputs. This enables smarter policy decisions.',
			},

			// ============================================
			// SET POLICY - Wallet Selection
			// ============================================
			{
				displayName: 'Wallet',
				name: 'walletSource',
				type: 'options',
				displayOptions: {
					show: {
						operation: ['setPolicy'],
					},
				},
				options: [
					{
						name: 'Default Wallet',
						value: 'default',
						description: 'Use your account\'s default wallet',
					},
					{
						name: 'Custom Wallet',
						value: 'custom',
						description: 'Specify a different wallet ID',
					},
				],
				default: 'default',
				description: 'Which wallet to use for payments in this workflow',
			},
			{
				displayName: 'Wallet ID',
				name: 'walletId',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['setPolicy'],
						walletSource: ['custom'],
					},
				},
				default: '',
				required: true,
				placeholder: 'e.g., wallet_abc123',
				description: 'The ID of the wallet to use (find this in your xpay✦ dashboard)',
			},

			// ============================================
			// SET POLICY - Spending Limits
			// ============================================
			{
				displayName: 'Spending Limits',
				name: 'spendingLimits',
				type: 'collection',
				placeholder: 'Add Limit',
				default: {},
				displayOptions: {
					show: {
						operation: ['setPolicy'],
					},
				},
				options: [
					{
						displayName: 'Per Call Limit ($)',
						name: 'perCall',
						type: 'number',
						typeOptions: {
							minValue: 0,
							numberPrecision: 2,
						},
						default: 1.00,
						description: 'Maximum spend per individual service call',
					},
					{
						displayName: 'Per Day Limit ($)',
						name: 'perDay',
						type: 'number',
						typeOptions: {
							minValue: 0,
							numberPrecision: 2,
						},
						default: 10.00,
						description: 'Maximum total spend per day',
					},
					{
						displayName: 'Per Month Limit ($)',
						name: 'perMonth',
						type: 'number',
						typeOptions: {
							minValue: 0,
							numberPrecision: 2,
						},
						default: 100.00,
						description: 'Maximum total spend per month',
					},
					{
						displayName: 'Lifetime Limit ($)',
						name: 'lifetime',
						type: 'number',
						typeOptions: {
							minValue: 0,
							numberPrecision: 2,
						},
						default: 0,
						description: 'Maximum total spend ever (0 = unlimited)',
					},
				],
			},

			// ============================================
			// SET POLICY - Domain Rules (Optional)
			// ============================================
			{
				displayName: 'Domain Rules',
				name: 'domainRules',
				type: 'collection',
				placeholder: 'Add Domain Rule',
				default: {},
				displayOptions: {
					show: {
						operation: ['setPolicy'],
					},
				},
				options: [
					{
						displayName: 'Allowed Domains',
						name: 'allowedDomains',
						type: 'string',
						default: '',
						placeholder: 'e.g., api.openai.com, anthropic.com',
						description: 'Comma-separated list of allowed domains (leave empty for all)',
					},
					{
						displayName: 'Blocked Domains',
						name: 'blockedDomains',
						type: 'string',
						default: '',
						placeholder: 'e.g., example.com',
						description: 'Comma-separated list of blocked domains',
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
				const operation = this.getNodeParameter('operation', i) as string;
				let result: any;

				// ============================================
				// GET BALANCE
				// ============================================
				if (operation === 'getBalance') {
					const response = await glyphCoreRequest(this, 'GET', ENDPOINTS.WALLET_BALANCE);

					result = {
						balance: {
							available: response.wallet?.balance ?? response.balance?.available ?? 0,
							credits: response.wallet?.credits ?? response.balance?.credits ?? 0,
							currency: 'USDC',
						},
						message: 'Wallet balance retrieved successfully',
					};
				}

				// ============================================
				// SET POLICY
				// ============================================
				else if (operation === 'setPolicy') {
					const workflowDescription = this.getNodeParameter('workflowDescription', i) as string;
					const walletSource = this.getNodeParameter('walletSource', i) as string;
					const walletId = walletSource === 'custom'
						? this.getNodeParameter('walletId', i) as string
						: null;
					const spendingLimits = this.getNodeParameter('spendingLimits', i) as {
						perCall?: number;
						perDay?: number;
						perMonth?: number;
						lifetime?: number;
					};
					const domainRules = this.getNodeParameter('domainRules', i) as {
						allowedDomains?: string;
						blockedDomains?: string;
					};

					// Parse domain rules
					const allowedDomains = domainRules.allowedDomains
						? domainRules.allowedDomains.split(',').map(d => d.trim()).filter(d => d)
						: [];
					const blockedDomains = domainRules.blockedDomains
						? domainRules.blockedDomains.split(',').map(d => d.trim()).filter(d => d)
						: [];

					// Build policy object
					const policy = {
						description: workflowDescription,
						wallet: {
							source: walletSource,
							walletId: walletId, // null means use default wallet
						},
						limits: {
							perCall: spendingLimits.perCall ?? 1.00,
							perDay: spendingLimits.perDay ?? 10.00,
							perMonth: spendingLimits.perMonth ?? 100.00,
							lifetime: spendingLimits.lifetime ?? 0,
						},
						domains: {
							allowed: allowedDomains,
							blocked: blockedDomains,
						},
						appliedAt: new Date().toISOString(),
					};

					// Store policy in workflow context for downstream xpay✦ Run nodes
					// Note: In production, this would be sent to Smart Proxy API
					result = {
						policy,
						message: 'Policy configured for this workflow run',
						hint: 'This policy applies to all subsequent xpay✦ Run calls in this workflow execution.',
					};
				}

				// ============================================
				// GET SPENDING
				// ============================================
				else if (operation === 'getSpending') {
					// Get account stats for spending info
					const statsResponse = await glyphCoreRequest(this, 'GET', ENDPOINTS.ACCOUNT_STATS);
					const balanceResponse = await glyphCoreRequest(this, 'GET', ENDPOINTS.WALLET_BALANCE);

					result = {
						spending: {
							totalSpent: balanceResponse.wallet?.totalSpent ?? 0,
							creditsUsed: balanceResponse.wallet?.creditsUsed ?? 0,
						},
						balance: {
							available: balanceResponse.wallet?.balance ?? 0,
							credits: balanceResponse.wallet?.credits ?? 0,
						},
						stats: {
							totalRuns: statsResponse.stats?.totalRuns ?? 0,
							successfulRuns: statsResponse.stats?.successfulRuns ?? 0,
						},
						message: 'Spending information retrieved successfully',
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
						},
						pairedItem: { item: i },
					});
					continue;
				}
				handleApiError(error, this.getNodeParameter('operation', i) as string);
			}
		}

		return [returnData];
	}
}
