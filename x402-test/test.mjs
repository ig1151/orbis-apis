import { wrapFetchWithPayment, x402Client } from "@x402/fetch";
import { ExactEvmScheme } from "@x402/evm";
import { createWalletClient, http } from "viem";
import { base } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";

const privateKey = "0xb7a1e0a3b487ea55ef33bf02583a266a46061e1dcbecc21fb582d57dff72f470";
const account = privateKeyToAccount(privateKey);

const walletClient = createWalletClient({
  account,
  chain: base,
  transport: http(),
});

const signer = {
  address: account.address,
  signTypedData: (msg) => walletClient.signTypedData(msg),
};

const schemeClient = new ExactEvmScheme(signer);

const client = x402Client.fromConfig({
  schemes: [
    { network: "eip155:8453", client: schemeClient }
  ],
});

const fetch402 = wrapFetchWithPayment(fetch, client);

const response = await fetch402("https://orbisapi.com/proxy/browser-task-execution-api-d8c3ef/run", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    goal: "Summarize the homepage",
    task_type: "visit_and_summarize",
    url: "https://example.com"
  }),
});

const data = await response.json();
console.log(JSON.stringify(data, null, 2));
