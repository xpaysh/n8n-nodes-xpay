/**
 * XPayPayPerUseTool - LangChain tool node for discovering and executing services
 *
 * This node can be connected to AI Agent nodes as a tool, allowing the LLM to
 * search for services and execute them dynamically during execution.
 */

import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import type {
	ISupplyDataFunctions,
	INodeType,
	INodeTypeDescription,
	SupplyData,
} from 'n8n-workflow';

import { glyphCoreRequest, glyphRouterRequest } from '../../shared/api';
import { ENDPOINTS } from '../../shared/constants';
import type { RunResult } from '../../shared/types';

export class XPayPayPerUseTool implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'xpay✦ pay-per-use Tool',
		name: 'xPayPayPerUseTool',
		icon: 'file:xpay-pay-per-use.svg',
		group: ['transform'],
		version: 1,
		description: 'Discover and execute services from xpay✦ marketplace — use as a tool for AI Agents',
		defaults: {
			name: 'xpay✦ pay-per-use Tool',
		},
		codex: {
			categories: ['AI'],
			subcategories: {
				AI: ['Tools'],
			},
			resources: {
				primaryDocumentation: [
					{
						url: 'https://docs.xpay.sh/n8n-nodes/pay-per-use-tool',
					},
				],
			},
		},
		inputs: [],
		outputs: ['ai_tool'],
		outputNames: ['Tool'],
		credentials: [
			{
				name: 'xPayApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Tool Description',
				name: 'toolDescription',
				type: 'string',
				default:
					'Search the xpay marketplace for AI services and execute them. Use action "discover" with a searchQuery to find services. Use action "run" with a serviceSlug and inputs to execute a service. Returns results as JSON.',
				description:
					'Description of this tool that will be shown to the AI Agent. Helps the agent understand when to use this tool.',
				typeOptions: {
					rows: 3,
				},
			},
			{
				displayName: 'Default Model',
				name: 'modelId',
				type: 'options',
				options: [
					{ name: 'GPT-4o Mini (Fast & Cheap)', value: 'gpt-4o-mini' },
					{ name: 'GPT-4o (Balanced)', value: 'gpt-4o' },
					{ name: 'Claude 3.5 Sonnet (Balanced)', value: 'claude-3.5-sonnet' },
					{ name: 'Claude 3.5 Haiku (Fast)', value: 'claude-3.5-haiku' },
					{ name: 'Gemini 1.5 Flash (Fast)', value: 'gemini-1.5-flash' },
					{ name: 'Gemini 1.5 Pro (Reasoning)', value: 'gemini-1.5-pro' },
				],
				default: 'gpt-4o-mini',
				description: 'The default LLM model to use for service execution',
			},
			{
				displayName: 'Filters',
				name: 'filters',
				type: 'collection',
				placeholder: 'Add Filter',
				default: {},
				options: [
					{
						displayName: 'Verified Only',
						name: 'verified',
						type: 'boolean',
						default: true,
						description: 'Whether to only return verified services when discovering',
					},
					{
						displayName: 'Limit',
						name: 'limit',
						type: 'number',
						default: 5,
						description: 'Maximum number of results to return when discovering',
					},
				],
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				options: [
					{
						displayName: 'Temperature',
						name: 'temperature',
						type: 'number',
						typeOptions: {
							minValue: 0,
							maxValue: 2,
							numberPrecision: 1,
						},
						default: 0.7,
						description: 'Model temperature (0 = deterministic, 2 = creative)',
					},
					{
						displayName: 'Max Tokens',
						name: 'maxTokens',
						type: 'number',
						default: 4096,
						description: 'Maximum tokens in the response',
					},
				],
			},
		],
	};

	async supplyData(this: ISupplyDataFunctions, itemIndex: number): Promise<SupplyData> {
		const toolDescription = this.getNodeParameter('toolDescription', itemIndex) as string;
		const defaultModelId = this.getNodeParameter('modelId', itemIndex) as string;
		const filters = this.getNodeParameter('filters', itemIndex) as {
			verified?: boolean;
			limit?: number;
		};
		const options = this.getNodeParameter('options', itemIndex) as {
			temperature?: number;
			maxTokens?: number;
		};

		const context = this;

		const inputSchema = z.object({
			action: z.enum(['discover', 'run']).describe('Action to perform: "discover" to search services, "run" to execute a service'),
			searchQuery: z.string().optional().describe('Search query for discovering services (required for action "discover")'),
			serviceSlug: z.string().optional().describe('The serviceSlug from discover results (required for action "run")'),
			inputs: z.record(z.any()).optional().describe('Input parameters for the service as key-value pairs (for action "run")'),
			modelId: z.string().optional().describe('Optional: Override the default model (e.g., "gpt-4o", "claude-3.5-sonnet")'),
		});

		const tool = new DynamicStructuredTool({
			name: 'xpay_pay_per_use',
			description: toolDescription,
			schema: inputSchema,
			func: async ({ action, searchQuery, serviceSlug, inputs, modelId }) => {
				try {
					if (action === 'discover') {
						const query: Record<string, string | number | boolean> = {};
						if (searchQuery) query.search = searchQuery;
						if (filters.verified) query.verified = true;
						if (filters.limit) query.limit = filters.limit;

						const response = await glyphCoreRequest(context, 'GET', ENDPOINTS.GLYPHS, undefined, query);

						const services = (response.glyphs || response || []).map((g: any) => ({
							serviceSlug: g.slug,
							name: g.name,
							description: g.description,
							type: g.type,
							pricing: g.pricing?.basePrice
								? `$${g.pricing.basePrice}`
								: g.pricing?.pricePerCall
									? `$${g.pricing.pricePerCall}/call`
									: 'varies',
							verified: g.verified,
							tags: g.tags || [],
						}));

						return JSON.stringify(
							{
								services,
								total: services.length,
								query: searchQuery,
								message: `Found ${services.length} services for "${searchQuery}". Use action "run" with a serviceSlug to execute a service.`,
							},
							null,
							2,
						);
					} else if (action === 'run') {
						if (!serviceSlug) {
							return JSON.stringify({ error: 'serviceSlug is required for action "run". Use action "discover" first.' });
						}

						const runParams: any = {
							glyphSlug: serviceSlug,
							modelId: modelId || defaultModelId,
							inputs: inputs || {},
						};

						if (options.temperature !== undefined) {
							runParams.temperature = options.temperature;
						}
						if (options.maxTokens !== undefined) {
							runParams.maxTokens = options.maxTokens;
						}

						const response = (await glyphRouterRequest(
							context,
							'POST',
							ENDPOINTS.RUN,
							runParams,
						)) as RunResult;

						return JSON.stringify(
							{
								runId: response.runId,
								status: response.success ? 'completed' : 'failed',
								output: response.output,
								error: response.error,
								cost: response.cost ? `$${response.cost}` : undefined,
								duration: response.duration || response.latencyMs,
								serviceSlug,
								modelId: modelId || defaultModelId,
							},
							null,
							2,
						);
					}

					return JSON.stringify({ error: `Unknown action: ${action}. Use "discover" or "run".` });
				} catch (error: any) {
					return JSON.stringify({
						error: error.message || 'Failed to execute action',
						action,
						serviceSlug,
					});
				}
			},
		});

		return {
			response: tool,
		};
	}
}
