export type ModelsResponse = {
  data: Model[];
};

export type Model = {
  id: string;
  canonical_slug: string;
  name: string;
  created: number;
  description: string;
  context_length: number;
  architecture: Architecture;
  pricing: Pricing;
  top_provider: TopProvider;
  per_request_limits: Record<string, unknown> | null;
  supported_parameters: string[];
  default_parameters?: Record<string, unknown>;
  expiration_date?: unknown;
};

export type Architecture = {
  modality?: string;
  input_modalities: string[];
  output_modalities: string[];
  tokenizer: string;
  instruct_type: string | null;
};

export type Pricing = {
  prompt: string;
  completion: string;
  request?: string;
  image?: string;
  web_search?: string;
  internal_reasoning?: string;
  input_cache_read?: string;
  input_cache_write?: string;
};

export type TopProvider = {
  context_length: number;
  max_completion_tokens: number;
  is_moderated: boolean;
};

export type ListModelsParams = {
  category?: string;
  useRss?: boolean;
  useRssChatLinks?: boolean;
};

export type ClientOptions = {
  apiKey?: string;
  baseURL?: string;
  modelsDevURL?: string;
  headers?: Record<string, string>;
};

export type Client = {
  listFreeModels: (
    params?: ListModelsParams,
    fetchOptions?: RequestInit
  ) => Promise<ModelsResponse>;
  rankFreeModels: (
    params?: ListModelsParams,
    fetchOptions?: RequestInit
  ) => Promise<ModelsResponse>;
};

export function createClient(options?: ClientOptions): Client;
export function isFreePricing(pricing: Pricing): boolean;
export function filterFree(models: Model[]): Model[];
export type PricingQuality = {
  avg: number;
  source: "official" | "proxy";
  provider: string | string[];
  input: number | null;
  output: number | null;
};
export type RankedModel = Model & {
  pricing_quality?: PricingQuality | null;
  pricing_rank?: number;
  base_model_id?: string;
  provider_id?: string;
};
export function rankModelsByPrice(
  models: Model[],
  modelsDevData: unknown
): RankedModel[];
export function stripProviderAndFree(id?: string): string;
export function getProviderFromId(id?: string): string;
export const DEFAULT_MODELS_DEV_URL: string;
export const DEFAULT_BASE_URL: string;
