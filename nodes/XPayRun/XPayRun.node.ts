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
import { ENDPOINTS, DEFAULTS, MODEL_OPTIONS } from '../../shared/constants';
import type { ModelCatalogEntry, RunResult, AsyncRunResult, RunStatusResult } from '../../shared/types';

export class XPayRun implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'xpay✦ Run',
		name: 'xPayRun',
		icon: 'file:xpay-run.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"]}}',
		description: 'Execute glyphs with automatic payment handling and status tracking',
		defaults: {
			name: 'xpay✦ Run',
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
						name: 'Run Sync',
						value: 'runSync',
						description: 'Execute a glyph and wait for the result',
						action: 'Run sync',
					},
					{
						name: 'Run Async',
						value: 'runAsync',
						description: 'Start async execution (returns immediately with run ID)',
						action: 'Run async',
					},
					{
						name: 'Get Status',
						value: 'getStatus',
						description: 'Poll execution status for an async run',
						action: 'Get status',
					},
					{
						name: 'Rerun',
						value: 'rerun',
						description: 'Re-execute a previous run',
						action: 'Rerun',
					},
				],
				default: 'runSync',
			},

			// ============================================
			// RUN PARAMETERS (runSync, runAsync)
			// ============================================
			{
				displayName: 'Glyph Slug',
				name: 'glyphSlug',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['runSync', 'runAsync'],
					},
				},
				default: '',
				required: true,
				placeholder: 'e.g., account-intel',
				description: 'The slug or ID of the glyph to execute. You can use expressions like {{ $json.glyph.slug }} from XPayDiscover.',
			},
			{
				displayName: 'Model',
				name: 'modelId',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getModels',
				},
				displayOptions: {
					show: {
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
						operation: ['runSync', 'runAsync'],
					},
				},
				default: {},
				placeholder: 'Add Input',
				description: 'Input values for the glyph. Check the glyph schema for required fields.',
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

			// ============================================
			// ASYNC OPTIONS
			// ============================================
			{
				displayName: 'Wait for Completion',
				name: 'waitForCompletion',
				type: 'boolean',
				displayOptions: {
					show: {
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
						operation: ['runAsync'],
						waitForCompletion: [true],
					},
				},
				default: 180,
				description: 'Maximum time to wait for completion (in seconds)',
			},

			// ============================================
			// GET STATUS PARAMETERS
			// ============================================
			{
				displayName: 'Run ID',
				name: 'runId',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['getStatus', 'rerun'],
					},
				},
				default: '',
				required: true,
				placeholder: 'e.g., run_abc123',
				description: 'The run ID from a previous async execution. You can use {{ $json.runId }} from a previous XPayRun node.',
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
				displayOptions: {
					show: {
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
					// Return default models if API fails
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
				const operation = this.getNodeParameter('operation', i) as string;
				let result: any;

				// ============================================
				// RUN SYNC
				// ============================================
				if (operation === 'runSync') {
					const glyphSlug = this.getNodeParameter('glyphSlug', i) as string;
					const modelId = this.getNodeParameter('modelId', i) as string;
					const inputsCollection = this.getNodeParameter('inputs', i) as {
						inputValues?: Array<{ key: string; value: string }>;
					};
					const options = this.getNodeParameter('options', i) as {
						temperature?: number;
						maxTokens?: number;
					};

					const inputs = parseInputsCollection(inputsCollection);

					const runParams: any = {
						glyphSlug,
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
						glyphSlug,
						modelId,
					};
				}

				// ============================================
				// RUN ASYNC
				// ============================================
				else if (operation === 'runAsync') {
					const glyphSlug = this.getNodeParameter('glyphSlug', i) as string;
					const modelId = this.getNodeParameter('modelId', i) as string;
					const inputsCollection = this.getNodeParameter('inputs', i) as {
						inputValues?: Array<{ key: string; value: string }>;
					};
					const waitForCompletion = this.getNodeParameter('waitForCompletion', i) as boolean;
					const pollingTimeout = this.getNodeParameter('pollingTimeout', i, 180) as number;
					const options = this.getNodeParameter('options', i) as {
						temperature?: number;
						maxTokens?: number;
					};

					const inputs = parseInputsCollection(inputsCollection);

					const runParams: any = {
						glyphSlug,
						modelId,
						inputs,
					};

					if (options.temperature !== undefined) {
						runParams.temperature = options.temperature;
					}
					if (options.maxTokens !== undefined) {
						runParams.maxTokens = options.maxTokens;
					}

					// Start async execution
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
						// Return immediately with run ID
						result = {
							runId: asyncResult.runId,
							status: 'processing',
							statusUrl: asyncResult.statusUrl,
							message: asyncResult.message || 'Execution started',
							glyphSlug,
							modelId,
						};
					} else {
						// Poll for completion
						const startTime = Date.now();
						const timeoutMs = pollingTimeout * 1000;

						while (true) {
							if (Date.now() - startTime > timeoutMs) {
								result = {
									runId: asyncResult.runId,
									status: 'timeout',
									error: `Execution did not complete within ${pollingTimeout} seconds`,
									glyphSlug,
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
									glyphSlug,
									modelId,
								};
								break;
							}

							if (statusResult.status === 'failed' || statusResult.status === 'error') {
								result = {
									runId: asyncResult.runId,
									status: 'failed',
									error: statusResult.error,
									glyphSlug,
									modelId,
								};
								break;
							}
						}
					}
				}

				// ============================================
				// GET STATUS
				// ============================================
				else if (operation === 'getStatus') {
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

				// ============================================
				// RERUN
				// ============================================
				else if (operation === 'rerun') {
					const runId = this.getNodeParameter('runId', i) as string;

					const response = await glyphCoreRequest(
						this,
						'POST',
						`${ENDPOINTS.ACCOUNT_RUNS}/${runId}/rerun`,
					);

					result = {
						originalRunId: runId,
						newRunId: response.runId,
						status: response.status || 'processing',
						message: response.message || 'Rerun started',
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
