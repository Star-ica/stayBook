const W = { signer: null, account: null };

async function ensureChain() {
  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: CHAIN.hex }]
    });
  } catch (e) {
    if (e.code !== 4902 && e.code !== -32603) throw e;
    await window.ethereum.request({
      method: "wallet_addEthereumChain",
      params: [{
        chainId: CHAIN.hex, chainName: CHAIN.name,
        nativeCurrency: { name: CHAIN.symbol, symbol: CHAIN.symbol, decimals: 18 },
        rpcUrls: [CHAIN.rpc], blockExplorerUrls: [CHAIN.explorer]
      }]
    });
  }
}

function updateUI() {
  document.querySelectorAll("[data-wallet]").forEach(b => {
    b.textContent = W.account.slice(0, 6) + "…" + W.account.slice(-4);
    b.classList.add("connected");
  });
}

// Silent — only works if site was previously approved by user
async function autoConnect() {
  if (!window.ethereum) return;
  try {
    // eth_accounts (no 's' at the end) never triggers a popup
    // returns [] if not approved, [address] if already approved
    const accounts = await window.ethereum.request({ method: "eth_accounts" });
    if (!accounts.length) return; // not approved yet, do nothing

    await ensureChain();
    const p = new ethers.BrowserProvider(window.ethereum);
    W.signer = await p.getSigner();
    W.account = await W.signer.getAddress();
    updateUI();
  } catch (e) {
    console.warn("Auto-connect failed:", e.message);
  }
}

// Manual — triggers MetaMask popup (only on button click)
async function connect() {
  if (!window.ethereum) { alert("Install MetaMask or another EVM wallet."); return; }
  try {
    const p = new ethers.BrowserProvider(window.ethereum);
    await p.send("eth_requestAccounts", []); // popup here
    await ensureChain();
    W.signer = await p.getSigner();
    W.account = await W.signer.getAddress();
    updateUI();
  } catch (e) {
    if (e.code !== 4001) alert(e.message);
  }
}

function getContract(sigs) {
  const a = CONFIG.address;
  if (!ethers.isAddress(a) || /^0x0+$/.test(a)) throw new Error("Set contract address in js/config.js");
  if (!W.signer) throw new Error("Connect your wallet first.");
  return new ethers.Contract(a, sigs, W.signer);
}

const fmt = v => JSON.stringify(v, (k, x) => typeof x === "bigint" ? x.toString() : x, 2);

// Auto-connect silently on page load
window.addEventListener("load", autoConnect);

// Manual connect on button click
document.addEventListener("click", e => { if (e.target.matches("[data-wallet]")) connect(); });

// Keep in sync if user switches account or chain in MetaMask
window.ethereum?.on("accountsChanged", autoConnect);
window.ethereum?.on("chainChanged", () => window.location.reload());