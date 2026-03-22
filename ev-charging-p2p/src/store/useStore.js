import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  createMockContract,
  createRealContract,
} from "../lib/contract";

const demoRequests = [
  {
    id: "1",
    location: "Downtown Hub, Bay St",
    kwh: 42,
    timeSlot: "Today 14:00–16:00",
    status: "pending",
    receiver: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0",
    donor: null,
    createdAt: Date.now() - 3600000,
  },
  {
    id: "2",
    location: "Mall North parking L2",
    kwh: 55,
    timeSlot: "Tomorrow 09:00–11:00",
    status: "accepted",
    receiver: "0x1111111111111111111111111111111111111111",
    donor: "0x2222222222222222222222222222222222222222",
    createdAt: Date.now() - 7200000,
  },
];

function useDemoContract() {
  return createMockContract();
}

export const useStore = create(
  persist(
    (set, get) => ({
      walletAddress: null,
      signer: null,
      provider: null,
      chainId: null,
      isConnected: false,
      demoMode: false,

      role: null,

      requests: [],

      sessions: {},

      setWallet: ({ address, signer, provider, chainId, demoMode }) =>
        set({
          walletAddress: address,
          signer,
          provider,
          chainId,
          isConnected: true,
          demoMode: !!demoMode,
        }),

      disconnect: () =>
        set({
          walletAddress: null,
          signer: null,
          provider: null,
          chainId: null,
          isConnected: false,
          demoMode: false,
          role: null,
        }),

      setRole: (role) => set({ role }),

      initDemoRequests: () => {
        if (get().requests.length === 0) {
          set({ requests: [...demoRequests] });
        }
      },

      addRequest: (req) =>
        set((s) => ({
          requests: [
            {
              ...req,
              id: "req-" + Date.now(),
              status: "pending",
              donor: null,
              createdAt: Date.now(),
            },
            ...s.requests,
          ],
        })),

      updateRequest: (id, patch) =>
        set((s) => ({
          requests: s.requests.map((r) =>
            r.id === id ? { ...r, ...patch } : r
          ),
        })),

      setSession: (requestId, session) =>
        set((s) => ({
          sessions: { ...s.sessions, [requestId]: { ...s.sessions[requestId], ...session } },
        })),

      getContract: () => {
        const { demoMode, signer } = get();
        if (demoMode || !signer) return useDemoContract();
        try {
          return createRealContract(signer);
        } catch {
          return useDemoContract();
        }
      },

      toReqBigInt: (id) => {
        const n = String(id).replace(/\D/g, "");
        return BigInt(n || "1");
      },

      submitCreateRequest: async (location, kwh, timeSlot) => {
        const w = get().walletAddress;
        get().addRequest({
          receiver: w,
          location,
          kwh: Number(kwh),
          timeSlot,
        });
        const rid = get().requests[0]?.id;
        try {
          const tx = await get()
            .getContract()
            .createRequest(
              location,
              BigInt(Math.floor(Number(kwh))),
              timeSlot
            );
          if (tx?.wait) await tx.wait();
        } catch (e) {
          console.warn("createRequest:", e);
        }
        return rid;
      },

      donorAccept: async (id) => {
        const w = get().walletAddress;
        get().updateRequest(id, { status: "accepted", donor: w });
        try {
          const tx = await get()
            .getContract()
            .acceptRequest(get().toReqBigInt(id));
          if (tx?.wait) await tx.wait();
        } catch (e) {
          console.warn("acceptRequest:", e);
        }
      },

      startChargingSession: async (id) => {
        get().updateRequest(id, { status: "charging" });
        get().setSession(id, { startedAt: Date.now(), progress: 0 });
        try {
          const tx = await get()
            .getContract()
            .startCharging(get().toReqBigInt(id));
          if (tx?.wait) await tx.wait();
        } catch (e) {
          console.warn("startCharging:", e);
        }
      },

      completeChargingSession: async (id) => {
        get().updateRequest(id, { status: "completed" });
        get().setSession(id, { endedAt: Date.now(), progress: 100 });
        try {
          const tx = await get()
            .getContract()
            .completeCharging(get().toReqBigInt(id));
          if (tx?.wait) await tx.wait();
        } catch (e) {
          console.warn("completeCharging:", e);
        }
      },

      releasePaymentTx: async (id) => {
        try {
          const tx = await get()
            .getContract()
            .releasePayment(get().toReqBigInt(id));
          if (tx?.wait) await tx.wait();
        } catch (e) {
          console.warn("releasePayment:", e);
        }
        get().updateRequest(id, { paymentReleased: true });
      },
    }),
    {
      name: "ev-p2p-storage",
      partialize: (s) => ({
        role: s.role,
        requests: s.requests,
        sessions: s.sessions,
      }),
    }
  )
);
