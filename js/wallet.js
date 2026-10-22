const W={signer:null,account:null};
async function ensureChain(){
  try{await window.ethereum.request({method:"wallet_switchEthereumChain",params:[{chainId:CHAIN.hex}]})}
  catch(e){
    if(e.code!==4902&&e.code!==-32603)throw e;
    await window.ethereum.request({method:"wallet_addEthereumChain",params:[{chainId:CHAIN.hex,chainName:CHAIN.name,nativeCurrency:{name:"BOT",symbol:CHAIN.symbol,decimals:18},rpcUrls:[CHAIN.rpc],blockExplorerUrls:[CHAIN.explorer]}]});
  }
}
async function connect(){
  if(!window.ethereum){alert("Install MetaMask or another EVM wallet.");return}
  try{
    await ensureChain();
    const p=new ethers.BrowserProvider(window.ethereum);
    await p.send("eth_requestAccounts",[]);
    W.signer=await p.getSigner();W.account=await W.signer.getAddress();
    document.querySelectorAll("[data-wallet]").forEach(b=>b.textContent=W.account.slice(0,6)+"…"+W.account.slice(-4));
  }catch(e){alert(e.message)}
}
function getContract(sigs){
  const a=CONFIG.address;
  if(!ethers.isAddress(a)||/^0x0+$/.test(a))throw new Error("Set the deployed contract address in js/config.js");
  if(!W.signer)throw new Error("Connect your wallet first.");
  return new ethers.Contract(a,sigs,W.signer);
}
const fmt=v=>JSON.stringify(v,(k,x)=>typeof x==="bigint"?x.toString():x,2);
document.addEventListener("click",e=>{if(e.target.matches("[data-wallet]"))connect()});
