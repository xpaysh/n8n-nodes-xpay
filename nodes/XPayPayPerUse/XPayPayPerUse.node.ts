import type {
	IExecuteFunctions,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
	NodeConnectionType,
} from 'n8n-workflow';

import { glyphCoreRequest, glyphRouterRequest, handleApiError, sleep, parseInputsCollection } from '../../shared/api';
import { ENDPOINTS, DEFAULTS, MODEL_OPTIONS, SERVICE_TYPE_OPTIONS } from '../../shared/constants';
import type { ModelCatalogEntry, CostEstimate, RunResult, AsyncRunResult, RunStatusResult } from '../../shared/types';

export class XPayPayPerUse implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'xpay✦ pay-per-use',
		name: 'xPayPayPerUse',
		icon: 'file:xpay-pay-per-use.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["resource"] + ": " + $parameter["operation"]}}',
		description: 'Discover and execute marketplace services with automatic payment handling',
		defaults: {
			name: 'xpay✦ pay-per-use',
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
			// Resource selector
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Discover',
						value: 'discover',
						description: 'Search and retrieve services (agents, tools, prompts)',
					},
					{
						name: 'Run',
						value: 'run',
						description: 'Execute services with automatic payment handling',
					},
					{
						name: 'Model',
						value: 'model',
						description: 'List available LLM models and estimate costs',
					},
				],
				default: 'discover',
			},

			// ============================================
			// DISCOVER OPERATIONS
			// ============================================
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['discover'],
					},
				},
				options: [
					{
						name: 'Search',
						value: 'search',
						description: 'Search services by keyword',
						action: 'Search services',
					},
					{
						name: 'Get Service',
						value: 'getService',
						description: 'Get a specific service by slug or ID',
						action: 'Get service',
					},
					{
						name: 'Browse by Tags',
						value: 'browseByTags',
						description: 'List services filtered by tags (e.g., healthcare, sdr, research)',
						action: 'Browse services by tags',
					},
					{
						name: 'Browse by Type',
						value: 'browseByType',
						description: 'List services filtered by type',
						action: 'Browse services by type',
					},
				],
				default: 'search',
			},

			// Search query
			{
				displayName: 'Search Query',
				name: 'searchQuery',
				type: 'string',
				displayOptions: {
					show: {
						resource: ['discover'],
						operation: ['search'],
					},
				},
				default: '',
				placeholder: 'e.g., account research, lead scoring',
				description: 'Keywords to search for in service names and descriptions',
			},

			// Service slug/ID
			{
				displayName: 'Service Slug or ID',
				name: 'serviceSlug',
				type: 'string',
				displayOptions: {
					show: {
						resource: ['discover'],
						operation: ['getService'],
					},
				},
				default: '',
				required: true,
				placeholder: 'e.g., account-intel',
				description: 'The unique slug or ID of the service to retrieve',
			},

			// Tags filter
			{
				displayName: 'Tags',
				name: 'tags',
				type: 'string',
				displayOptions: {
					show: {
						resource: ['discover'],
						operation: ['browseByTags'],
					},
				},
				default: '',
				required: true,
				placeholder: 'e.g., sdr, research, healthcare',
				description: 'Comma-separated tags to filter by. Common tags: healthcare, legal, finance, sdr, research, analysis, writing, code, agent, automation',
			},

			// Type filter
			{
				displayName: 'Type',
				name: 'serviceType',
				type: 'options',
				displayOptions: {
					show: {
						resource: ['discover'],
						operation: ['browseByType'],
					},
				},
				options: SERVICE_TYPE_OPTIONS,
				default: 'agent',
				description: 'Filter services by type',
			},

			// Discover filters
			{
				displayName: 'Filters',
				name: 'filters',
				type: 'collection',
				placeholder: 'Add Filter',
				default: {},
				displayOptions: {
					show: {
						resource: ['discover'],
						operation: ['search', 'browseByTags', 'browseByType'],
					},
				},
				options: [
					{
						displayName: 'Verified Only',
						name: 'verified',
						type: 'boolean',
						default: false,
						description: 'Whether to only return verified services',
					},
					{
						displayName: 'Featured Only',
						name: 'featured',
						type: 'boolean',
						default: false,
						description: 'Whether to only return featured services',
					},
					{
						displayName: 'Trending Only',
						name: 'trending',
						type: 'boolean',
						default: false,
						description: 'Whether to only return trending services',
					},
					{
						displayName: 'Limit',
						name: 'limit',
						type: 'number',
						default: 20,
						description: 'Maximum number of results to return',
					},
					{
						displayName: 'Offset',
						name: 'offset',
						type: 'number',
						default: 0,
						description: 'Number of results to skip (for pagination)',
					},
				],
			},

			// ============================================
			// RUN OPERATIONS
			// ============================================
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['run'],
					},
				},
				options: [
					{
						name: 'Run Sync',
						value: 'runSync',
						description: 'Execute a service and wait for the result',
						action: 'Run sync',
					},
					{
						name: 'Run Async',
						value: 'runAsync',
						description: 'Start async execution (returns immediately with run ID)',
						action: 'Run async',
					},
					{
						name: 'Get Run Status',
						value: 'getRunStatus',
						description: 'Poll execution status for an async run',
						action: 'Get run status',
					},
				],
				default: 'runSync',
			},

			// Run: Service Slug
			{
				displayName: 'Service Slug',
				name: 'runServiceSlug',
				type: 'string',
				displayOptions: {
					show: {
						resource: ['run'],
						operation: ['runSync', 'runAsync'],
					},
				},
				default: '',
				required: true,
				placeholder: 'e.g., account-intel',
				description: 'The slug or ID of the service to execute. Use {{ $json.services[0].serviceSlug }} from a Discover operation.',
			},
			{
				displayName: 'Model',
				name: 'runModelId',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getModels',
				},
				displayOptions: {
					show: {
						resource: ['run'],
						operation: ['runSync', 'runAsync'],
					},
				},
				default: 'gpt-4o-mini',
				required: true,
				description: 'The LLM model to use for execution',
			},
			{
				displayName: 'Inputs',
				name: 'inputs',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				displayOptions: {
					show: {
						resource: ['run'],
						operation: ['runSync', 'runAsync'],
					},
				},
				default: {},
				placeholder: 'Add Input',
				description: 'Input values for the service. Check the service schema for required fields.',
				options: [
					{
						name: 'inputValues',
						displayName: 'Input',
						values: [
							{
								displayName: 'Key',
								name: 'key',
								type: 'string',
								default: '',
								placeholder: 'e.g., url, company_name',
								description: 'The input field name',
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								default: '',
								placeholder: 'e.g., https://example.com',
								description: 'The input value (supports expressions)',
							},
						],
					},
				],
			},

			// Async options
			{
				displayName: 'Wait for Completion',
				name: 'waitForCompletion',
				type: 'boolean',
				displayOptions: {
					show: {
						resource: ['run'],
						operation: ['runAsync'],
					},
				},
				default: true,
				description: 'Whether to poll and wait for the async execution to complete',
			},
			{
				displayName: 'Polling Timeout (seconds)',
				name: 'pollingTimeout',
				type: 'number',
				displayOptions: {
					show: {
						resource: ['run'],
						operation: ['runAsync'],
						waitForCompletion: [true],
					},
				},
				default: 180,
				description: 'Maximum time to wait for completion (in seconds)',
			},

			// Get Status: Run ID
			{
				displayName: 'Run ID',
				name: 'runId',
				type: 'string',
				displayOptions: {
					show: {
						resource: ['run'],
						operation: ['getRunStatus'],
					},
				},
				default: '',
				required: true,
				placeholder: 'e.g., run_abc123',
				description: 'The run ID from a previous async execution. Use {{ $json.runId }} from a previous Run operation.',
			},

			// Run: Advanced Options
			{
				displayName: 'Options',
				name: 'runOptions',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				displayOptions: {
					show: {
						resource: ['run'],
						operation: ['runSync', 'runAsync'],
					},
				},
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

			// ============================================
			// MODEL OPERATIONS
			// ============================================
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['model'],
					},
				},
				options: [
					{
						name: 'List Models',
						value: 'listModels',
						description: 'List all available LLM models',
						action: 'List models',
					},
					{
						name: 'Estimate Cost',
						value: 'estimateCost',
						description: 'Estimate the cost of a model inference',
						action: 'Estimate cost',
					},
				],
				default: 'listModels',
			},

			// Model filters
			{
				displayName: 'Filters',
				name: 'modelFilters',
				type: 'collection',
				placeholder: 'Add Filter',
				default: {},
				displayOptions: {
					show: {
						resource: ['model'],
						operation: ['listModels'],
					},
				},
				options: [
					{
						displayName: 'Provider',
						name: 'provider',
						type: 'options',
						options: [
							{ name: 'All Providers', value: '' },
							{ name: 'OpenAI', value: 'openai' },
							{ name: 'Anthropic', value: 'anthropic' },
							{ name: 'Google', value: 'google' },
							{ name: 'Meta', value: 'meta' },
							{ name: 'Mistral', value: 'mistral' },
							{ name: 'DeepSeek', value: 'deepseek' },
						],
						default: '',
						description: 'Filter by model provider',
					},
					{
						displayName: 'Tier',
						name: 'tier',
						type: 'options',
						options: [
							{ name: 'All Tiers', value: '' },
							{ name: 'Fast & Cheap', value: 'fast' },
							{ name: 'Balanced', value: 'balanced' },
							{ name: 'Reasoning Heavy', value: 'reasoning' },
						],
						default: '',
						description: 'Filter by model tier',
					},
					{
						displayName: 'Featured Only',
						name: 'featured',
						type: 'boolean',
						default: false,
						description: 'Whether to only return featured models',
					},
				],
			},

			// Cost estimation parameters
			{
				displayName: 'Model',
				name: 'costModelId',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getModels',
				},
				displayOptions: {
					show: {
						resource: ['model'],
						operation: ['estimateCost'],
					},
				},
				default: '',
				required: true,
				description: 'The model to estimate cost for',
			},
			{
				displayName: 'Input Tokens',
				name: 'inputTokens',
				type: 'number',
				displayOptions: {
					show: {
						resource: ['model'],
						operation: ['estimateCost'],
					},
				},
				default: 1000,
				description: 'Estimated number of input tokens',
			},
			{
				displayName: 'Output Tokens',
				name: 'outputTokens',
				type: 'number',
				displayOptions: {
					show: {
						resource: ['model'],
						operation: ['estimateCost'],
					},
				},
				default: 500,
				description: 'Estimated number of output tokens',
			},
		],
	};

	methods = {
		loadOptions: {
			async getModels(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				try {
					const response = await glyphCoreRequest(this, 'GET', ENDPOINTS.MODELS);
					const models = response.models || response || [];

					return models.map((model: ModelCatalogEntry) => ({
						name: `${model.displayName} (${model.tier})`,
						value: model.modelId,
						description: model.description || `${model.provider}`,
					}));
				} catch (error) {
					return MODEL_OPTIONS.map((m) => ({ ...m, description: '' }));
				}
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			try {
				const resource = this.getNodeParameter('resource', i) as string;
				const operation = this.getNodeParameter('operation', i) as string;

				let result: any;

				// ============================================
				// DISCOVER OPERATIONS
				// ============================================
				if (resource === 'discover') {
					if (operation === 'search') {
						const searchQuery = this.getNodeParameter('searchQuery', i) as string;
						const filters = this.getNodeParameter('filters', i) as {
							verified?: boolean;
							featured?: boolean;
							trending?: boolean;
							limit?: number;
							offset?: number;
						};

						const query: Record<string, string | number | boolean> = {};
						if (searchQuery) query.search = searchQuery;
						if (filters.verified) query.verified = true;
						if (filters.featured) query.featured = true;
						if (filters.trending) query.trending = true;
						if (filters.limit) query.limit = filters.limit;
						if (filters.offset) query.offset = filters.offset;

						const response = await glyphCoreRequest(this, 'GET', ENDPOINTS.GLYPHS, undefined, query);
						const services = (response.glyphs || response || []).map((g: any) => ({
							...g,
							serviceId: g.id,
							serviceSlug: g.slug,
						}));
						result = {
							services,
							total: response.total,
							query: searchQuery,
						};
					} else if (operation === 'getService') {
						const serviceSlug = this.getNodeParameter('serviceSlug', i) as string;
						const response = await glyphCoreRequest(this, 'GET', `${ENDPOINTS.GLYPH}/${serviceSlug}`);
						const glyph = response.glyph || response;
						result = {
							service: {
								...glyph,
								serviceId: glyph.id,
								serviceSlug: glyph.slug,
							},
						};
					} else if (operation === 'browseByTags') {
						const tags = this.getNodeParameter('tags', i) as string;
						const filters = this.getNodeParameter('filters', i) as {
							verified?: boolean;
							featured?: boolean;
							trending?: boolean;
							limit?: number;
							offset?: number;
						};

						const tagList = tags.split(',').map((t) => t.trim()).filter((t) => t);
						const query: Record<string, string | number | boolean> = { tags: tagList.join(',') };
						if (filters.verified) query.verified = true;
						if (filters.featured) query.featured = true;
						if (filters.trending) query.trending = true;
						if (filters.limit) query.limit = filters.limit;
						if (filters.offset) query.offset = filters.offset;

						const response = await glyphCoreRequest(this, 'GET', ENDPOINTS.GLYPHS, undefined, query);
						const services = (response.glyphs || response || []).map((g: any) => ({
							...g,
							serviceId: g.id,
							serviceSlug: g.slug,
						}));
						result = {
							services,
							total: response.total,
							tags: tagList,
						};
					} else if (operation === 'browseByType') {
						const serviceType = this.getNodeParameter('serviceType', i) as string;
						const filters = this.getNodeParameter('filters', i) as {
							verified?: boolean;
							featured?: boolean;
							trending?: boolean;
							limit?: number;
							offset?: number;
						};

						const query: Record<string, string | number | boolean> = { type: serviceType };
						if (filters.verified) query.verified = true;
						if (filters.featured) query.featured = true;
						if (filters.trending) query.trending = true;
						if (filters.limit) query.limit = filters.limit;
						if (filters.offset) query.offset = filters.offset;

						const response = await glyphCoreRequest(this, 'GET', ENDPOINTS.GLYPHS, undefined, query);
						const services = (response.glyphs || response || []).map((g: any) => ({
							...g,
							serviceId: g.id,
							serviceSlug: g.slug,
						}));
						result = {
							services,
							total: response.total,
							type: serviceType,
						};
					}
				}

				// ============================================
				// RUN OPERATIONS
				// ============================================
				else if (resource === 'run') {
					if (operation === 'runSync') {
						const serviceSlug = this.getNodeParameter('runServiceSlug', i) as string;
						const modelId = this.getNodeParameter('runModelId', i) as string;
						const inputsCollection = this.getNodeParameter('inputs', i) as {
							inputValues?: Array<{ key: string; value: string }>;
						};
						const options = this.getNodeParameter('runOptions', i) as {
							temperature?: number;
							maxTokens?: number;
						};

						const inputs = parseInputsCollection(inputsCollection);

						const runParams: any = {
							glyphSlug: serviceSlug,
							modelId,
							inputs,
						};

						if (options.temperature !== undefined) {
							runParams.temperature = options.temperature;
						}
						if (options.maxTokens !== undefined) {
							runParams.maxTokens = options.maxTokens;
						}

						const response = await glyphRouterRequest(this, 'POST', ENDPOINTS.RUN, runParams) as RunResult;

						result = {
							runId: response.runId,
							status: response.success ? 'completed' : 'failed',
							output: response.output,
							error: response.error,
							cost: response.cost,
							duration: response.duration || response.latencyMs,
							serviceSlug,
							modelId,
						};
					} else if (operation === 'runAsync') {
						const serviceSlug = this.getNodeParameter('runServiceSlug', i) as string;
						const modelId = this.getNodeParameter('runModelId', i) as string;
						const inputsCollection = this.getNodeParameter('inputs', i) as {
							inputValues?: Array<{ key: string; value: string }>;
						};
						const waitForCompletion = this.getNodeParameter('waitForCompletion', i) as boolean;
						const pollingTimeout = this.getNodeParameter('pollingTimeout', i, 180) as number;
						const options = this.getNodeParameter('runOptions', i) as {
							temperature?: number;
							maxTokens?: number;
						};

						const inputs = parseInputsCollection(inputsCollection);

						const runParams: any = {
							glyphSlug: serviceSlug,
							modelId,
							inputs,
						};

						if (options.temperature !== undefined) {
							runParams.temperature = options.temperature;
						}
						if (options.maxTokens !== undefined) {
							runParams.maxTokens = options.maxTokens;
						}

						const asyncResult = await glyphRouterRequest(
							this,
							'POST',
							ENDPOINTS.RUN_ASYNC,
							runParams,
						) as AsyncRunResult;

						if (!asyncResult.accepted || !asyncResult.runId) {
							throw new Error(asyncResult.error || 'Failed to start async execution');
						}

						if (!waitForCompletion) {
							result = {
								runId: asyncResult.runId,
								status: 'processing',
								statusUrl: asyncResult.statusUrl,
								message: asyncResult.message || 'Execution started',
								serviceSlug,
								modelId,
							};
						} else {
							const startTime = Date.now();
							const timeoutMs = pollingTimeout * 1000;

							while (true) {
								if (Date.now() - startTime > timeoutMs) {
									result = {
										runId: asyncResult.runId,
										status: 'timeout',
										error: `Execution did not complete within ${pollingTimeout} seconds`,
										serviceSlug,
										modelId,
									};
									break;
								}

								await sleep(DEFAULTS.POLLING_INTERVAL_MS);

								const statusResult = await glyphRouterRequest(
									this,
									'GET',
									`${ENDPOINTS.RUN_STATUS}/${asyncResult.runId}`,
								) as RunStatusResult;

								if (statusResult.status === 'success' || statusResult.status === 'completed') {
									result = {
										runId: asyncResult.runId,
										status: 'completed',
										output: statusResult.output,
										cost: statusResult.cost,
										duration: statusResult.duration,
										serviceSlug,
										modelId,
									};
									break;
								}

								if (statusResult.status === 'failed' || statusResult.status === 'error') {
									result = {
										runId: asyncResult.runId,
										status: 'failed',
										error: statusResult.error,
										serviceSlug,
										modelId,
									};
									break;
								}
							}
						}
					} else if (operation === 'getRunStatus') {
						const runId = this.getNodeParameter('runId', i) as string;

						const statusResult = await glyphRouterRequest(
							this,
							'GET',
							`${ENDPOINTS.RUN_STATUS}/${runId}`,
						) as RunStatusResult;

						result = {
							runId: statusResult.runId,
							status: statusResult.status,
							step: statusResult.step,
							progress: statusResult.progress,
							message: statusResult.message,
							output: statusResult.output,
							partialOutput: statusResult.partialOutput,
							error: statusResult.error,
							cost: statusResult.cost,
							duration: statusResult.duration,
						};
					}
				}

				// ============================================
				// MODEL OPERATIONS
				// ============================================
				else if (resource === 'model') {
					if (operation === 'listModels') {
						const modelFilters = this.getNodeParameter('modelFilters', i) as {
							provider?: string;
							tier?: string;
							featured?: boolean;
						};

						const query: Record<string, string | number | boolean> = {};
						if (modelFilters.provider) query.provider = modelFilters.provider;
						if (modelFilters.tier) query.tier = modelFilters.tier;
						if (modelFilters.featured) query.featured = true;

						const response = await glyphCoreRequest(this, 'GET', ENDPOINTS.MODELS, undefined, query);
						result = {
							models: response.models || response || [],
							total: response.total,
						};
					} else if (operation === 'estimateCost') {
						const modelId = this.getNodeParameter('costModelId', i) as string;
						const inputTokens = this.getNodeParameter('inputTokens', i) as number;
						const outputTokens = this.getNodeParameter('outputTokens', i) as number;

						const response = await glyphCoreRequest(this, 'POST', ENDPOINTS.MODELS_ESTIMATE, {
							modelId,
							inputTokens,
							outputTokens,
						});

						result = {
							estimate: response as CostEstimate,
							modelId,
							inputTokens,
							outputTokens,
						};
					}
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
				handleApiError(error, `${this.getNodeParameter('resource', i)}/${this.getNodeParameter('operation', i)}`);
			}
		}

		return [returnData];
	}
}
