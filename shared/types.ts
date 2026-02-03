/**
 * Shared TypeScript Types for xpay n8n nodes
 * Adapted from xpay-hub/src/types/glyph.ts
 */

// ============================================
// GLYPH TYPES
// ============================================

export type GlyphCategory = 'launch' | 'secure' | 'optimize';
export type GlyphType = 'agent' | 'tool' | 'prompt' | 'model';
export type GlyphStatus = 'draft' | 'published' | 'archived' | 'deprecated';
export type PricingModel = 'per-run' | 'per-token' | 'per-second' | 'free';
export type ModelProvider = 'openai' | 'anthropic' | 'meta' | 'google' | 'mistral' | 'cohere' | 'deepseek';
export type ModelTier = 'fast' | 'balanced' | 'reasoning';

export interface GlyphSchemaField {
	name: string;
	label: string;
	type: 'text' | 'textarea' | 'number' | 'file' | 'select' | 'checkbox' | 'url';
	required: boolean;
	placeholder?: string;
	description?: string;
	options?: string[];
	min?: number;
	max?: number;
	accept?: string;
}

export interface GlyphSchema {
	inputs: GlyphSchemaField[];
	outputs?: {
		type: string;
		mimeType?: string;
		language?: string;
		description?: string;
		downloadable?: boolean;
	};
}

export interface GlyphPricing {
	model: PricingModel;
	amount: number;
	currency: 'USDC';
	estimatedCost?: string;
}

export interface GlyphStats {
	totalRuns: number;
	totalRevenue: number;
	averageRating: number;
	totalRatings: number;
	successRate: number;
	averageLatency: number;
}

export interface Glyph {
	id: string;
	slug: string;
	name: string;
	description: string;
	longDescription?: string;
	category: GlyphCategory;
	type: GlyphType;
	tags: string[];
	coverImage?: string;
	schema: GlyphSchema;
	pricing?: GlyphPricing;
	ownerId: string;
	ownerName: string;
	ownerAvatar?: string;
	verified: boolean;
	status: GlyphStatus;
	featured: boolean;
	trending: boolean;
	stats: GlyphStats;
	version: string;
	createdAt: number;
	updatedAt: number;
	publishedAt?: number;
	icon?: string;
}

// ============================================
// MODEL TYPES
// ============================================

export interface ModelCapabilities {
	chat: boolean;
	vision: boolean;
	functionCalling: boolean;
	jsonMode: boolean;
	streaming: boolean;
}

export interface ModelPricing {
	input: number;
	output: number;
	xpayMarkupPercent: number;
	effectiveInput?: number;
	effectiveOutput?: number;
}

export interface ModelCatalogEntry {
	modelId: string;
	provider: ModelProvider;
	openrouterId: string;
	displayName: string;
	description?: string;
	capabilities: ModelCapabilities;
	contextWindow?: number;
	maxOutputTokens?: number;
	knowledgeCutoff?: string;
	pricing: ModelPricing;
	tier: ModelTier;
	isFeatured: boolean;
	isActive?: boolean;
}

// ============================================
// COLLECTION TYPES
// ============================================

export interface CollectionTheme {
	id: string;
	slug: string;
	name: string;
	description: string;
	coverImage?: string;
	collectionType: 'curated' | 'tag_based' | 'hybrid';
	glyphIds?: string[];
	filterTags?: string[];
	filterCategories?: GlyphCategory[];
	filterTypes?: GlyphType[];
	curatedBy?: string;
	curatorName?: string;
	featured: boolean;
	glyphCount?: number;
	createdAt: number;
	updatedAt: number;
}

// ============================================
// RUN TYPES
// ============================================

export type RunStatus = 'processing' | 'success' | 'completed' | 'failed' | 'error' | 'unknown';

export interface RunResult {
	runId?: string;
	success?: boolean;
	status?: RunStatus;
	output?: any;
	partialOutput?: string;
	error?: string;
	cost?: number;
	duration?: number;
	latencyMs?: number;
}

export interface AsyncRunResult {
	accepted: boolean;
	runId: string;
	status: string;
	statusUrl: string;
	message?: string;
	error?: string;
}

export interface RunStatusResult {
	runId: string;
	status: RunStatus;
	step?: string;
	progress?: number;
	message?: string;
	output?: any;
	partialOutput?: string;
	error?: string;
	cost?: number;
	duration?: number;
	createdAt?: number;
	completedAt?: number;
}

// ============================================
// WALLET/BALANCE TYPES
// ============================================

export interface WalletBalance {
	available: number;
	locked?: number;
	currency: string;
	creditsRemaining?: number;
}

// ============================================
// SMART PROXY / AGENT TYPES
// ============================================

export interface AgentLimits {
	perCall?: number | null;
	perMinute?: number | null;
	perDay?: number | null;
	perWeek?: number | null;
	perMonth?: number | null;
	lifetime?: number | null;
}

export interface SmartProxyAgent {
	customerId: string;
	agentId: string;
	userId: string;
	name: string;
	description?: string;
	walletId?: string | null;
	status: 'active' | 'paused' | 'suspended';
	agentLimits: AgentLimits;
	allowedDomains: string[];
	blockedDomains: string[];
	domainLimits: Record<string, number>;
	totalSpent: number;
	spentThisMinute: number;
	spentThisDay: number;
	spentThisWeek: number;
	spentThisMonth: number;
	proxyUrl: string;
	createdAt: number;
	updatedAt: number;
}

export interface EffectiveLimits {
	agentLimits: AgentLimits;
	customerLimits: AgentLimits;
	effectiveLimits: AgentLimits;
}

export interface SpendingHistory {
	date: string;
	spent: number;
}

export interface SpendingInfo {
	today: SpendingHistory;
	history: SpendingHistory[];
}

// ============================================
// API RESPONSE TYPES
// ============================================

export interface GlyphListResponse {
	glyphs: Glyph[];
	total?: number;
	limit?: number;
	offset?: number;
}

export interface ModelListResponse {
	models: ModelCatalogEntry[];
	total?: number;
}

export interface CollectionListResponse {
	collections: CollectionTheme[];
}

export interface CostEstimate {
	inputCost: number;
	outputCost: number;
	total: number;
	currency: string;
}
