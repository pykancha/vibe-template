export const DEFAULT_BASE_URL = "https://openrouter.ai/api/v1";
export const DEFAULT_MODELS_DEV_URL = "https://models.dev/api.json";

export function createClient(options = {}) {
  const baseURL = (options.baseURL || DEFAULT_BASE_URL).replace(/\/+$/, "");
  const apiKey = options.apiKey || "";
  const headers = { ...(options.headers || {}) };
  const modelsDevURL =
    (options.modelsDevURL || DEFAULT_MODELS_DEV_URL).replace(/\/+$/, "");

  async function listModels(params = {}, fetchOptions = {}) {
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

    const reqHeaders = { ...headers, ...(fetchOptions.headers || {}) };
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
      );
      err.status = response.status;
      err.body = body;
      throw err;
    }

    return response.json();
  }

  async function listFreeModels(params = {}, fetchOptions = {}) {
    const payload = await listModels(params, fetchOptions);
    return {
      ...payload,
      data: filterFree(payload?.data || []),
    };
  }

  async function rankFreeModels(params = {}, fetchOptions = {}) {
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

export function isFreePricing(pricing) {
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

export function filterFree(models) {
  if (!Array.isArray(models)) {
    return [];
  }
  return models.filter((model) => isFreePricing(model?.pricing));
}

export function rankModelsByPrice(models, modelsDevData) {
  if (!Array.isArray(models)) {
    return [];
  }
  const providerIndex = buildModelsDevIndex(modelsDevData);

  const scored = models.map((model) => {
    const provider = getProviderFromId(model?.id);
    const providerKey = normalizeProviderName(provider);
    const baseId = stripProviderAndFree(model?.id);
    const providers = providerIndex.get(baseId) || [];

    let priceInfo = null;
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

export function stripProviderAndFree(id) {
  if (!id) return "";
  const withoutFree = String(id).replace(/:free$/i, "");
  const parts = withoutFree.split("/");
  return parts[parts.length - 1] || withoutFree;
}

export function getProviderFromId(id) {
  if (!id) return "";
  const parts = String(id).split("/");
  return parts.length > 1 ? parts[0] : "";
}

function isZeroPrice(value) {
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

async function safeReadText(response) {
  try {
    return await response.text();
  } catch {
    return "";
  }
}

function isPositivePrice(value) {
  const num = Number(value);
  return Number.isFinite(num) && num > 0;
}

async function fetchModelsDev(modelsDevURL, fetchOptions = {}) {
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
    );
    err.status = response.status;
    err.body = body;
    throw err;
  }
  return response.json();
}

function buildModelsDevIndex(data) {
  const index = new Map();

  const addProviderModels = (providerName, models) => {
    if (!models) return;
    const providerKey = normalizeProviderName(providerName);

    const pushEntry = (modelId, model) => {
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
      index.get(baseId).push({
        provider: providerName,
        providerKey,
        input,
        output,
      });
    };

    if (Array.isArray(models)) {
      for (const model of models) {
        const modelId =
          model?.id || model?.model || model?.name || model?.slug || model?.key;
        pushEntry(modelId, model);
      }
      return;
    }

    if (models && typeof models === "object") {
      for (const [modelId, model] of Object.entries(models)) {
        const resolvedId =
          model?.id || model?.model || model?.name || model?.slug || modelId;
        pushEntry(resolvedId, model);
      }
    }
  };

  if (data && typeof data === "object" && !Array.isArray(data)) {
    const dataObj = data;
    if (Array.isArray(dataObj.models)) {
      addProviderModels("models-dev", dataObj.models);
    } else if (dataObj.models && typeof dataObj.models === "object") {
      addProviderModels("models-dev", dataObj.models);
    } else {
      for (const [providerName, provider] of Object.entries(dataObj)) {
        addProviderModels(
          providerName,
          provider?.models || provider?.model_list || provider?.data || provider
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

function getPrice(obj, paths) {
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

function getByPath(obj, path) {
  const parts = path.split(".");
  let current = obj;
  for (const part of parts) {
    if (!current || typeof current !== "object") {
      return undefined;
    }
    current = current[part];
  }
  return current;
}

function normalizeProviderName(name) {
  if (!name) return "";
  return String(name).trim().toLowerCase();
}
