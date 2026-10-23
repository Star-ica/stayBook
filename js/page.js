const humanize = n => n.replace(/([A-Z])/g, " $1").replace(/^./, c => c.toUpperCase());
const kind = document.body.dataset.kind;
const list = document.getElementById("fn-list");

CONFIG.fns.forEach(sig => {
  const f = ethers.Fragment.from(sig);
  const isView = f.stateMutability === "view" || f.stateMutability === "pure";
  if (isView !== (kind === "read")) return;

  const card = document.createElement("div");
  card.className = "fn-card";

  let badge = isView
    ? '<span class="fn-badge read">VIEW</span>'
    : f.payable
      ? '<span class="fn-badge payable">PAYABLE</span>'
      : '<span class="fn-badge write">WRITE</span>';

  let inputs = f.inputs.map((p, i) => `
    <div class="fn-label">${humanize(p.name || "arg" + i)} <span style="opacity:.5;font-weight:400">(${p.type})</span></div>
    <input class="fn-input" data-i="${i}" placeholder="${p.type}" />
  `).join("");

  if (f.payable) {
    inputs += `<div class="fn-label">Value (ETH)</div><input class="fn-input" data-v placeholder="0.0" />`;
  }

  card.innerHTML = `
    <h3>${humanize(f.name)} ${badge}</h3>
    ${inputs}
    <button class="fn-btn">${isView ? "Query" : "Send Transaction"}</button>
    <pre class="fn-out"></pre>
  `;

  const out = card.querySelector(".fn-out");
  card.querySelector(".fn-btn").addEventListener("click", async () => {
    out.style.display = "block";
    out.textContent = "⏳ Working…";
    try {
      const c = getContract(CONFIG.fns);
      const args = [...card.querySelectorAll("[data-i]")].map(x => x.value.trim());
      if (isView) {
        const result = await c[f.name](...args);
        out.textContent = fmt(result);
      } else {
        const opts = {};
        if (f.payable) {
          const val = card.querySelector("[data-v]").value || "0";
          opts.value = ethers.parseEther(val);
        }
        const tx = await c[f.name](...args, opts);
        out.textContent = "⏳ Pending…\n" + CHAIN.explorer + "/tx/" + tx.hash;
        await tx.wait();
        out.textContent = "✅ Confirmed!\n" + CHAIN.explorer + "/tx/" + tx.hash;
      }
    } catch (e) {
      out.textContent = "❌ Error: " + (e.shortMessage || e.message);
    }
  });

  list.appendChild(card);
});
