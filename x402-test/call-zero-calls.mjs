import { wrapFetchWithPayment, x402Client } from "@x402/fetch";
import { ExactEvmScheme } from "@x402/evm";
import { createWalletClient, http } from "viem";
import { base } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";

const privateKey = process.env.PRIVATE_KEY;
if (!privateKey) throw new Error("PRIVATE_KEY env var is required.");

const account = privateKeyToAccount(privateKey);
const walletClient = createWalletClient({ account, chain: base, transport: http() });
const signer = { address: account.address, signTypedData: (msg) => walletClient.signTypedData(msg) };
const schemeClient = new ExactEvmScheme(signer);
const client = x402Client.fromConfig({ schemes: [{ network: "eip155:8453", client: schemeClient }] });
const fetch402 = wrapFetchWithPayment(fetch, client);

const PROXY    = "https://orbisapi.com/proxy";
const WALLET   = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045";
const CONTRACT = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";

const tests = [
  // ── Gap APIs: 28 newly listed (2026-05-25) ────────────────────────────────
  { slug: "amazon-product-scraper-api-147dd1",                   path: "/product",                     body: { asin: "B08N5KWB9H" } },
  { slug: "address-validation-api-f4b848",                       path: "/validate",                    body: { address: "1600 Pennsylvania Ave NW, Washington DC 20500" } },
  { slug: "ats-keyword-api-9d9de1",                              path: "/extract-keywords",            body: { job_description: "We are looking for a Senior Software Engineer with 5+ years of Python and JavaScript experience." } },
  { slug: "shipping-rate-api-254c60",                            path: "/estimate",                    body: { origin_zip: "10001", dest_zip: "90210", weight_lbs: 2 } },
  { slug: "ip-geolocation-api-b389b3",                           path: "/lookup",                      body: { ip: "8.8.8.8" } },
  { slug: "text-extractor-api-c64dc3",                           path: "/extract",                     body: { text: "Invoice #1234 from Acme Corp, due 2026-06-01, total $500.", schema: "invoice_number, vendor, amount, due_date" } },
  { slug: "crypto-price-api-a212c7",                             path: "/price",                       body: { symbol: "BTC" } },
  { slug: "calendar-holiday-api-e91a49",                         path: "/holidays",                    body: { country: "US", year: 2026 } },
  { slug: "currency-formatting-api-c46bfa",                      path: "/format",                      body: { amount: 1234.56, currency: "USD" } },
  { slug: "hotel-price-lookup-api-d8557b",                       path: "/search",                      body: { location: "New York, NY", check_in: "2026-07-01", check_out: "2026-07-03" } },
  { slug: "package-tracking-api-7883fd",                         path: "/track",                       body: { tracking_number: "1Z999AA10123456784" } },
  { slug: "defi-position-risk-api-fef6a7",                       path: "/",                            method: "GET" },
  { slug: "web-page-extractor-api-e55e5d",                       path: "/extract-text",                body: { url: "https://example.com" } },
  { slug: "favicon-api-269de7",                                  path: "/favicon",                     body: { url: "https://example.com" } },
  { slug: "domain-intelligence-api-9d26f1",                      path: "/whois",                       body: { domain: "example.com" } },
  { slug: "timezone-api-3017a7",                                 path: "/lookup",                      body: { location: "New York, USA" } },
  { slug: "url-screenshot-diff-api-29de97",                      path: "/capture",                     body: { url: "https://example.com" } },
  { slug: "flight-status-api-e5f1bb",                            path: "/status",                      body: { flight_number: "AA100" } },
  { slug: "fx-rates-api-8d45aa",                                 path: "/latest",                      body: { base: "USD" } },
  { slug: "website-change-monitor-api-5f7dad",                   path: "/check",                       body: { url: "https://example.com" } },
  { slug: "logo-finder-api-215567",                              path: "/logo",                        body: { domain: "anthropic.com" } },
  { slug: "price-monitor-api-9d7b38",                            path: "/extract-price",               body: { url: "https://example.com/product" } },
  { slug: "news-search-api-3c06f9",                              path: "/latest",                      body: { limit: 5 } },
  { slug: "unit-conversion-api-ccf30b",                          path: "/convert",                     body: { value: 100, from_unit: "km", to_unit: "miles" } },
  { slug: "qr-barcode-api-63d612",                               path: "/generate",                    body: { data: "https://orbisapi.com", format: "qr" } },
  { slug: "resume-parser-api-64e5b7",                            path: "/parse",                       body: { resume_url: "https://example.com/resume.pdf" } },
  { slug: "tax-rate-lookup-api-3b1119",                          path: "/sales-tax",                   body: { zip_code: "10001" } },
  { slug: "unified-multi-provider-agent-completion-api-fa0b3b",  path: "/v1/chat/completions",         body: { model: "claude-sonnet", messages: [{ role: "user", content: "What is 2+2?" }], max_tokens: 50 } },

  // ── Newly listed APIs with confirmed marketplace slugs ───────────────────
  { slug: "ai-output-safety-api-d3b0f3",                         path: "/v1/check",                    body: { text: "This is a test output for safety validation." } },
  { slug: "token-trust-api-d1d13a",                              path: "/v1/check",                    body: { contract: CONTRACT, chain: "ethereum" } },
  { slug: "phone-validation-api-be22c9",                         path: "/v1/validate",                 body: { phone: "+14155552671" } },
  { slug: "search-extract-api-f1caaf",                           path: "/v1/search",                   body: { query: "latest AI developments 2026", max_results: 3 } },

  // ── Older listings with 0 calls ───────────────────────────────────────────
  { slug: "wallet-balance-api-df563c",                           path: "/lookup",                      body: { address: WALLET, chain: "ethereum" } },
];

