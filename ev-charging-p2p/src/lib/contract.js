import { Contract } from "ethers";

/**
 * Dummy contract + ABI for demo / future wiring.
 * Set VITE_CONTRACT_ADDRESS in .env to attempt real calls (same ABI must exist on-chain).
 */

export const DUMMY_CONTRACT_ADDRESS =
  import.meta.env.VITE_CONTRACT_ADDRESS ||
  "0x000000000000000000000000000000000000dEaD";

/** Minimal ABI matching the product flow function names */
export const CHARGING_PLATFORM_ABI = [
  "function createRequest(string location, uint256 kwh, string timeSlot)",
  "function acceptRequest(uint256 requestId)",
  "function startCharging(uint256 requestId)",
  "function completeCharging(uint256 requestId)",
  "function releasePayment(uint256 requestId)",
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function createMockContract(signerOrProvider) {
  return {
    async createRequest(location, kwh, timeSlot) {
      await sleep(600 + Math.random() * 400);
      return { hash: "0xmock" + Date.now().toString(16), wait: async () => ({}) };
    },
    async acceptRequest(requestId) {
      await sleep(500);
      return { hash: "0xmock_accept_" + requestId, wait: async () => ({}) };
    },
    async startCharging(requestId) {
      await sleep(400);
      return { hash: "0xmock_start_" + requestId, wait: async () => ({}) };
    },
    async completeCharging(requestId) {
      await sleep(500);
      return { hash: "0xmock_done_" + requestId, wait: async () => ({}) };
    },
    async releasePayment(requestId) {
      await sleep(600);
      return { hash: "0xmock_pay_" + requestId, wait: async () => ({}) };
    },
  };
}

export function createRealContract(signer) {
  return new Contract(DUMMY_CONTRACT_ADDRESS, CHARGING_PLATFORM_ABI, signer);
}
