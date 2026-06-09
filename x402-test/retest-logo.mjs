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

const start = Date.now();
const res = await fetch402(`${PROXY}/logo-finder-api-215567/logo`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ domain: "anthropic.com" })
});
const ms = Date.now() - start;
let data = {}; try { data = await res.json(); } catch {}
const ok = res.status >= 200 && res.status < 300 && data.success !== false;
console.log((ok ? "✅" : "❌") + ` logo-finder-api-215567  ${res.status}  ${ms}ms`);
if (!ok) console.log(JSON.stringify(data).slice(0, 200));
else console.log("success:", data.success, "| domain:", data.domain || data.logo?.domain);