const results = { pass: [], fail: [], error: [] };
console.log(`Wallet: ${account.address}`);
console.log(`Calling ${tests.length} zero-call APIs via x402...\n`);

for (const test of tests) {
  const url = `${PROXY}/${test.slug}${test.path}`;
  const method = test.method || "POST";
  const start = Date.now();
  try {
    const fetchOptions = { method, headers: { "Content-Type": "application/json" } };
    if (method !== "GET" && test.body) fetchOptions.body = JSON.stringify(test.body);
    const res = await fetch402(url, fetchOptions);
    const ms = Date.now() - start;
    let data = {};
    try { data = await res.json(); } catch {}
    const success = res.status >= 200 && res.status < 300 && data.success !== false;
    if (success) {
      results.pass.push({ slug: test.slug, ms });
      console.log(`✅ ${test.slug.padEnd(60)} ${res.status}  ${ms}ms`);
    } else {
      const err = data.error || data.message || data.details || JSON.stringify(data).slice(0, 100);
      results.fail.push({ slug: test.slug, status: res.status, error: err });
      console.log(`❌ ${test.slug.padEnd(60)} ${res.status}  ${JSON.stringify(err).slice(0, 80)}`);
    }
  } catch (e) {
    results.error.push({ slug: test.slug, error: e.message });
    console.log(`💀 ${test.slug.padEnd(60)} ERR  ${e.message.slice(0, 60)}`);
  }
}

console.log("\n=== SUMMARY ===");
console.log(`✅ Pass:  ${results.pass.length}`);
console.log(`❌ Fail:  ${results.fail.length}`);
console.log(`💀 Error: ${results.error.length}`);
if (results.fail.length) {
  console.log("\nFailed:");
  results.fail.forEach(f => console.log(`  ❌ ${f.slug} (${f.status}) — ${JSON.stringify(f.error).slice(0, 100)}`));
}
if (results.error.length) {
  console.log("\nErrors:");
  results.error.forEach(f => console.log(`  💀 ${f.slug} — ${f.error.slice(0, 80)}`));
}
