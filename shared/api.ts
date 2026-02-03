/**
 * API Utilities for xpay n8n nodes
 * Provides helper functions for making authenticated API requests
 */

import type { IExecuteFunctions, ILoadOptionsFunctions, IHttpRequestOptions } from 'n8n-workflow';
import {
	type Environment,
	GLYPH_CORE_URLS,
	GLYPH_ROUTER_URLS,
	SMART_PROXY_URLS,
} from './constants';

export interface XPayCredentials {
	apiKey: string;
	environment: Environment;
	smartProxyEnabled?: boolean;
	customerId?: string;
}

/**
 * Get credentials from the node context
 */
export async function getXPayCredentials(
	context: IExecuteFunctions | ILoadOptionsFunctions,
): Promise<XPayCredentials> {
	const credentials = await context.getCredentials('xPayApi');
	return {
		apiKey: credentials.apiKey as string,
		environment: (credentials.environment as Environment) || 'sandbox',
		smartProxyEnabled: credentials.smartProxyEnabled as boolean | undefined,
		customerId: credentials.customerId as string | undefined,
	};
}

/**
 * Get the base URL for Glyphrun Core API
 */
export function getCoreBaseUrl(environment: Environment): string {
	return GLYPH_CORE_URLS[environment];
}

/**
 * Get the base URL for Glyphrun Router API
 */
export function getRouterBaseUrl(environment: Environment): string {
	return GLYPH_ROUTER_URLS[environment];
}

/**
 * Get the base URL for Smart Proxy API
 */
export function getSmartProxyBaseUrl(environment: Environment): string {
	return SMART_PROXY_URLS[environment];
}

/**
 * Make an authenticated request to Glyphrun Core API
 */
export async function glyphCoreRequest(
	context: IExecuteFunctions | ILoadOptionsFunctions,
	method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
	endpoint: string,
	body?: object,
	query?: Record<string, string | number | boolean>,
): Promise<any> {
	const credentials = await getXPayCredentials(context);
	const baseUrl = getCoreBaseUrl(credentials.environment);

	const options: IHttpRequestOptions = {
		method,
		url: `${baseUrl}${endpoint}`,
		headers: {
			'Content-Type': 'application/json',
		},
		json: true,
	};

	if (body) {
		options.body = body;
	}

	if (query) {
		options.qs = query;
	}

	return context.helpers.httpRequestWithAuthentication.call(context, 'xPayApi', options);
}

/**
 * Make an authenticated request to Glyphrun Router API
 */
export async function glyphRouterRequest(
	context: IExecuteFunctions | ILoadOptionsFunctions,
	method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
	endpoint: string,
	body?: object,
	query?: Record<string, string | number | boolean>,
): Promise<any> {
	const credentials = await getXPayCredentials(context);
	const baseUrl = getRouterBaseUrl(credentials.environment);

	const options: IHttpRequestOptions = {
		method,
		url: `${baseUrl}${endpoint}`,
		headers: {
			'Content-Type': 'application/json',
		},
		json: true,
	};

	if (body) {
		options.body = body;
	}

	if (query) {
		options.qs = query;
	}

	return context.helpers.httpRequestWithAuthentication.call(context, 'xPayApi', options);
}

/**
 * Make an authenticated request to Smart Proxy API
 */
export async function smartProxyRequest(
	context: IExecuteFunctions | ILoadOptionsFunctions,
	method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
	endpoint: string,
	body?: object,
	query?: Record<string, string | number | boolean>,
): Promise<any> {
	const credentials = await getXPayCredentials(context);
	const baseUrl = getSmartProxyBaseUrl(credentials.environment);

	const options: IHttpRequestOptions = {
		method,
		url: `${baseUrl}${endpoint}`,
		headers: {
			'Content-Type': 'application/json',
		},
		json: true,
	};

	if (body) {
		options.body = body;
	}

	if (query) {
		options.qs = query;
	}

	return context.helpers.httpRequestWithAuthentication.call(context, 'xPayApi', options);
}

/**
 * Sleep utility for polling
 */
export function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Format cost from micros to dollars
 */
export function formatCost(costMicros: number): string {
	return (costMicros / 1000000).toFixed(4);
}

/**
 * Parse inputs from n8n fixed collection to key-value object
 */
export function parseInputsCollection(
	inputsCollection: { inputValues?: Array<{ key: string; value: string }> } | undefined,
): Record<string, any> {
	if (!inputsCollection?.inputValues) {
		return {};
	}

	const inputs: Record<string, any> = {};
	for (const item of inputsCollection.inputValues) {
		if (item.key) {
			// Try to parse JSON values
			try {
				inputs[item.key] = JSON.parse(item.value);
			} catch {
				inputs[item.key] = item.value;
			}
		}
	}
	return inputs;
}

/**
 * Handle API errors consistently
 */
export function handleApiError(error: any, operation: string): never {
	const message = error.response?.data?.error || error.message || 'Unknown error';
	const statusCode = error.response?.status || error.statusCode;

	if (statusCode === 401) {
		throw new Error(`Authentication failed for ${operation}. Please check your API key.`);
	}

	if (statusCode === 403) {
		throw new Error(`Access denied for ${operation}. You may not have permission.`);
	}

	if (statusCode === 404) {
		throw new Error(`Resource not found for ${operation}.`);
	}

	if (statusCode === 402) {
		throw new Error(`Payment required for ${operation}. Please check your wallet balance.`);
	}

	if (statusCode === 429) {
		throw new Error(`Rate limit exceeded for ${operation}. Please try again later.`);
	}

	throw new Error(`${operation} failed: ${message}`);
}
