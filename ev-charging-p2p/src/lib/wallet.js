import { BrowserProvider } from "ethers";

export function getInjectedEthereum() {
  if (typeof window === "undefined") return null;
  const eth = window.ethereum;
  if (!eth) return null;
  if (eth.providers?.length) {
    return eth.providers.find((p) => p.isMetaMask) || eth.providers[0];
  }
  return eth;
}

export async function connectMetaMask() {
  const eth = getInjectedEthereum();
  if (!eth) {
    throw new Error(
      "No wallet found. Install MetaMask and use Chrome, Edge, or Firefox."
    );
  }
  const provider = new BrowserProvider(eth);
  // Force a permission prompt every time so the user can choose an account.
  try {
    await eth.request({
      method: "wallet_requestPermissions",
      params: [{ eth_accounts: {} }],
    });
  } catch (e) {
    // Fallback: some wallets don't support wallet_requestPermissions; use the legacy request.
    await provider.send("eth_requestAccounts", []);
  }

  const signer = await provider.getSigner();
  const address = await signer.getAddress();
  const network = await provider.getNetwork();
  return { provider, signer, address, chainId: Number(network.chainId) };
}
