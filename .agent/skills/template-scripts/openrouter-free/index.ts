export const DEFAULT_BASE_URL = "https://openrouter.ai/api/v1";
export const DEFAULT_MODELS_DEV_URL = "https://models.dev/api.json";

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

export type APIError = Error & {
  status?: number;
  body?: string;
};

export function createClient(options: ClientOptions = {}): Client {
  const baseURL = (options.baseURL || DEFAULT_BASE_URL).replace(/\/+$/, "");
  const apiKey = options.apiKey || "";
  const headers = { ...(options.headers || {}) };
  const modelsDevURL =
    (options.modelsDevURL || DEFAULT_MODELS_DEV_URL).replace(/\/+$/, "");

  async function listModels(
    params: ListModelsParams = {},
    fetchOptions: RequestInit = {}
  ): Promise<ModelsResponse> {
    const url = new URL(baseURL + "/models");
    if (params.category) {
      url.searchParams.set("category", params.category);
    }
    if (typeof params.useRss === "boolean") {
      url.searchParams.set("use_rss", String(params.useRss));
    }
    if (typeof params.useRssChatLinks === "boolean") {
      url.searchParams.set(
        "use_rss_chat_links",
        String(params.useRssChatLinks)
      );
    }

    const reqHeaders: Record<string, string> = {
      ...headers,
      ...(fetchOptions.headers as Record<string, string> | undefined),
    };
    if (apiKey) {
      reqHeaders.Authorization = `Bearer ${apiKey}`;
    }

    const response = await fetch(url.toString(), {
      method: "GET",
      ...fetchOptions,
      headers: reqHeaders,
    });

    if (!response.ok) {
      const body = await safeReadText(response);
      const err = new Error(
        `openrouter api error (status ${response.status})${
          body ? `: ${body}` : ""
        }`
      ) as APIError;
      err.status = response.status;
      err.body = body;
      throw err;
    }

    return (await response.json()) as ModelsResponse;
  }

  async function listFreeModels(
    params: ListModelsParams = {},
    fetchOptions: RequestInit = {}
  ): Promise<ModelsResponse> {
    const payload = await listModels(params, fetchOptions);
    return {
      ...payload,
      data: filterFree(payload?.data || []),
    };
  }

  async function rankFreeModels(
    params: ListModelsParams = {},
    fetchOptions: RequestInit = {}
  ): Promise<ModelsResponse> {
    const payload = await listFreeModels(params, fetchOptions);
    const modelsDev = await fetchModelsDev(modelsDevURL, fetchOptions);
    const ranked = rankModelsByPrice(payload?.data || [], modelsDev);
    return {
      ...payload,
      data: ranked,
    };
  }

  return { listFreeModels, rankFreeModels };
}

export function isFreePricing(pricing: Pricing | undefined): boolean {
  const prompt = isZeroPrice(pricing?.prompt);
  const completion = isZeroPrice(pricing?.completion);
  if (!prompt.known || !completion.known) {
    return false;
  }
  if (!prompt.zero || !completion.zero) {
    return false;
  }

  const otherFields = [
    pricing?.request,
    pricing?.image,
    pricing?.web_search,
    pricing?.internal_reasoning,
    pricing?.input_cache_read,
    pricing?.input_cache_write,
  ];

  for (const value of otherFields) {
    const result = isZeroPrice(value);
    if (result.known && !result.zero) {
      return false;
    }
  }

  return true;
}

export function filterFree(models: Model[] | undefined): Model[] {
  if (!Array.isArray(models)) {
    return [];
  }
  return models.filter((model) => isFreePricing(model?.pricing));
}

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
  models: Model[] | undefined,
  modelsDevData: unknown
): RankedModel[] {
  if (!Array.isArray(models)) {
    return [];
  }

  const providerIndex = buildModelsDevIndex(modelsDevData);

  const scored = models.map((model) => {
    const provider = getProviderFromId(model?.id);
    const providerKey = normalizeProviderName(provider);
    const baseId = stripProviderAndFree(model?.id);
    const providers = providerIndex.get(baseId) || [];

    let priceInfo: PricingQuality | null = null;
    if (providerKey) {
      const match = providers.find(
        (entry) => entry.providerKey && entry.providerKey === providerKey
      );
      if (match && isPositivePrice(match.input) && isPositivePrice(match.output)) {
        priceInfo = {
          avg: (match.input + match.output) / 2,
          source: "official",
          provider: match.provider,
          input: match.input,
          output: match.output,
        };
      }
    }

    if (!priceInfo) {
      const validProviders = providers.filter(
        (entry) =>
          entry.provider &&
          isPositivePrice(entry.input) &&
          isPositivePrice(entry.output)
      );
      if (validProviders.length > 0) {
        const avgPrice =
          validProviders.reduce(
            (sum, entry) => sum + (entry.input + entry.output) / 2,
            0
          ) / validProviders.length;
        priceInfo = {
          avg: avgPrice,
          source: "proxy",
          provider: validProviders.map((entry) => entry.provider),
          input: null,
          output: null,
        };
      }
    }

    return {
      ...model,
      pricing_quality: priceInfo,
      base_model_id: baseId,
      provider_id: provider,
    };
  });

  const sorted = scored.slice().sort((a, b) => {
    const aPrice = a.pricing_quality?.avg;
    const bPrice = b.pricing_quality?.avg;
    if (aPrice === undefined && bPrice === undefined) return 0;
    if (aPrice === undefined) return 1;
    if (bPrice === undefined) return -1;
    return bPrice - aPrice;
  });

  return sorted.map((model, index) => ({
    ...model,
    pricing_rank: index + 1,
  }));
}

