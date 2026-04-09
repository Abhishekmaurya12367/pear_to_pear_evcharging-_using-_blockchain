// Default placeholders (will be overwritten after fetch)
window.CONTRACT_ADDRESSES = {
  Userregistry: "",
  EVChargingEscrow: "",
};

// Sepolia chain id
window.TARGET_CHAIN_ID_HEX = "0xaa36a7";
window.TARGET_CHAIN_ID_DEC = 11155111n;

// Hardhat artifact is { abi: [...] }; some files are a raw array — ethers needs the array
window.normalizeAbi = function normalizeAbi(json) {
  if (Array.isArray(json)) return json;
  if (json && Array.isArray(json.abi)) return json.abi;
  throw new Error("ABI JSON must be an array or { abi: [...] }");
};

(async () => {
  try {
    // When served from /frontend via http-server, Addresses.json is in the same folder
    const res = await fetch("./Addresses.json");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    window.CONTRACT_ADDRESSES = {
      Userregistry: data.UserRegistry || data.Userregistry || "",
      EVChargingEscrow: data.EVChargingEscrow || "",
    };
    console.log("Loaded CONTRACT_ADDRESSES from Addresses.json", window.CONTRACT_ADDRESSES);
  } catch (err) {
    console.error("Failed to load Addresses.json; check that frontend/Addresses.json is served.", err);
  }
})();
