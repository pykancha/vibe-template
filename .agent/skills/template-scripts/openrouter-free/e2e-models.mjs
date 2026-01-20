import { createClient } from "./index.js";

const apiKey = process.env.OPENROUTER_API_KEY || "";
const baseURL = process.env.OPENROUTER_BASE_URL || undefined;

const client = createClient({ apiKey, baseURL });

function assert(cond, msg) {
  if (!cond) {
    throw new Error(`assertion failed: ${msg}`);
  }
}

function loosePropertyCheck(model, idx) {
  const issues = [];
  if (!model || typeof model !== "object") {
    issues.push("model is not an object");
    return issues;
  }
  if (typeof model.id !== "string" || !model.id) {
    issues.push("missing id");
  }
  if (typeof model.name !== "string" || !model.name) {
    issues.push("missing name");
  }
  if (typeof model.context_length !== "number") {
    issues.push("context_length not number");
  }
  if (!model.pricing || typeof model.pricing !== "object") {
    issues.push("missing pricing");
  }
  if (!model.architecture || typeof model.architecture !== "object") {
    issues.push("missing architecture");
  }
  if (!Array.isArray(model.supported_parameters)) {
    issues.push("supported_parameters not array");
  }
  if (issues.length > 0) {
    return [`#${idx} ${model?.id || "(no id)"}: ${issues.join(", ")}`];
  }
  return [];
}

async function run() {
  console.log("OpenRouter Models E2E");
  console.log("-".repeat(40));

  const response = await client.listFreeModels({});
  assert(response && Array.isArray(response.data), "response.data should be array");

  const models = response.data;
  console.log(`Fetched models: ${models.length}`);

  const issues = [];
  models.forEach((model, idx) => {
    issues.push(...loosePropertyCheck(model, idx));
  });

  if (issues.length > 0) {
    console.log("Property check warnings:");
    issues.slice(0, 50).forEach((issue) => console.log("-", issue));
    if (issues.length > 50) {
      console.log(`... ${issues.length - 50} more`);
    }
  } else {
    console.log("Property check warnings: none");
  }

  console.log(`Free models (pricing=0): ${models.length}`);

  console.log("\nModels:");
  models.slice(0, 200).forEach((model) => {
    const pricing = model.pricing || {};
    console.log(
      `- ${model.id} | name=${model.name} | context=${model.context_length} | prompt=${pricing.prompt} | completion=${pricing.completion}`
    );
  });
  if (models.length > 200) {
    console.log(`... ${models.length - 200} more`);
  }

  console.log("-".repeat(40));
  console.log("E2E complete");
}

run().catch((err) => {
  console.error("E2E failed:", err);
  process.exit(1);
});
