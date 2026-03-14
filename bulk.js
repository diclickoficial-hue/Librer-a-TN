(function(){

"use strict";

/* ===============================
   BULK TN LIB
   versión: 1.0.0
================================ */

if(window.BulkTN) return;

const BulkTN = {

config:{
  maxNoStock:999,
  delayAdd:450,
  delaySelect:120,
  debug:false
},

log(...a){
  if(this.config.debug) console.log("[BulkTN]",...a);
},

sleep(ms){
  return new Promise(r=>setTimeout(r,ms));
},

norm(v){
  return (v===null || v===undefined) ? "" : String(v).trim();
},

esc(s){
  return String(s)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;");
},

mount(){

  const container = document.querySelector(".js-product-container");
  const form = document.querySelector('form[action="/comprar/"]');

  if(!container || !form){
    this.log("no product");
    return;
  }

  const variants = JSON.parse(container.dataset.variants || "[]")
    .filter(v=>v.is_visible);

  if(!variants.length){
    this.log("no variants");
    return;
  }

  const map = new Map();

  const key = v=>{
    return [
      this.norm(v.option0),
      this.norm(v.option1),
      this.norm(v.option2)
    ].filter(Boolean).join("||");
  };

  variants.forEach(v=>map.set(key(v), v));

  const dim0 = [...new Set(
    variants.map(v=>this.norm(v.option0)).filter(Boolean)
  )];

  const dim1 = [...new Set(
    variants.map(v=>this.norm(v.option1)).filter(Boolean)
  )];

  const wrap = document.createElement("div");
  wrap.className = "bulk-tn-wrap";

  /* ===== inject css ===== */

  if(!document.getElementById("bulk-tn-css")){
    const css = document.createElement("style");
    css.id="bulk-tn-css";
    css.innerHTML = `
    .bulk-tn-wrap{
      margin-top:20px;
      border:1px solid #eee;
      border-radius:14px;
      padding:16px;
      background:#fff;
      font-family:Arial;
    }
    .bulk-tn-head{
      display:flex;
      justify-content:space-between;
      margin-bottom:12px;
      flex-wrap:wrap;
    }
    .bulk-tn-pill{
      background:#f5f5f5;
      border:1px solid #eee;
      padding:5px 10px;
      border-radius:999px;
      font-size:12px;
    }
    .bulk-tn-table{
      width:100%;
      border-collapse:collapse;
      font-size:13px;
      text-align:center;
    }
    .bulk-tn-table td,
    .bulk-tn-table th{
      border:1px solid #eee;
      padding:6px;
    }
    .bulk-tn-table th:first-child,
    .bulk-tn-table td:first-child{
      background:#fafafa;
      text-align:left;
      font-weight:600;
    }
    .bulk-tn-qty{
      display:flex;
      justify-content:center;
      gap:4px;
    }
    .bulk-tn-qty button{
      width:26px;
      height:26px;
      border:1px solid #ddd;
      background:#fff;
      border-radius:6px;
      cursor:pointer;
    }
    .bulk-tn-qty input{
      width:52px;
      border:1px solid #ddd;
      border-radius:6px;
      text-align:center;
    }
    .bulk-tn-buy{
      width:100%;
      margin-top:14px;
      padding:12px;
      background:#000;
      color:#fff;
      border:0;
      border-radius:10px;
      font-weight:700;
      cursor:pointer;
    }
    .bulk-tn-buy:disabled{
      opacity:.5;
      cursor:not-allowed;
    }
    `;
    document.head.appendChild(css);
  }

  /* ===== build ui ===== */

  wrap.innerHTML = `
    <div class="bulk-tn-head">
      <div style="font-weight:800">Pedido Mayorista</div>
      <div class="bulk-tn-pill">
        Unidades:
        <strong id="bulk-tn-total">0</strong>
      </div>
    </div>
    <div id="bulk-tn-grid"></div>
    <button id="bulk-tn-buy" class="bulk-tn-buy" disabled>
      Agregar seleccionadas
    </button>
    <div id="bulk-tn-msg" style="margin-top:8px;font-size:13px"></div>
  `;

  const grid = wrap.querySelector("#bulk-tn-grid");

  const stock = v=>{
    if(v.stock===null || v.stock==="") return null;
    const n = parseInt(v.stock,10);
    return isNaN(n)?null:n;
  };

  const max = v=>{
    const s = stock(v);
    return s===null ? this.config.maxNoStock : s;
  };

  const avail = v=>{
    const s = stock(v);
    if(s===null) return v.available;
    return v.available && s>0;
  };

  const cell = v=>{
    const m = max(v);
    const dis = avail(v) ? "" : "disabled";

    return `
      <div class="bulk-tn-qty">
        <button class="bulk-tn-down" ${dis}>-</button>
        <input type="number"
          value="0"
          min="0"
          max="${m}"
          data-key="${key(v)}"
          ${dis}>
        <button class="bulk-tn-up" ${dis}>+</button>
      </div>
    `;
  };

  if(dim1.length){

    const table = document.createElement("table");
    table.className="bulk-tn-table";

    const head =
      `<tr><th></th>${
        dim1.map(x=>`<th>${this.esc(x)}</th>`).join("")
      }</tr>`;

    let body="";

    dim0.forEach(r=>{
      body += `<tr><td>${this.esc(r)}</td>`;
      dim1.forEach(c=>{
        const v = map.get(`${r}||${c}`);
        body += `<td>${v ? cell(v) : "-"}</td>`;
      });
      body += "</tr>";
    });

    table.innerHTML = `<thead>${head}</thead><tbody>${body}</tbody>`;
    grid.appendChild(table);

  }else{

    dim0.forEach(a=>{
      const v = map.get(a);
      if(!v) return;

      const row = document.createElement("div");
      row.style.marginBottom="8px";
      row.innerHTML = `<strong>${this.esc(a)}</strong> ${cell(v)}`;
      grid.appendChild(row);
    });

  }

  /* ===== mount ===== */

  const target =
    document.querySelector(".js-product-variants")
    || form;

  target.appendChild(wrap);

  /* ===== totals ===== */

  const totals = ()=>{
    const inputs = [...wrap.querySelectorAll("input")];
    let t=0;
    inputs.forEach(i=>t += parseInt(i.value)||0);

    wrap.querySelector("#bulk-tn-total").textContent = t;
    wrap.querySelector("#bulk-tn-buy").disabled = t<=0;
  };

  wrap.addEventListener("click", e=>{

    const up = e.target.closest(".bulk-tn-up");
    const down = e.target.closest(".bulk-tn-down");

    if(!up && !down) return;

    const input = e.target.parentElement.querySelector("input");

    let v = parseInt(input.value)||0;
    const m = parseInt(input.max);

    if(up) v = Math.min(m, v+1);
    if(down) v = Math.max(0, v-1);

    input.value = v;
    totals();

  });

  wrap.addEventListener("input", totals);

  /* ===== buy ===== */

  wrap.querySelector("#bulk-tn-buy").onclick = async ()=>{

    const btn = wrap.querySelector("#bulk-tn-buy");
    const msg = wrap.querySelector("#bulk-tn-msg");

    btn.disabled=true;
    msg.innerHTML="Procesando...";

    const items = [...wrap.querySelectorAll("input")]
      .map(i=>({
        key:i.dataset.key,
        qty:parseInt(i.value)||0
      }))
      .filter(x=>x.qty>0);

    for(const it of items){

      const v = map.get(it.key);

      if(v.option0) clickVar(0, v.option0);
      if(v.option1) clickVar(1, v.option1);
      if(v.option2) clickVar(2, v.option2);

      await this.sleep(this.config.delaySelect);

      const q = document.querySelector(".js-quantity-input");
      const add = document.querySelector(".js-addtocart");

      q.value = it.qty;
      add.click();

      await this.sleep(this.config.delayAdd);
    }

    msg.innerHTML="✔ agregado correctamente";
  };

  function clickVar(idx,val){
    const g = document.querySelector(
      `.js-product-variants-group[data-variation-id="${idx}"]`
    );
    if(!g) return;
    const b = g.querySelector(`[data-option="${val}"]`);
    if(b) b.click();
  }

},

auto(){
  document.addEventListener("DOMContentLoaded", ()=>{
    this.mount();
  });
}

};

window.BulkTN = BulkTN;

})();
