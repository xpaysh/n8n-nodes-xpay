import type {
	IExecuteFunctions,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
	NodeConnectionType,
} from 'n8n-workflow';

import { glyphCoreRequest, handleApiError } from '../../shared/api';
import { ENDPOINTS, SERVICE_TYPE_OPTIONS } from '../../shared/constants';
import type { ModelCatalogEntry, CostEstimate } from '../../shared/types';

export class XPayDiscover implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'xpay✦ Discover',
		name: 'xPayDiscover',
		icon: 'file:xpay-discover.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + ($parameter["resource"] || "service")}}',
		description: 'Search and discover services (agents, tools, prompts), models, and collections from the xpay✦ marketplace',
		defaults: {
			name: 'xpay✦ Discover',
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
						name: 'Service',
						value: 'service',
						description: 'Search and retrieve services (agents, tools, prompts)',
					},
					{
						name: 'Model',
						value: 'model',
						description: 'List available LLM models and estimate costs',
					},
					{
						name: 'Collection',
						value: 'collection',
						description: 'Browse themed collections of services',
					},
				],
				default: 'service',
			},

			// ============================================
			// SERVICE OPERATIONS
			// ============================================
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['service'],
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
						name: 'Get',
						value: 'get',
						description: 'Get a specific service by slug or ID',
						action: 'Get service',
					},
					{
						name: 'List by Tags',
						value: 'listByTags',
						description: 'List services filtered by tags (e.g., healthcare, sdr, research)',
						action: 'List services by tags',
					},
					{
						name: 'List by Type',
						value: 'listByType',
						description: 'List services filtered by type',
						action: 'List services by type',
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
						resource: ['service'],
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
						resource: ['service'],
						operation: ['get'],
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
						resource: ['service'],
						operation: ['listByTags'],
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
						resource: ['service'],
						operation: ['listByType'],
					},
				},
				options: SERVICE_TYPE_OPTIONS,
				default: 'agent',
				description: 'Filter services by type',
			},

			// Service filters (additional)
			{
				displayName: 'Filters',
				name: 'filters',
				type: 'collection',
				placeholder: 'Add Filter',
				default: {},
				displayOptions: {
					show: {
						resource: ['service'],
						operation: ['search', 'listByTags', 'listByType'],
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
				name: 'modelId',
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

			// ============================================
			// COLLECTION OPERATIONS
			// ============================================
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['collection'],
					},
				},
				options: [
					{
						name: 'List Collections',
						value: 'listCollections',
						description: 'List all themed collections',
						action: 'List collections',
					},
					{
						name: 'Get Collection',
						value: 'getCollection',
						description: 'Get a specific collection with its services',
						action: 'Get collection',
					},
				],
				default: 'listCollections',
			},

			// Collection slug
			{
				displayName: 'Collection Slug',
				name: 'collectionSlug',
				type: 'string',
				displayOptions: {
					show: {
						resource: ['collection'],
						operation: ['getCollection'],
					},
				},
				default: '',
				required: true,
				placeholder: 'e.g., sales-tools',
				description: 'The unique slug of the collection to retrieve',
			},

			// Collection filters
			{
				displayName: 'Filters',
				name: 'collectionFilters',
				type: 'collection',
				placeholder: 'Add Filter',
				default: {},
				displayOptions: {
					show: {
						resource: ['collection'],
						operation: ['listCollections'],
					},
				},
				options: [
					{
						displayName: 'Featured Only',
						name: 'featured',
						type: 'boolean',
						default: false,
						description: 'Whether to only return featured collections',
					},
				],
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
						name: `${model.displayName} (${model.provider})`,
						value: model.modelId,
						description: model.description || `${model.tier} tier`,
					}));
				} catch (error) {
					// Return default models if API fails
					return [
						{ name: 'GPT-4o Mini', value: 'gpt-4o-mini' },
						{ name: 'GPT-4o', value: 'gpt-4o' },
						{ name: 'Claude 3.5 Sonnet', value: 'claude-3.5-sonnet' },
						{ name: 'Claude 3.5 Haiku', value: 'claude-3.5-haiku' },
					];
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
				// SERVICE OPERATIONS (internally uses glyph API)
				// ============================================
				if (resource === 'service') {
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
						// Map glyph response to service terminology
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
					} else if (operation === 'get') {
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
					} else if (operation === 'listByTags') {
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
					} else if (operation === 'listByType') {
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
						const modelId = this.getNodeParameter('modelId', i) as string;
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

				// ============================================
				// COLLECTION OPERATIONS
				// ============================================
				else if (resource === 'collection') {
					if (operation === 'listCollections') {
						const collectionFilters = this.getNodeParameter('collectionFilters', i) as {
							featured?: boolean;
						};

						const query: Record<string, string | number | boolean> = {};
						if (collectionFilters.featured) query.featured = true;

						const response = await glyphCoreRequest(this, 'GET', ENDPOINTS.COLLECTIONS, undefined, query);
						result = {
							collections: response.collections || response || [],
						};
					} else if (operation === 'getCollection') {
						const collectionSlug = this.getNodeParameter('collectionSlug', i) as string;
						const response = await glyphCoreRequest(
							this,
							'GET',
							`${ENDPOINTS.COLLECTION}/${collectionSlug}`,
						);
						// Map glyphs to services in collection response
						const services = (response.glyphs || []).map((g: any) => ({
							...g,
							serviceId: g.id,
							serviceSlug: g.slug,
						}));
						result = {
							collection: response.collection || response,
							services,
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
