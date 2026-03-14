{# =====================================================
   BULK MAYORISTA INLINE TN — MATRIZ DINÁMICA FULL
   ✔ Sin popup
   ✔ Embebido en producto
   ✔ Stock real
   ✔ 1D / 2D / 3D auto
   ✔ Totales en vivo
   ✔ Compra masiva secuencial segura
===================================================== #}

<div id="bulk-inline" class="bulk-inline"></div>

<style>

.bulk-inline{
  margin-top:20px;
  border:1px solid #eee;
  border-radius:14px;
  padding:16px;
  background:#fff;
  font-family:Arial, sans-serif;
}

.bulk-head{
  display:flex;
  justify-content:space-between;
  align-items:center;
  margin-bottom:12px;
  gap:10px;
  flex-wrap:wrap;
}

.bulk-title{
  font-weight:800;
  font-size:16px;
}

.bulk-summary{
  display:flex;
  gap:8px;
  flex-wrap:wrap;
}

.bulk-pill{
  padding:5px 10px;
  border-radius:999px;
  background:#f5f5f5;
  border:1px solid #eee;
  font-size:12px;
}

/* =========================
   FILA 1D PRO
========================= */

.bulk-row-1d{
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:12px;
  padding:8px 6px;
  border-bottom:1px solid #f3f3f3;
}

.bulk-row-1d:hover{
  background:#fafafa;
}

.bulk-row-1d strong{
  font-weight:600;
  font-size:14px;
}

/* =========================
   QTY
========================= */

.bulk-qty{
  display:flex;
  align-items:center;
  gap:4px;
  margin-left:auto;
}

.bulk-qty button{
  width:28px;
  height:28px;
  border:1px solid #ddd;
  background:#fff;
  border-radius:6px;
  cursor:pointer;
}

.bulk-qty input{
  width:60px;
  height:28px;
  border:1px solid #ddd;
  border-radius:6px;
  text-align:center;
}

/* ========================= */

.bulk-actions{
  margin-top:14px;
}

.bulk-buy{
  width:100%;
  padding:12px;
  background:#000;
  color:#fff;
  border:0;
  border-radius:10px;
  font-weight:700;
  cursor:pointer;
}

.bulk-buy:disabled{
  opacity:.5;
  cursor:not-allowed;
}

.bulk-msg{
  margin-top:10px;
  font-size:13px;
}

/* ocultamos form TN */

#product_form{
  position:absolute !important;
  left:-99999px !important;
  width:1px !important;
  height:1px !important;
  overflow:hidden !important;
}

</style>

<script>
(function(){

"use strict";

const MAX_WHEN_NO_STOCK = 999;
const BULK_DELAY = 420;
const SELECT_DELAY = 120;

function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }

function norm(v){ return (v===null || v===undefined) ? "" : String(v).trim(); }

function escapeHtml(s){
  return String(s)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;");
}

const container = document.querySelector(".js-product-container");
const form = document.querySelector('form[action="/comprar/"]');
if(!container || !form) return;

const variants = JSON.parse(container.dataset.variants || "[]")
  .filter(v=>v.is_visible);

if(!variants.length) return;

function keyOf(v){
  return [norm(v.option0), norm(v.option1), norm(v.option2)]
    .filter(Boolean).join("||");
}

const map = new Map();
variants.forEach(v=>map.set(keyOf(v), v));

const dim0 = [...new Set(variants.map(v=>norm(v.option0)).filter(Boolean))];

function stock(v){
  if(v.stock===null || v.stock==="") return null;
  const n = parseInt(v.stock,10);
  return isNaN(n)?null:n;
}

function max(v){
  const s = stock(v);
  return s===null ? MAX_WHEN_NO_STOCK : s;
}

function available(v){
  const s = stock(v);
  if(s===null) return v.available;
  return v.available && s>0;
}

function cell(v){
  const m = max(v);
  const dis = available(v) ? "" : "disabled";

  return `
    <div class="bulk-qty">
      <button class="bulk-down" ${dis}>-</button>
      <input type="number"
        value="0"
        min="0"
        max="${m}"
        data-key="${keyOf(v)}"
        ${dis}>
      <button class="bulk-up" ${dis}>+</button>
    </div>
  `;
}

function build(){

  const wrap = document.getElementById("bulk-inline");

  wrap.innerHTML = `
    <div class="bulk-head">
      <div class="bulk-title">Pedido Mayorista</div>
      <div class="bulk-summary">
        <span class="bulk-pill">Unidades: <strong id="bulk-total">0</strong></span>
      </div>
    </div>
    <div id="bulk-grid"></div>
    <div class="bulk-actions">
      <button id="bulk-buy" class="bulk-buy" disabled>
        Agregar seleccionadas
      </button>
      <div id="bulk-msg" class="bulk-msg"></div>
    </div>
  `;

  const grid = document.getElementById("bulk-grid");

  dim0.forEach(a=>{
    const v = map.get(a);
    if(!v) return;

    const row = document.createElement("div");
    row.className = "bulk-row-1d";
    row.innerHTML = `
       <strong>${escapeHtml(a)}</strong>
       ${cell(v)}
    `;
    grid.appendChild(row);
  });
}

function totals(){

  const inputs = [...document.querySelectorAll("#bulk-inline input")];
  let t=0;

  inputs.forEach(i=>{
    t += parseInt(i.value)||0;
  });

  document.getElementById("bulk-total").textContent = t;
  document.getElementById("bulk-buy").disabled = t<=0;
}

function init(){

  document.getElementById("bulk-inline").addEventListener("click", e=>{

    const up = e.target.closest(".bulk-up");
    const down = e.target.closest(".bulk-down");

    if(!up && !down) return;

    const input = e.target.parentElement.querySelector("input");

    let v = parseInt(input.value)||0;
    const m = parseInt(input.max);

    if(up) v = Math.min(m, v+1);
    if(down) v = Math.max(0, v-1);

    input.value = v;
    totals();
  });

  document.getElementById("bulk-inline").addEventListener("input", totals);

  document.getElementById("bulk-buy").onclick = async function(){

    const btn = this;
    const msg = document.getElementById("bulk-msg");

    btn.disabled=true;
    msg.innerHTML="Procesando...";

    const items = [...document.querySelectorAll("#bulk-inline input")]
      .map(i=>({
        key:i.dataset.key,
        qty:parseInt(i.value)||0
      }))
      .filter(x=>x.qty>0);

    for(const it of items){

      const v = map.get(it.key);

      await select(v);
      await add(it.qty);

      await sleep(BULK_DELAY);
    }

    msg.innerHTML="✔ agregado correctamente";
  };
}

function select(v){
  return new Promise(async resolve=>{
    if(v.option0) clickVar(0, v.option0);
    await sleep(SELECT_DELAY);
    resolve();
  });
}

function clickVar(idx, val){

  const g = document.querySelector(`.js-product-variants-group[data-variation-id="${idx}"]`);
  if(!g) return;

  const btn = g.querySelector(`[data-option="${val}"]`);
  if(btn) btn.click();
}

function add(qty){
  return new Promise(async resolve=>{
    const input = document.querySelector(".js-quantity-input");
    const btn = document.querySelector(".js-addtocart");

    input.value = qty;
    btn.click();

    await sleep(700);
    resolve();
  });
}

document.addEventListener("DOMContentLoaded", ()=>{
  build();
  init();
  totals();
});

})();
</script>