export function stripProviderAndFree(id: string | undefined): string {
  if (!id) return "";
  const withoutFree = String(id).replace(/:free$/i, "");
  const parts = withoutFree.split("/");
  return parts[parts.length - 1] || withoutFree;
}

export function getProviderFromId(id: string | undefined): string {
  if (!id) return "";
  const parts = String(id).split("/");
  return parts.length > 1 ? parts[0] : "";
}

function isZeroPrice(value: unknown): { known: boolean; zero: boolean } {
  if (value === null || value === undefined) {
    return { known: false, zero: false };
  }
  if (typeof value === "number") {
    return { known: true, zero: value === 0 };
  }
  const trimmed = String(value).trim();
  if (!trimmed) {
    return { known: false, zero: false };
  }
  const parsed = Number(trimmed);
  if (Number.isNaN(parsed)) {
    return { known: true, zero: false };
  }
  return { known: true, zero: parsed === 0 };
}

async function safeReadText(response: Response): Promise<string> {
  try {
    return await response.text();
  } catch {
    return "";
  }
}

function isPositivePrice(value: number | null): boolean {
  if (value === null || value === undefined) return false;
  return Number.isFinite(value) && value > 0;
}

async function fetchModelsDev(
  modelsDevURL: string,
  fetchOptions: RequestInit = {}
): Promise<unknown> {
  const response = await fetch(modelsDevURL, {
    method: "GET",
    ...fetchOptions,
  });
  if (!response.ok) {
    const body = await safeReadText(response);
    const err = new Error(
      `models.dev api error (status ${response.status})${
        body ? `: ${body}` : ""
      }`
    ) as APIError;
    err.status = response.status;
    err.body = body;
    throw err;
  }
  return response.json();
}

type ProviderPrice = {
  provider: string;
  providerKey: string;
  input: number | null;
  output: number | null;
};

function buildModelsDevIndex(data: unknown): Map<string, ProviderPrice[]> {
  const index = new Map<string, ProviderPrice[]>();

  const addProviderModels = (
    providerName: string,
    models: unknown
  ): void => {
    if (!models) return;
    const providerKey = normalizeProviderName(providerName);

    const pushEntry = (modelId: string, model: Record<string, unknown>) => {
      if (!modelId) return;
      const baseId = stripProviderAndFree(modelId);
      const input = getPrice(model, [
        "cost.input",
        "cost.prompt",
        "pricing.input",
        "pricing.prompt",
        "pricing.request",
        "input",
        "prompt",
        "input_cost",
        "input_price",
      ]);
      const output = getPrice(model, [
        "cost.output",
        "cost.completion",
        "pricing.output",
        "pricing.completion",
        "output",
        "completion",
        "output_cost",
        "output_price",
      ]);
      if (!index.has(baseId)) {
        index.set(baseId, []);
      }
      index.get(baseId)?.push({
        provider: providerName,
        providerKey,
        input,
        output,
      });
    };

    if (Array.isArray(models)) {
      for (const model of models as Record<string, unknown>[]) {
        const modelId =
          model?.id || model?.model || model?.name || model?.slug || model?.key;
        if (modelId && typeof modelId === "string") {
          pushEntry(modelId, model);
        }
      }
      return;
    }

    if (models && typeof models === "object") {
      for (const [modelId, model] of Object.entries(
        models as Record<string, unknown>
      )) {
        const resolvedId =
          (model as Record<string, unknown>)?.id ||
          (model as Record<string, unknown>)?.model ||
          (model as Record<string, unknown>)?.name ||
          (model as Record<string, unknown>)?.slug ||
          modelId;
        if (typeof resolvedId === "string") {
          pushEntry(resolvedId, model as Record<string, unknown>);
        }
      }
    }
  };

  if (data && typeof data === "object" && !Array.isArray(data)) {
    const dataObj = data as Record<string, unknown>;
    if (Array.isArray(dataObj.models)) {
      addProviderModels("models-dev", dataObj.models);
    } else if (dataObj.models && typeof dataObj.models === "object") {
      addProviderModels("models-dev", dataObj.models);
    } else {
      for (const [providerName, provider] of Object.entries(dataObj)) {
        const providerObj = provider as Record<string, unknown>;
        addProviderModels(
          providerName,
          providerObj?.models ||
            providerObj?.model_list ||
            providerObj?.data ||
            providerObj
        );
      }
    }
    return index;
  }

  if (Array.isArray(data)) {
    addProviderModels("models-dev", data);
  }

  return index;
}

function getPrice(obj: Record<string, unknown>, paths: string[]): number | null {
  for (const path of paths) {
    const value = getByPath(obj, path);
    if (value !== undefined && value !== null && value !== "") {
      const num = Number(value);
      if (Number.isFinite(num)) {
        return num;
      }
    }
  }
  return null;
}

function getByPath(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split(".");
  let current: unknown = obj;
  for (const part of parts) {
    if (!current || typeof current !== "object") {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

function normalizeProviderName(name: string | undefined): string {
  if (!name) return "";
  return String(name).trim().toLowerCase();
}
