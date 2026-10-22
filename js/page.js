const label=n=>n.replace(/([A-Z])/g," $1").replace(/^./,c=>c.toUpperCase());
const kind=document.body.dataset.kind;
CONFIG.fns.forEach(sig=>{
  const f=ethers.Fragment.from(sig),isRead=f.stateMutability==="view";
  if(isRead!==(kind==="read"))return;
  const el=document.createElement("div");el.className="card fn";
  el.innerHTML="<h3>"+label(f.name)+"</h3>"+f.inputs.map((p,j)=>"<label>"+label(p.name||"arg"+j)+" ("+p.type+")</label><input data-i='"+j+"'>").join("")+(f.payable?"<label>Value (ETH)</label><input data-v value='0'>":"")+"<button class='btn'>"+(isRead?"Read":"Send")+"</button><pre class='out'></pre>";
  const out=el.querySelector("pre");
  el.querySelector("button").onclick=async()=>{
    out.style.display="block";out.textContent="Working…";
    try{
      const c=getContract(CONFIG.fns),args=[...el.querySelectorAll("[data-i]")].map(x=>x.value.trim());
      if(isRead){out.textContent=fmt(await c[f.name](...args))}
      else{const o=f.payable?{value:ethers.parseEther(el.querySelector("[data-v]").value||"0")}:{};const tx=await c[f.name](...args,o);out.textContent="Pending: "+CHAIN.explorer+"/tx/"+tx.hash;await tx.wait();out.textContent="Confirmed ✓\n"+CHAIN.explorer+"/tx/"+tx.hash}
    }catch(e){out.textContent="Error: "+(e.shortMessage||e.message)}
  };
  document.getElementById("list").appendChild(el);
});