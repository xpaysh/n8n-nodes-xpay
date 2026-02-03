/**
 * API Endpoint Constants for xpay n8n nodes
 */

export type Environment = 'sandbox' | 'production';

// Glyphrun Core API (Catalog, Wallet, Users)
export const GLYPH_CORE_URLS: Record<Environment, string> = {
	sandbox: 'https://7qzahhyw77.execute-api.us-east-1.amazonaws.com/dev',
	production: 'https://7qzahhyw77.execute-api.us-east-1.amazonaws.com/dev', // TODO: Update for production
};

// Glyphrun Router API (Execution)
export const GLYPH_ROUTER_URLS: Record<Environment, string> = {
	sandbox: 'https://zn3nt9p4tf.execute-api.us-east-1.amazonaws.com/dev',
	production: 'https://zn3nt9p4tf.execute-api.us-east-1.amazonaws.com/dev', // TODO: Update for production
};

// Smart Proxy API
export const SMART_PROXY_URLS: Record<Environment, string> = {
	sandbox: 'https://9o3kiqjr72.execute-api.us-east-1.amazonaws.com/dev',
	production: 'https://9o3kiqjr72.execute-api.us-east-1.amazonaws.com/dev', // TODO: Update for production
};

// Pay-to-Run API (for XPayTrigger - kept for reference)
export const PAYWALL_URLS: Record<Environment, string> = {
	sandbox: 'https://cja09z457f.execute-api.us-east-1.amazonaws.com/dev',
	production: 'https://m8efqvrb1b.execute-api.us-east-1.amazonaws.com/prod',
};

// API Endpoints
export const ENDPOINTS = {
	// Glyphrun Core
	GLYPHS: '/glyphs',
	GLYPH: '/glyph', // + /{slug}
	MODELS: '/models',
	MODELS_ESTIMATE: '/models/estimate',
	COLLECTIONS: '/collections',
	COLLECTION: '/collection', // + /{slug}
	WALLET_BALANCE: '/wallet/balance',
	ACCOUNT_STATS: '/account/stats',
	ACCOUNT_RUNS: '/account/runs',

	// Glyphrun Router
	RUN: '/run',
	RUN_ASYNC: '/run/async',
	RUN_STATUS: '/run/status', // + /{runId}

	// Smart Proxy
	PROXY: '/n8n/proxy',
	POLICY_SESSION: '/policy/session',
	AGENTS: '/agents',
	CUSTOMERS: '/customers',
	LIMITS: '/limits',
};

// Default values
export const DEFAULTS = {
	POLLING_INTERVAL_MS: 2000,
	POLLING_TIMEOUT_MS: 180000, // 3 minutes
	STREAMING_POLLING_INTERVAL_MS: 1000,
};

// Model options for dropdown (commonly used models)
export const MODEL_OPTIONS = [
	{ name: 'GPT-4o Mini (Fast)', value: 'gpt-4o-mini' },
	{ name: 'GPT-4o', value: 'gpt-4o' },
	{ name: 'Claude 3.5 Sonnet', value: 'claude-3.5-sonnet' },
	{ name: 'Claude 3.5 Haiku', value: 'claude-3.5-haiku' },
	{ name: 'Gemini 1.5 Flash', value: 'gemini-1.5-flash' },
	{ name: 'Gemini 1.5 Pro', value: 'gemini-1.5-pro' },
	{ name: 'Llama 3.1 70B', value: 'llama-3.1-70b-instruct' },
	{ name: 'Llama 3.1 8B', value: 'llama-3.1-8b-instruct' },
	{ name: 'Mistral Large', value: 'mistral-large' },
	{ name: 'DeepSeek V3', value: 'deepseek-chat' },
];

// Common tag options (for suggestions - users can also enter custom tags)
export const COMMON_TAG_OPTIONS = [
	// Verticals
	{ name: 'Healthcare', value: 'healthcare' },
	{ name: 'Legal', value: 'legal' },
	{ name: 'Finance', value: 'finance' },
	{ name: 'Real Estate', value: 'real-estate' },
	{ name: 'E-commerce', value: 'ecommerce' },
	// Functions
	{ name: 'SDR / Sales', value: 'sdr' },
	{ name: 'Research', value: 'research' },
	{ name: 'Analysis', value: 'analysis' },
	{ name: 'Writing', value: 'writing' },
	{ name: 'Code', value: 'code' },
	// Capabilities
	{ name: 'Agent', value: 'agent' },
	{ name: 'Automation', value: 'automation' },
	{ name: 'Data Processing', value: 'data' },
];

// Service type options
export const SERVICE_TYPE_OPTIONS = [
	{ name: 'Agent', value: 'agent' },
	{ name: 'Tool', value: 'tool' },
	{ name: 'Prompt', value: 'prompt' },
];

// Run status descriptions
export const RUN_STATUS_DESCRIPTIONS: Record<string, string> = {
	processing: 'The service is currently executing',
	success: 'Execution completed successfully',
	completed: 'Execution completed successfully',
	failed: 'Execution failed with an error',
	error: 'An error occurred during execution',
	unknown: 'Status is unknown',
};
