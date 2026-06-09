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
const PROXY = "https://orbisapi.com/proxy";
const slug = "top-movers-api-a516a1";

const tests = [
  { path: "/losers",   body: { limit: 5 } },
  { path: "/trending", body: { limit: 5 } },
  { path: "/lookup",   body: { limit: 5 } },
];

for (const t of tests) {
  try {
    const r = await fetch402(`${PROXY}/${slug}${t.path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(t.body),
    });
    const text = await r.text();
    let parsed;
    try { parsed = JSON.parse(text); } catch { parsed = null; }
    // Detect the refusal pattern
    const blob = text.toLowerCase();
    const refused = blob.includes("unable to provide") || blob.includes("real-time") && blob.includes("cannot");
    const key = t.path.replace("/", "");
    const arr = parsed?.[key] || parsed?.losers || parsed?.trending || parsed?.gainers;
    const count = Array.isArray(arr) ? arr.length : (parsed?.gainers ? "multi" : "?");
    const sample = Array.isArray(arr) && arr[0] ? `${arr[0].symbol || arr[0].name || "?"}` : "";
    console.log(`${refused ? "❌ REFUSED" : "✅ OK     "} ${t.path.padEnd(10)} ${r.status}  items=${count} ${sample}`);
    if (refused) console.log("   raw:", text.slice(0, 200));
  } catch (e) {
    console.log(`💀 ERROR   ${t.path}  ${e.message}`);
  }
}
