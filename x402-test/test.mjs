import { wrapFetchWithPayment, x402Client } from "@x402/fetch";
import { ExactEvmScheme } from "@x402/evm";
import { createWalletClient, http } from "viem";
import { base } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";

const privateKey = "0xb7a1e0a3b487ea55ef33bf02583a266a46061e1dcbecc21fb582d57dff72f470";
const account = privateKeyToAccount(privateKey);
const walletClient = createWalletClient({ account, chain: base, transport: http() });
const signer = { address: account.address, signTypedData: (msg) => walletClient.signTypedData(msg) };
const schemeClient = new ExactEvmScheme(signer);
const client = x402Client.fromConfig({ schemes: [{ network: "eip155:8453", client: schemeClient }] });
const fetch402 = wrapFetchWithPayment(fetch, client);

// Use a debug endpoint that echoes headers
const response = await fetch402("https://orbisapi.com/proxy/image-generation-intelligence-2c054e/generate", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ prompt: "a red apple" }),
});

// Log response headers to see what Orbis sends back
console.log("Response status:", response.status);
console.log("Response headers:");
for (const [k, v] of response.headers.entries()) {
  console.log(`  ${k}: ${v}`);
}
const data = await response.json();
console.log("Body:", JSON.stringify(data, null, 2));
