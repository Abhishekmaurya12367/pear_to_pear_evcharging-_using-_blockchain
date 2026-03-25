import { create } from "zustand";
import { persist } from "zustand/middleware";
import { ChargingStatus, createChainContracts } from "../lib/chainContracts";
import { connectMetaMask } from "../lib/wallet";

export const useStore = create(
  persist(
    (set, get) => ({
      walletAddress: null,
      signer: null,
      provider: null,
      chainId: null,
      isConnected: false,

      role: null,

      requests: [],

      sessions: {},
      adminAddress: null,

      setWallet: ({ address, signer, provider, chainId }) =>
        set({
          walletAddress: address,
          signer,
          provider,
          chainId,
          isConnected: true,
        }),

      disconnect: () =>
        set({
          walletAddress: null,
          signer: null,
          provider: null,
          chainId: null,
          isConnected: false,
          role: null,
        }),

      setRole: (role) => set({ role }),
      setAdminAddress: (addr) => set({ adminAddress: addr }),

      addRequest: (req) =>
        set((s) => ({
          requests: [
            {
              ...req,
              id: req.id || "req-" + Date.now(),
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

      toReqBigInt: (id) => {
        const n = String(id).replace(/\D/g, "");
        return BigInt(n || "1");
      },

      submitCreateRequest: async (location, kwh, timeSlot) => {
        let w = get().walletAddress;
        let { signer, provider, chainId } = get();
        // If the user didn't click the main connect button, try to connect here.
        if (!signer || !provider) {
          const { provider: p, signer: s, address, chainId: cid } =
            await connectMetaMask();
          set({
            walletAddress: address,
            signer: s,
            provider: p,
            chainId: cid,
            isConnected: true,
          });
          w = address;
          signer = s;
          provider = p;
          chainId = cid;
        }
        if (!signer) throw new Error("Connect your wallet before creating a request.");
        if (!provider) throw new Error("Missing provider - reconnect your wallet.");

        let chargingRequest;
        let userRegistry;
        let defaultPricePerKilo;
        try {
          ({ chargingRequest, userRegistry, defaultPricePerKilo } = createChainContracts(
            signer
          ));
        } catch (e) {
          console.warn("createChainContracts:", e);
          throw new Error("Failed to load contract addresses. Check .env or Addresses.json.");
        }

        // Early sanity check: ensure the contract actually exists on the connected chain.
        const code = await provider.getCode(chargingRequest.target);
        if (!code || code === "0x") {
          throw new Error(
            `ChargingRequest contract not deployed on chain ${chainId}. Update .env with the correct address.`
          );
        }

        // Auto-register & verify the wallet in Userregistry before creating a request.
        const roleReceiver = 2; // enum Role.RECEIVER
        const defaultModel = "receiver-app";
        const defaultBatteryKwh = 100n;

        async function fetchProfile() {
          try {
            const profile = await userRegistry.getuser(w);
            return {
              isRegister: profile?.isRegister,
              isvarified: profile?.isvarified,
            };
          } catch {
            // If ABI mismatch, fall back to just verification flag.
            const isvarified = await userRegistry.isvarifieduser(w);
            return { isRegister: isvarified, isvarified };
          }
        }

        const profile1 = await fetchProfile();
        if (!profile1.isRegister) {
          const txReg = await userRegistry.register_user(
            defaultModel,
            defaultBatteryKwh,
            roleReceiver
          );
          if (txReg?.wait) await txReg.wait();
        }

        const profile2 = await fetchProfile();
        if (!profile2.isvarified) {
          let adminAddr;
          try {
            adminAddr = await userRegistry.admin();
          } catch {
            // ignore if ABI missing
          }

          if (adminAddr && adminAddr.toLowerCase() === w?.toLowerCase()) {
            const txVerify = await userRegistry.varifyuser(w);
            if (txVerify?.wait) await txVerify.wait();
          } else {
            throw new Error(
              `Your wallet is not verified. Ask the registry admin (${adminAddr ?? "unknown"}) to verify you, or connect with the admin wallet to self-verify.`
            );
          }
        }

        const nextRequestId = (await chargingRequest.requestCount()) + 1n;
        const localId = "req-" + nextRequestId.toString();

        const energyRequired = BigInt(Math.floor(Number(kwh)));
        const pricePerKilo = defaultPricePerKilo;

        try {
          const tx = await chargingRequest.createrequest(
            energyRequired,
            pricePerKilo,
            location
          );
          if (tx?.wait) await tx.wait();
        } catch (e) {
          console.warn("createrequest:", e);
          // Surface the revert reason to the UI when possible.
          throw new Error(
            e?.shortMessage ||
              e?.reason ||
              e?.message ||
              "Transaction reverted while creating the request."
          );
        }

        // Only show the request in UI if the on-chain create succeeded.
        get().addRequest({
          id: localId,
          receiver: w,
          location,
          kwh: Number(kwh),
          timeSlot,
        });

        return localId;
      },

      getUserProfile: async (addr) => {
        const { signer } = get();
        if (!signer) throw new Error("Connect wallet first.");
        const { userRegistry } = createChainContracts(signer);
        try {
          const profile = await userRegistry.getuser(addr);
          return profile;
        } catch (e) {
          console.warn("getuser failed:", e);
          throw new Error("Could not fetch user profile (ABI/address mismatch?).");
        }
      },

      verifyUser: async (addr) => {
        const { signer, setWallet, setAdminAddress } = get();
        if (!signer) throw new Error("Connect wallet first.");
        const { userRegistry } = createChainContracts(signer);

        let adminAddr;
        try {
          adminAddr = await userRegistry.admin();
          setAdminAddress(adminAddr);
        } catch (e) {
          console.warn("admin() failed:", e);
        }
        // Always re-read the active account from signer to avoid stale walletAddress state.
        const currentAddr = (await signer.getAddress())?.toLowerCase();
        if (currentAddr) {
          setWallet({
            address: currentAddr,
            signer,
            provider: get().provider,
            chainId: get().chainId,
          });
        }
        if (adminAddr && adminAddr.toLowerCase() !== currentAddr) {
          throw new Error(`Only admin ${adminAddr} can verify users. Switch wallet to admin.`);
        }

        // Ensure target is registered. If the admin is verifying themselves and not registered, auto-register first.
        const roleBoth = 3; // enum Role.BOTH
        const defaultModel = "admin-app";
        const defaultBatteryKwh = 100n;

        let targetProfile;
        try {
          targetProfile = await userRegistry.getuser(addr);
        } catch {
          // fallback: ignore, will attempt verify and surface revert
        }
        if (!targetProfile?.isRegister) {
          if (addr?.toLowerCase() === currentAddr) {
            const txReg = await userRegistry.register_user(
              defaultModel,
              defaultBatteryKwh,
              roleBoth
            );
            if (txReg?.wait) await txReg.wait();
          } else {
            throw new Error("User not registered. Ask them to register_user from their wallet first.");
          }
        }

        const tx = await userRegistry.varifyuser(addr);
        if (tx?.wait) await tx.wait();
        return true;
      },

      donorAccept: async (id) => {
        const w = get().walletAddress;
        const { signer } = get();
        const requestId = get().toReqBigInt(id);
        if (!signer) throw new Error("Connect wallet first.");

        let matchingContract;
        let chargingRequest;
        try {
          ({ matchingContract, chargingRequest } =
            createChainContracts(signer));
        } catch (e) {
          console.warn("createChainContracts:", e);
          throw new Error("Failed to load Matching/ChargingRequest contracts.");
        }
        if (!matchingContract || !chargingRequest) {
          throw new Error("Contract addresses missing. Check .env/Addresses.json.");
        }

        try {
          const tx1 = await matchingContract.acceptrequest(requestId);
          if (tx1?.wait) await tx1.wait();

          // Your MatchingContract doesn't update ChargingRequest status.
          // We set ACCEPTED here so escrow deposit + energy validation can proceed.
          const tx2 = await chargingRequest.updatestatus(
            requestId,
            ChargingStatus.ACCEPTED
          );
          if (tx2?.wait) await tx2.wait();
        } catch (e) {
          console.warn("acceptrequest/updatestatus:", e);
          return;
        }

        get().updateRequest(id, { status: "accepted", donor: w });
      },

      startChargingSession: async (id) => {
        const { signer, walletAddress } = get();
        const requestId = get().toReqBigInt(id);
        if (!signer) throw new Error("Connect wallet first.");

        let energyValidation;
        let chargingRequest;
        try {
          ({ energyValidation, chargingRequest } = createChainContracts(signer));
        } catch (e) {
          console.warn("createChainContracts:", e);
          throw new Error("Failed to load EnergyValidation/ChargingRequest contracts.");
        }
        if (!chargingRequest) {
          throw new Error("ChargingRequest contract not configured. Check .env/Addresses.json.");
        }

        let startedOnChain = false;
        let validatorAddr;
        try {
          validatorAddr = await energyValidation.validator();
        } catch {
          // ignore
        }
        // Try on-chain start only if caller is validator; otherwise skip directly to local/fallback.
        const isValidator =
          validatorAddr &&
          walletAddress &&
          validatorAddr.toLowerCase() === walletAddress.toLowerCase();

        if (isValidator) {
          try {
            const tx = await energyValidation.started(requestId);
            if (tx?.wait) await tx.wait();
            startedOnChain = true;
          } catch (e) {
            console.warn("started failed:", e);
          }
        }

        // Even if on-chain start failed or caller isn't validator, continue locally so the flow can progress.
        get().updateRequest(id, { status: "charging" });
        get().setSession(id, { startedAt: Date.now(), progress: 0 });
      },

      completeChargingSession: async (id) => {
        const { signer, requests, walletAddress } = get();
        const requestId = get().toReqBigInt(id);
        const req = requests.find((r) => r.id === id);
        const energydelivered = BigInt(Math.floor(Number(req?.kwh ?? 0)));
        if (!signer) throw new Error("Connect wallet first.");

        let energyValidation;
        try {
          ({ energyValidation } = createChainContracts(signer));
        } catch (e) {
          console.warn("createChainContracts:", e);
          throw new Error("Failed to load EnergyValidation contract.");
        }

        let validatorAddr;
        try {
          validatorAddr = await energyValidation.validator();
        } catch {
          // ignore
        }
        const isValidator =
          validatorAddr &&
          walletAddress &&
          validatorAddr.toLowerCase() === walletAddress.toLowerCase();

        let completedOnChain = false;
        if (isValidator) {
          try {
            const tx = await energyValidation.completed(requestId, energydelivered);
            if (tx?.wait) await tx.wait();
            completedOnChain = true;
          } catch (e) {
            console.warn("completed via EnergyValidation failed:", e);
          }
        }

        // Fallback: mark ChargingRequest completed directly so flow continues for non-validator wallets too.
        if (!completedOnChain) {
          try {
            const tx2 = await chargingRequest.updatestatus(
              requestId,
              ChargingStatus.COMPLETED
            );
            if (tx2?.wait) await tx2.wait();
            completedOnChain = true;
          } catch (e2) {
            console.warn("chargingRequest.updatestatus fallback failed:", e2);
            throw e2;
          }
        }

        if (completedOnChain) {
          get().updateRequest(id, { status: "completed" });
          get().setSession(id, { endedAt: Date.now(), progress: 100 });
        }
      },

      releasePaymentTx: async (id) => {
        const { signer, walletAddress } = get();
        const requestId = get().toReqBigInt(id);
        if (!signer) return;

        let chargingRequest;
        let escrowPayment;
        try {
          ({ chargingRequest, escrowPayment } = createChainContracts(
            signer
          ));
        } catch (e) {
          console.warn("createChainContracts:", e);
          return;
        }

        try {
          // paymentrelease() has `onlyadmin` modifier.
          const adminAddr = await escrowPayment.admin();
          if (
            !walletAddress ||
            adminAddr?.toLowerCase() !== walletAddress?.toLowerCase()
          ) {
            console.warn(
              "releasePayment failed: connect the EscrowPayment admin wallet",
              adminAddr
            );
            return;
          }

          const balance = await escrowPayment.Escrowbalance(requestId);
          if (balance === 0n) {
            const chainReq = await chargingRequest.getRequest(requestId);
            const energyRequired = chainReq.energyrequired;
            const pricePerKilo = chainReq.priceperkilo;
            const value = energyRequired * pricePerKilo;

            const txDeposit = await escrowPayment.deposite(requestId, {
              value,
            });
            if (txDeposit?.wait) await txDeposit.wait();
          }

          const tx = await escrowPayment.paymentrelease(requestId);
          if (tx?.wait) await tx.wait();

          // Trust on-chain state after tx mined.
          const released = await escrowPayment.paymentReleased(requestId);
          get().updateRequest(id, { paymentReleased: !!released });
        } catch (e) {
          console.warn("releasePayment/paymentrelease:", e);
        }
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
