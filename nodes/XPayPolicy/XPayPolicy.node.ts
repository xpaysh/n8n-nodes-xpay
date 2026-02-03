import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeConnectionType,
} from 'n8n-workflow';

import { glyphCoreRequest, smartProxyRequest, getXPayCredentials, handleApiError } from '../../shared/api';
import { ENDPOINTS } from '../../shared/constants';
import type { WalletBalance, SmartProxyAgent, EffectiveLimits, SpendingInfo, AgentLimits } from '../../shared/types';

export class XPayPolicy implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'xpay✦ Policy',
		name: 'xPayPolicy',
		icon: 'file:xpay-policy.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"]}}',
		description: 'Configure spending policies, budgets, and access controls for AI agents',
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
			// Notice about Smart Proxy
			{
				displayName: 'Smart Proxy features require a Customer ID in your credentials. Enable "Smart Proxy Features" in your xpay✦ API credentials and add your Customer ID.',
				name: 'notice',
				type: 'notice',
				default: '',
				displayOptions: {
					show: {
						operation: ['createAgent', 'getAgent', 'updateLimits', 'setDomainRules', 'getSpending', 'pauseAgent'],
					},
				},
			},

			// Operation selector
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Get Wallet Balance',
						value: 'getWalletBalance',
						description: 'Check your available balance and credits',
						action: 'Get wallet balance',
					},
					{
						name: 'Create Agent',
						value: 'createAgent',
						description: 'Create a new managed agent with spending controls',
						action: 'Create agent',
					},
					{
						name: 'Get Agent',
						value: 'getAgent',
						description: 'Get agent configuration and status',
						action: 'Get agent',
					},
					{
						name: 'Update Limits',
						value: 'updateLimits',
						description: 'Update spending limits for an agent',
						action: 'Update limits',
					},
					{
						name: 'Set Domain Rules',
						value: 'setDomainRules',
						description: 'Configure allowed/blocked domains for an agent',
						action: 'Set domain rules',
					},
					{
						name: 'Get Spending',
						value: 'getSpending',
						description: 'Get current spend vs limits for an agent',
						action: 'Get spending',
					},
					{
						name: 'Pause Agent',
						value: 'pauseAgent',
						description: 'Pause or resume agent execution',
						action: 'Pause agent',
					},
				],
				default: 'getWalletBalance',
			},

			// ============================================
			// AGENT ID (for agent operations)
			// ============================================
			{
				displayName: 'Agent ID',
				name: 'agentId',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['getAgent', 'updateLimits', 'setDomainRules', 'getSpending', 'pauseAgent'],
					},
				},
				default: '',
				required: true,
				placeholder: 'e.g., agent_abc123',
				description: 'The ID of the agent to manage',
			},

			// ============================================
			// CREATE AGENT PARAMETERS
			// ============================================
			{
				displayName: 'Agent Name',
				name: 'agentName',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['createAgent'],
					},
				},
				default: '',
				required: true,
				placeholder: 'e.g., Market Research Agent',
				description: 'A descriptive name for the agent',
			},
			{
				displayName: 'Description',
				name: 'agentDescription',
				type: 'string',
				typeOptions: {
					rows: 3,
				},
				displayOptions: {
					show: {
						operation: ['createAgent'],
					},
				},
				default: '',
				placeholder: 'What does this agent do?',
				description: 'Optional description of the agent purpose',
			},
			{
				displayName: 'Initial Limits',
				name: 'initialLimits',
				type: 'collection',
				placeholder: 'Add Limit',
				default: {},
				displayOptions: {
					show: {
						operation: ['createAgent'],
					},
				},
				options: [
					{
						displayName: 'Per Call ($)',
						name: 'perCall',
						type: 'number',
						default: 1,
						description: 'Maximum spend per API call',
					},
					{
						displayName: 'Per Day ($)',
						name: 'perDay',
						type: 'number',
						default: 10,
						description: 'Maximum daily spend',
					},
					{
						displayName: 'Per Month ($)',
						name: 'perMonth',
						type: 'number',
						default: 100,
						description: 'Maximum monthly spend',
					},
					{
						displayName: 'Lifetime ($)',
						name: 'lifetime',
						type: 'number',
						default: 1000,
						description: 'Maximum lifetime spend',
					},
				],
			},

			// ============================================
			// UPDATE LIMITS PARAMETERS
			// ============================================
			{
				displayName: 'Spending Limits',
				name: 'spendingLimits',
				type: 'collection',
				placeholder: 'Add Limit',
				default: {},
				displayOptions: {
					show: {
						operation: ['updateLimits'],
					},
				},
				options: [
					{
						displayName: 'Per Call ($)',
						name: 'perCall',
						type: 'number',
						default: 1,
						description: 'Maximum spend per API call',
					},
					{
						displayName: 'Per Minute ($)',
						name: 'perMinute',
						type: 'number',
						default: 5,
						description: 'Maximum spend per minute',
					},
					{
						displayName: 'Per Day ($)',
						name: 'perDay',
						type: 'number',
						default: 10,
						description: 'Maximum daily spend',
					},
					{
						displayName: 'Per Week ($)',
						name: 'perWeek',
						type: 'number',
						default: 50,
						description: 'Maximum weekly spend',
					},
					{
						displayName: 'Per Month ($)',
						name: 'perMonth',
						type: 'number',
						default: 100,
						description: 'Maximum monthly spend',
					},
					{
						displayName: 'Lifetime ($)',
						name: 'lifetime',
						type: 'number',
						default: 1000,
						description: 'Maximum lifetime spend',
					},
				],
			},

			// ============================================
			// DOMAIN RULES PARAMETERS
			// ============================================
			{
				displayName: 'Allowed Domains',
				name: 'allowedDomains',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['setDomainRules'],
					},
				},
				default: '',
				placeholder: 'api.openai.com, api.anthropic.com',
				description: 'Comma-separated list of domains the agent can access. Leave empty to allow all.',
			},
			{
				displayName: 'Blocked Domains',
				name: 'blockedDomains',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['setDomainRules'],
					},
				},
				default: '',
				placeholder: 'malicious-site.com, blocked-api.com',
				description: 'Comma-separated list of domains to block',
			},

			// ============================================
			// PAUSE AGENT PARAMETERS
			// ============================================
			{
				displayName: 'Action',
				name: 'pauseAction',
				type: 'options',
				displayOptions: {
					show: {
						operation: ['pauseAgent'],
					},
				},
				options: [
					{
						name: 'Pause',
						value: 'pause',
						description: 'Pause agent execution',
					},
					{
						name: 'Resume',
						value: 'resume',
						description: 'Resume agent execution',
					},
				],
				default: 'pause',
				description: 'Whether to pause or resume the agent',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			try {
				const operation = this.getNodeParameter('operation', i) as string;
				const credentials = await getXPayCredentials(this);
				let result: any;

				// ============================================
				// GET WALLET BALANCE
				// ============================================
				if (operation === 'getWalletBalance') {
					const response = await glyphCoreRequest(this, 'GET', ENDPOINTS.WALLET_BALANCE) as WalletBalance;

					result = {
						balance: {
							available: response.available || 0,
							locked: response.locked || 0,
							currency: response.currency || 'USDC',
							creditsRemaining: response.creditsRemaining || 0,
						},
					};
				}

				// ============================================
				// CREATE AGENT
				// ============================================
				else if (operation === 'createAgent') {
					if (!credentials.customerId) {
						throw new Error('Customer ID is required for Smart Proxy operations. Please configure it in your xpay✦ API credentials.');
					}

					const agentName = this.getNodeParameter('agentName', i) as string;
					const agentDescription = this.getNodeParameter('agentDescription', i, '') as string;
					const initialLimits = this.getNodeParameter('initialLimits', i) as Partial<AgentLimits>;

					const agentData = {
						customerId: credentials.customerId,
						name: agentName,
						description: agentDescription,
						agentLimits: {
							perCall: initialLimits.perCall || null,
							perDay: initialLimits.perDay || null,
							perMonth: initialLimits.perMonth || null,
							lifetime: initialLimits.lifetime || null,
						},
					};

					const response = await smartProxyRequest(
						this,
						'POST',
						ENDPOINTS.AGENTS,
						agentData,
					) as SmartProxyAgent;

					result = {
						agent: response,
						message: 'Agent created successfully',
					};
				}

				// ============================================
				// GET AGENT
				// ============================================
				else if (operation === 'getAgent') {
					if (!credentials.customerId) {
						throw new Error('Customer ID is required for Smart Proxy operations.');
					}

					const agentId = this.getNodeParameter('agentId', i) as string;

					const response = await smartProxyRequest(
						this,
						'GET',
						`${ENDPOINTS.AGENTS}/${agentId}`,
						undefined,
						{ customerId: credentials.customerId },
					) as SmartProxyAgent;

					result = {
						agent: response,
					};
				}

				// ============================================
				// UPDATE LIMITS
				// ============================================
				else if (operation === 'updateLimits') {
					if (!credentials.customerId) {
						throw new Error('Customer ID is required for Smart Proxy operations.');
					}

					const agentId = this.getNodeParameter('agentId', i) as string;
					const spendingLimits = this.getNodeParameter('spendingLimits', i) as Partial<AgentLimits>;

					const updateData = {
						customerId: credentials.customerId,
						agentLimits: spendingLimits,
					};

					const response = await smartProxyRequest(
						this,
						'PUT',
						`${ENDPOINTS.AGENTS}/${agentId}`,
						updateData,
					) as SmartProxyAgent;

					result = {
						agent: response,
						message: 'Agent limits updated successfully',
					};
				}

				// ============================================
				// SET DOMAIN RULES
				// ============================================
				else if (operation === 'setDomainRules') {
					if (!credentials.customerId) {
						throw new Error('Customer ID is required for Smart Proxy operations.');
					}

					const agentId = this.getNodeParameter('agentId', i) as string;
					const allowedDomainsStr = this.getNodeParameter('allowedDomains', i, '') as string;
					const blockedDomainsStr = this.getNodeParameter('blockedDomains', i, '') as string;

					const allowedDomains = allowedDomainsStr
						? allowedDomainsStr.split(',').map((d) => d.trim()).filter(Boolean)
						: [];
					const blockedDomains = blockedDomainsStr
						? blockedDomainsStr.split(',').map((d) => d.trim()).filter(Boolean)
						: [];

					const updateData = {
						customerId: credentials.customerId,
						allowedDomains,
						blockedDomains,
					};

					const response = await smartProxyRequest(
						this,
						'PUT',
						`${ENDPOINTS.AGENTS}/${agentId}`,
						updateData,
					) as SmartProxyAgent;

					result = {
						agent: response,
						message: 'Domain rules updated successfully',
					};
				}

				// ============================================
				// GET SPENDING
				// ============================================
				else if (operation === 'getSpending') {
					if (!credentials.customerId) {
						throw new Error('Customer ID is required for Smart Proxy operations.');
					}

					const agentId = this.getNodeParameter('agentId', i) as string;

					// Get agent to retrieve spending info
					const agent = await smartProxyRequest(
						this,
						'GET',
						`${ENDPOINTS.AGENTS}/${agentId}`,
						undefined,
						{ customerId: credentials.customerId },
					) as SmartProxyAgent;

					// Get effective limits
					const limitsResponse = await smartProxyRequest(
						this,
						'GET',
						`${ENDPOINTS.AGENTS}/${agentId}/effective-limits`,
						undefined,
						{ customerId: credentials.customerId },
					) as EffectiveLimits;

					result = {
						agentId,
						spending: {
							totalSpent: agent.totalSpent || 0,
							spentThisMinute: agent.spentThisMinute || 0,
							spentThisDay: agent.spentThisDay || 0,
							spentThisWeek: agent.spentThisWeek || 0,
							spentThisMonth: agent.spentThisMonth || 0,
						},
						limits: {
							agentLimits: agent.agentLimits,
							effectiveLimits: limitsResponse.effectiveLimits || limitsResponse,
						},
						status: agent.status,
					};
				}

				// ============================================
				// PAUSE AGENT
				// ============================================
				else if (operation === 'pauseAgent') {
					if (!credentials.customerId) {
						throw new Error('Customer ID is required for Smart Proxy operations.');
					}

					const agentId = this.getNodeParameter('agentId', i) as string;
					const pauseAction = this.getNodeParameter('pauseAction', i) as 'pause' | 'resume';

					const newStatus = pauseAction === 'pause' ? 'paused' : 'active';

					const updateData = {
						customerId: credentials.customerId,
						status: newStatus,
					};

					const response = await smartProxyRequest(
						this,
						'PUT',
						`${ENDPOINTS.AGENTS}/${agentId}`,
						updateData,
					) as SmartProxyAgent;

					result = {
						agent: response,
						message: pauseAction === 'pause' ? 'Agent paused successfully' : 'Agent resumed successfully',
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
