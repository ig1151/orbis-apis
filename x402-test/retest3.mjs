import { wrapFetchWithPayment, x402Client } from "@x402/fetch";
import { ExactEvmScheme } from "@x402/evm";
import { createWalletClient, http } from "viem";
import { base } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";

const account = privateKeyToAccount("0xb7a1e0a3b487ea55ef33bf02583a266a46061e1dcbecc21fb582d57dff72f470");
const walletClient = createWalletClient({ account, chain: base, transport: http() });
const signer = { address: account.address, signTypedData: (msg) => walletClient.signTypedData(msg) };
const schemeClient = new ExactEvmScheme(signer);
const client = x402Client.fromConfig({ schemes: [{ network: "eip155:8453", client: schemeClient }] });
const fetch402 = wrapFetchWithPayment(fetch, client);
const PROXY = "https://orbisapi.com/proxy";

const tests = [
  { slug: "amazon-product-scraper-api-147dd1", path: "/product", body: { asin: "B08N5KWB9H" } },
  { slug: "hotel-price-lookup-api-d8557b",     path: "/search",  body: { location: "New York, NY", check_in: "2026-07-01", check_out: "2026-07-03" } },
  { slug: "qr-barcode-api-63d612",             path: "/generate",body: { data: "https://orbisapi.com", format: "qr" } },
];

for (const t of tests) {
  const url = PROXY + "/" + t.slug + t.path;
  const start = Date.now();
  try {
    const res = await fetch402(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(t.body) });
    const ms = Date.now() - start;
    let data = {}; try { data = await res.json(); } catch {}
    const ok = res.status >= 200 && res.status < 300 && data.success !== false;
    console.log((ok ? "✅" : "❌") + " " + t.slug + " " + res.status + " " + ms + "ms " + (ok ? "" : JSON.stringify(data).slice(0,140)));
  } catch(e) { console.log("💀 " + t.slug + " " + e.message.slice(0,80)); }
}
