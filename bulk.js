<div id="bulk-inline" class="bulk-inline"></div>

<script>
(function(){

"use strict";

/* =========================
   CONFIG
========================= */

const MAX_WHEN_NO_STOCK = 999;
const BULK_DELAY = 350;

/* =========================
   CORE
========================= */

function initBulk(target){

   const root = document.querySelector(target);
   if(!root) return;

   if(root.dataset.bulkMounted==="1") return;
   root.dataset.bulkMounted="1";

   const container = document.querySelector(".js-product-container");
   const form = document.querySelector('form[action="/comprar/"]');

   if(!container || !form) return;

   const variants = JSON.parse(container.dataset.variants || "[]")
      .filter(v=>v.is_visible);

   if(!variants.length) return;

   function norm(v){
      return (v===null || v===undefined) ? "" : String(v).trim();
   }

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
               data-variant="${v.id}"
               ${dis}>
            <button class="bulk-up" ${dis}>+</button>
         </div>
      `;
   }

   /* =========================
      UI BUILD
   ========================= */

   root.innerHTML = `
      <div class="bulk-head">
         <div class="bulk-title">Pedido Mayorista</div>
         <div class="bulk-summary">
            <span class="bulk-pill">
               Unidades:
               <strong class="bulk-total">0</strong>
            </span>
         </div>
      </div>

      <div class="bulk-grid"></div>

      <div class="bulk-actions">
         <button class="bulk-buy" disabled>
            Agregar seleccionadas
         </button>
         <div class="bulk-msg"></div>
      </div>
   `;

   const grid = root.querySelector(".bulk-grid");

   dim0.forEach(a=>{

      const v = map.get(a);
      if(!v) return;

      const row = document.createElement("div");
      row.className="bulk-row-1d";

      row.innerHTML = `
         <strong>${a}</strong>
         ${cell(v)}
      `;

      grid.appendChild(row);

   });

   /* =========================
      EVENTS
   ========================= */

   function totals(){

      const inputs = root.querySelectorAll("input");
      let t=0;

      inputs.forEach(i=> t += parseInt(i.value)||0 );

      root.querySelector(".bulk-total").textContent = t;
      root.querySelector(".bulk-buy").disabled = t<=0;

   }

   root.addEventListener("click", e=>{

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

   root.addEventListener("input", totals);

   /* =========================
      TN AJAX ENGINE REAL
   ========================= */

   async function addAjax(variantId, qty){

      const fd = new FormData(form);

      fd.set("variant_id", variantId);
      fd.set("quantity", qty);

      const body = new URLSearchParams(fd);

      const res = await fetch("/comprar/",{
         method:"POST",
         headers:{
            "Content-Type":"application/x-www-form-urlencoded",
            "X-Requested-With":"XMLHttpRequest"
         },
         body: body.toString(),
         credentials:"same-origin"
      });

      if(!res.ok){
         throw "TN cart error";
      }

   }

   /* =========================
      BUY
   ========================= */

   root.querySelector(".bulk-buy").onclick = async function(){

      const btn = this;
      const msg = root.querySelector(".bulk-msg");

      btn.disabled=true;
      msg.innerHTML="Agregando...";

      try{

         const items = [...root.querySelectorAll("input")]
            .map(i=>({
               variant:i.dataset.variant,
               qty:parseInt(i.value)||0
            }))
            .filter(x=>x.qty>0);

         for(const it of items){

            await addAjax(it.variant, it.qty);
            await new Promise(r=>setTimeout(r, BULK_DELAY));

         }

         msg.innerHTML="✔ agregado correctamente";

         document.dispatchEvent(new CustomEvent("cart:refresh"));
         window.dispatchEvent(new Event("cart:update"));

      }
      catch(e){

         console.error(e);
         msg.innerHTML="Error carrito";
         btn.disabled=false;

      }

   };

   totals();

}

/* =========================
   INIT GLOBAL
========================= */

window.TNBulk = {
   init:initBulk
};

document.addEventListener("DOMContentLoaded", function(){

   TNBulk.init("#bulk-inline");

});

})();
</script>
