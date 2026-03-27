// Default placeholders (will be overwritten after fetch)
window.CONTRACT_ADDRESSES = {
  Userregistry: "",
  ChargingRequest: "",
  MatchingContract: "",
  EnergyValidation: "",
  PlatformFee: "",
  EscrowPayment: "",
  GovernanceAdmin: "",
};

// Sepolia chain id
window.TARGET_CHAIN_ID_HEX = "0xaa36a7";
window.TARGET_CHAIN_ID_DEC = 11155111n;

(async () => {
  try {
    // When served from /frontend via http-server, Addresses.json is in the same folder
    const res = await fetch("./Addresses.json");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    window.CONTRACT_ADDRESSES = {
      Userregistry: data.UserRegistry || data.Userregistry || "",
      ChargingRequest: data.ChargingRequest || "",
      MatchingContract: data.MatchingContract || "",
      EnergyValidation: data.EnergyValidation || "",
      PlatformFee: data.PlatformFee || "",
      EscrowPayment: data.EscrowPayment || "",
      GovernanceAdmin: data.GovernanceAdmin || "",
    };
    console.log("Loaded CONTRACT_ADDRESSES from Addresses.json", window.CONTRACT_ADDRESSES);
  } catch (err) {
    console.error("Failed to load Addresses.json; check that frontend/Addresses.json is served.", err);
  }
})();
