// ============================================================
// app.js — loadData, Dashboard, Modal, Insights, Rupturas, Projeções
// Depende de: config.js (carregado antes)
// ============================================================

function fmt(v){return'R$ '+v.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});}
function fmtN(v){return v.toLocaleString('pt-BR');}

function compareVal(a,b,col,dir){
  let va=a[col],vb=b[col];
  if(va===undefined||va===null)va=col==='receita'||col==='qtd'||col==='vd'||col==='cobertura'||col==='estoque'||col==='ticket'?-Infinity:'';
  if(vb===undefined||vb===null)vb=col==='receita'||col==='qtd'||col==='vd'||col==='cobertura'||col==='estoque'||col==='ticket'?-Infinity:'';
  const pA=parseFloat(String(va).replace('%','').replace('+',''));
  const pB=parseFloat(String(vb).replace('%','').replace('+',''));
  if(!isNaN(pA)&&!isNaN(pB))return(pA-pB)*dir;
  return String(va).localeCompare(String(vb),'pt-BR')*dir;
}

function statusBadge(p){
  if((p.estoque||0)===0)return'<span class="badge-ruptura">⚠ Ruptura</span>';
  if((p.cobertura||0)<15)return'<span class="badge-risco">⚠ Risco</span>';
  return'<span class="badge-ok">✓ OK</span>';
}

function showPage(name,el){
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  const pg=document.getElementById('page-'+name);
  if(pg)pg.classList.add('active');
  document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
  if(el)el.classList.add('active');
}

function toggleSidebar(){
  document.getElementById('sidebar').classList.toggle('collapsed');
  document.getElementById('main').classList.toggle('collapsed');
}

// ---- FETCH API ----
async function loadData(){
  const msg=document.getElementById('loadingMsg');
  try{
    msg.textContent='Conectando ao Google Sheets...';
    const res=await fetch(API_URL);
    if(!res.ok)throw new Error('HTTP '+res.status);
    msg.textContent='Processando dados...';
    const json=await res.json();
    if(json.erro)throw new Error(json.erro);

    DATA          = json;
    ESTOQUE_DATA  = json.estoque     || [];
    KPIS_ESTOQUE  = json.kpisEstoque || {};
    RUPTURAS_DATA = json.ruptura     || [];
    INSIGHTS_DATA = json.insights    || { alta:[], queda:[], parado:[], oportunidade:[] };
    PROJ_DATA     = json.projecoes   || json.proj || [];

    const anos  =[...new Set(Object.keys(DATA.vendasPorMes||{}).map(k=>k.split('-')[0]))].sort();
    const meses =[...new Set(Object.keys(DATA.vendasPorMes||{}).map(k=>k.split('-')[1]))].sort();
    const selAno=document.getElementById('anoFilter');
    const selMes=document.getElementById('mesFilter');
    if(selAno)anos.forEach(a=>{const o=document.createElement('option');o.value=a;o.textContent=a;selAno.appendChild(o);});
    if(selMes)meses.forEach(m=>{const o=document.createElement('option');o.value=m;o.textContent=m;selMes.appendChild(o);});

    document.getElementById('loadingOverlay').style.display='none';
    initDashboard();
    initVendas();
    renderInsights();
    if(RUPTURAS_DATA.length)renderRupturas(RUPTURAS_DATA);

  }catch(err){
    msg.style.color='#f87171';
    msg.innerHTML='⚠ Erro ao carregar dados.<br><small>'+err.message+'</small><br><br>'
      +'<button onclick="loadData()" style="background:#6366f1;color:#fff;border:none;padding:8px 18px;border-radius:8px;cursor:pointer;font-size:13px;">Tentar novamente</button>';
  }
}

// ---- KPIs DASHBOARD ----
function initDashboard(){
  document.getElementById('kpiReceita').textContent   =fmt(DATA.kpis.receita);
  document.getElementById('kpiPedidos').textContent   =fmtN(DATA.kpis.pedidos);
  document.getElementById('kpiTicket').textContent    =fmt(DATA.kpis.ticket);
  document.getElementById('kpiSkus').textContent      =fmtN(DATA.kpis.skus);

  const setBadge=(id,val,suffix)=>{
    const el=document.getElementById(id);
    if(!el||val===undefined||val===null)return;
    const n=parseFloat(val);
    el.textContent=(n>=0?'+':'')+n.toFixed(1)+(suffix||'%');
    el.className='kpi-badge '+(n>=0?'up':'down');
  };
  setBadge('kpiReceitaBadge', DATA.kpis.receitaVar);
  setBadge('kpiPedidosBadge', DATA.kpis.pedidosVar);
  setBadge('kpiTicketBadge',  DATA.kpis.ticketVar);
  setBadge('kpiSkusBadge',    DATA.kpis.skusVar);

  const months=DATA.monthly.map(m=>{
    const[y,mo]=m.mes.split('-');
    const ns=['','Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
    return ns[parseInt(mo)]+'/'+y.slice(2);
  });
  if(DATA.monthly.length){
    const first=DATA.monthly[0].mes,last=DATA.monthly[DATA.monthly.length-1].mes;
    const fmtM=m=>{const[y,mo]=m.split('-');const ns=['','Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];return ns[parseInt(mo)]+'/'+y;};
    document.getElementById('dashSubtitle').textContent=fmtM(first)+' – '+fmtM(last);
  }

  // ---- CHARTS ----
  const receipts=DATA.monthly.map(m=>m.receita);
  const chartCfg=(type)=>({
    type,
    data:{labels:months,datasets:[{
      label:'Receita',data:receipts,
      borderColor:'#6366f1',backgroundColor:type==='line'?'rgba(99,102,241,0.08)':'rgba(99,102,241,0.6)',
      borderWidth:2.5,pointRadius:4,pointBackgroundColor:'#6366f1',fill:type==='line',tension:0.35
    }]},
    options:{responsive:true,plugins:{legend:{display:false}},
      scales:{
        x:{ticks:{color:'#4a5568'},grid:{color:'#1a2030'}},
        y:{ticks:{color:'#4a5568',callback:v=>'R$'+Math.round(v/1000)+'k'},grid:{color:'#1a2030'}}
      }}
  });

  let mainChart=null;
  const buildMain=(type)=>{
    if(mainChart)mainChart.destroy();
    mainChart=new Chart(document.getElementById('mainChart').getContext('2d'),chartCfg(type));
  };
  buildMain('line');
  window.switchChart=(type)=>{
    buildMain(type);
    document.querySelectorAll('.chart-type-btn').forEach(b=>b.classList.remove('active'));
    document.getElementById(type==='line'?'btnLine':'btnBar').classList.add('active');
  };

  const recA=DATA.produtos.filter(p=>p.curva==='A').reduce((s,p)=>s+(p.receita||0),0);
  const recB=DATA.produtos.filter(p=>p.curva==='B').reduce((s,p)=>s+(p.receita||0),0);
  const recC=DATA.produtos.filter(p=>p.curva==='C').reduce((s,p)=>s+(p.receita||0),0);
  new Chart(document.getElementById('abcChart').getContext('2d'),{
    type:'doughnut',
    data:{labels:['Curva A','Curva B','Curva C'],datasets:[{data:[recA,recB,recC],backgroundColor:['#34d399','#84cc16','#4a5568'],borderWidth:0}]},
    options:{responsive:true,cutout:'62%',plugins:{legend:{position:'bottom',labels:{color:'#8892a4',font:{size:11},padding:10}}}}
  });

  // ---- PRODUTOS TABLE ----
  let allProds=DATA.produtos.slice();
  let current=allProds.slice();
  let sortCol='receita',sortDir=-1,curPage=0;
  const PS=100;

  const buildPag=(id,total,pg,onGo)=>{
    const el=document.getElementById(id);
    if(!el)return;
    const totalPages=Math.ceil(total/PS);
    if(totalPages<=1){el.innerHTML='';return;}
    const s=pg*PS+1,e=Math.min((pg+1)*PS,total);
    let pages=[...Array(totalPages).keys()];
    if(totalPages>7){let st=Math.max(0,pg-3);let en=Math.min(totalPages,st+7);if(en-st<7)st=Math.max(0,en-7);pages=pages.slice(st,en);}
    el.innerHTML=`<span style="font-size:12px;color:#4a5568;margin-right:6px;">${s}–${e} de ${total}</span>`
      +`<button class="page-btn${pg===0?' disabled':''}" onclick="(${onGo})(${pg-1})" ${pg===0?'disabled':''}>&#8249;</button>`
      +pages.map(p2=>`<button class="page-btn${p2===pg?' active':''}" onclick="(${onGo})(${p2})">${p2+1}</button>`).join('')
      +`<button class="page-btn${pg===totalPages-1?' disabled':''}" onclick="(${onGo})(${pg+1})" ${pg===totalPages-1?'disabled':''}>&#8250;</button>`;
  };

  const render=(pg)=>{
    curPage=pg||0;
    const slice=current.slice(curPage*PS,(curPage+1)*PS);
    const curvaSpan=c=>c==='A'?`<span class="kpi-badge" style="font-size:10px;background:#0d2618;color:#34d399;">A</span>`
      :c==='B'?`<span class="kpi-badge" style="font-size:10px;background:#1a2f0d;color:#84cc16;">B</span>`
      :`<span class="kpi-badge" style="font-size:10px;background:#1e2535;color:#8892a4;">C</span>`;
    document.getElementById('prodBody').innerHTML=slice.map((p,i)=>`
      <tr onclick="openModal('${p.SKU}')">
        <td class="rank">${curPage*PS+i+1}</td>
        <td><span class="sku-tag">${p.SKU}</span></td>
        <td style="max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${p.produto||''}">${p.produto||'-'}</td>
        <td>${curvaSpan(p.curva||'C')}</td>
        <td style="color:#34d399;font-weight:600;">${fmt(p.receita||0)}</td>
        <td>${fmtN(p.qtd||0)}</td>
        <td>${(p.vd||0).toFixed(2)}/dia</td>
        <td>${(p.cobertura||0)} dias</td>
        <td>${fmtN(p.estoque||0)}</td>
        <td>${statusBadge(p)}</td>
      </tr>`).join('');
    document.getElementById('tableCountLabel').textContent=current.length+' produtos';
    document.getElementById('dashCountLabel').textContent=current.length+' produtos';
    const fn=`(function(p){window._renderDash(p);})`;
    window._renderDash=render;
    buildPag('pagTop',current.length,curPage,fn);
    buildPag('pagBot',current.length,curPage,fn);
  };

  // ---- SORT ----
  window.sortTable=(col)=>{
    if(sortCol===col)sortDir*=-1; else{sortCol=col;sortDir=-1;}
    document.querySelectorAll('[id^="sort-"]').forEach(el=>{el.textContent='↕';el.classList.remove('asc','desc');});
    const ico=document.getElementById('sort-'+col);
    if(ico){ico.textContent=sortDir===1?'↑':'↓';ico.classList.add(sortDir===1?'asc':'desc');}
    current.sort((a,b)=>compareVal(a,b,col,sortDir));
    render(0);
  };

  // ---- FILTER ----
  window.filterTable=()=>{
    const q=(document.getElementById('searchInput').value||'').toLowerCase();
    const ano=document.getElementById('anoFilter').value;
    const mes=document.getElementById('mesFilter').value;
    const curva=document.getElementById('curvaFilter').value;
    current=allProds.filter(p=>{
      if(q&&!(p.SKU||'').toLowerCase().includes(q)&&!(p.produto||'').toLowerCase().includes(q))return false;
      if(curva&&p.curva!==curva)return false;
      return true;
    });
    current.sort((a,b)=>compareVal(a,b,sortCol,sortDir));
    render(0);
  };

  // ---- ALERTS ----
  const alerts=RUPTURAS_DATA.slice(0,10);
  document.getElementById('alertSubtitle').textContent=RUPTURAS_DATA.length+' SKUs em alerta';
  document.getElementById('alertList').innerHTML=alerts.map(r=>{
    const isRupt=r.status==='RUPTURA';
    return`<div class="alert-item${isRupt?'':' warn'}">
      <div class="alert-header">
        <span class="alert-sku${isRupt?'':' warn'}">${r.SKU}</span>
        <span style="font-size:10px;color:${isRupt?'#f87171':'#fbbf24'}">${isRupt?'⚠ RUPTURA':'⚠ RISCO'}</span>
      </div>
      <div class="alert-name">${r.produto||''}</div>
      <div class="alert-msg">Estoque: ${r.estoque||0} un | Cobertura: ${r.cobertura||0} dias | Sugestão: ${r.sugestao||0} un</div>
    </div>`;
  }).join('');

  render(0);
}

// ---- INSIGHTS RENDER ----
function renderInsights(){
  const fmt2=(v)=>'R$'+v.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});
  const curvaSpan=(c)=>`<span class="kpi-badge" style="font-size:11px;${c==='A'?'background:#0d2618;color:#34d399;':c==='B'?'background:#1a2f0d;color:#84cc16;':'background:#1e2535;color:#8892a4;'}">${c}</span>`;
  const D=INSIGHTS_DATA;

  const sections=[
    {key:'alta',   title:'📈 Alta de Vendas',   color:'#34d399', items:D.alta   ||[]},
    {key:'queda',  title:'📉 Queda de Vendas',  color:'#f87171', items:D.queda  ||[]},
    {key:'parado', title:'⏸️ Estoque Parado',  color:'#fbbf24', items:D.parado ||[]},
    {key:'oportunidade',title:'⭐ Oportunidade', color:'#818cf8', items:D.oportunidade||[]},
  ];

  document.getElementById('insightsContent').innerHTML=sections.map(s=>{
    if(!s.items.length)return'';
    return`<div class="card" style="margin-bottom:16px;">
      <div class="card-title" style="color:${s.color};">${s.title}</div>
      <div class="card-subtitle">${s.items.length} produto(s)</div>
      <div class="insight-list">${s.items.map(it=>`
        <div class="insight-item">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
            <span class="sku-tag" onclick="openModal('${it.SKU}')">${it.SKU}</span>
            ${curvaSpan(it.curva||'C')}
          </div>
          <div style="font-size:12px;color:#c0c9d9;font-weight:500;">${it.produto||''}</div>
          <div class="insight-text" style="margin-top:4px;">${it.insight||''}</div>
        </div>`).join('')}
      </div>
    </div>`;
  }).join('');
}

// ---- RUPTURAS RENDER ----
function renderRupturas(data){
  const label=document.getElementById('ruptCountLabel');
  if(label)label.textContent=data.length+' SKUs';
  const totalRupt=data.filter(r=>r.status==='RUPTURA').length;
  const totalRisco=data.filter(r=>r.status==='RISCO').length;
  const sub=document.getElementById('ruptSubtitle');
  if(sub)sub.textContent=`${totalRupt} rupturas | ${totalRisco} em risco`;

  const curvaSpan=(c)=>`<span class="kpi-badge" style="font-size:11px;${c==='A'?'background:#0d2618;color:#34d399;':c==='B'?'background:#1a2f0d;color:#84cc16;':'background:#1e2535;color:#8892a4;'}">${c}</span>`;

  document.getElementById('ruptContent').innerHTML=`
    <div class="card" style="padding:0;">
      <div style="padding:14px 18px;border-bottom:1px solid #1e2535;">
        <span style="font-size:13px;font-weight:600;color:#c0c9d9;">${data.length} produtos em alerta</span>
      </div>
      <div style="overflow-x:auto;">
        <table>
          <thead><tr>
            <th>#</th><th>SKU</th><th>Produto</th><th>Curva</th>
            <th>Status</th><th>Estoque</th><th>Venda/Dia</th><th>Cobertura</th><th>Sugestão</th><th>Receita</th>
          </tr></thead>
          <tbody>${data.map((r,i)=>{
            const isRupt=r.status==='RUPTURA';
            return`<tr onclick="openModal('${r.SKU}')">
              <td class="rank">${i+1}</td>
              <td><span class="sku-tag">${r.SKU}</span></td>
              <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${r.produto||''}">${r.produto||'-'}</td>
              <td>${curvaSpan(r.curva||'C')}</td>
              <td>${isRupt?'<span class="badge-ruptura">⚠ RUPTURA</span>':'<span class="badge-risco">⚠ RISCO</span>'}</td>
              <td>${fmtN(r.estoque||0)}</td>
              <td>${(r.vd||0).toFixed(2)}/dia</td>
              <td>${r.cobertura||0} dias</td>
              <td style="color:#6366f1;font-weight:600;">${fmtN(r.sugestao||0)} un</td>
              <td style="color:#34d399;">${'R$ '+((r.receita||0).toLocaleString('pt-BR',{minimumFractionDigits:2}))}</td>
            </tr>`;
          }).join('')}</tbody>
        </table>
      </div>
    </div>`;
}

// ---- MODAL ----
function openModal(sku){
  const p=DATA.produtos.find(x=>x.SKU===sku);
  if(!p)return;
  document.getElementById('modalSku').textContent=p.SKU;
  document.getElementById('modalName').textContent=p.produto||p.SKU;
  document.getElementById('modalKpis').innerHTML=[
    ['Receita',fmt(p.receita||0)],
    ['Qtd Vendida',fmtN(p.qtd||0)+' un'],
    ['Ticket Médio',fmt(p.qtd>0?p.receita/p.qtd:0)],
    ['Venda/Dia',(p.vd||0).toFixed(2)+'/dia'],
    ['Estoque',fmtN(p.estoque||0)+' un'],
    ['Cobertura',(p.cobertura||0)+' dias'],
  ].map(([l,v])=>`<div class="modal-kpi"><div class="modal-kpi-label">${l}</div><div class="modal-kpi-value">${v}</div></div>`).join('');

  const months=DATA.monthly.map(m=>{
    const[y,mo]=m.mes.split('-');
    const ns=['','Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
    return ns[parseInt(mo)]+'/'+y.slice(2);
  });
  const skuMonthly=(DATA.vendasPorMes?Object.entries(DATA.vendasPorMes).map(([k,arr])=>{
    const item=arr.find(x=>x.SKU===sku);
    return{mes:k,receita:item?item.receita:0,qtd:item?item.qtd:0};
  }):[]).sort((a,b)=>a.mes.localeCompare(b.mes));

  document.getElementById('modalTabs').innerHTML='<div class="tab active" id="tabChart" onclick="switchModalTab(\'chart\')">Gráfico</div><div class="tab" id="tabInfo" onclick="switchModalTab(\'info\')">Detalhes</div>';

  const renderChart=()=>{
    document.getElementById('modalTabContent').innerHTML='<canvas id="modalChart" height="90"></canvas>';
    new Chart(document.getElementById('modalChart').getContext('2d'),{
      type:'line',
      data:{labels:skuMonthly.map(m=>{const[y,mo]=m.mes.split('-');const ns=['','Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];return ns[parseInt(mo)]+'/'+y.slice(2);}),
        datasets:[{label:'Receita',data:skuMonthly.map(m=>m.receita),borderColor:'#6366f1',backgroundColor:'rgba(99,102,241,0.08)',borderWidth:2,pointRadius:3,fill:true,tension:0.35}]},
      options:{responsive:true,plugins:{legend:{display:false}},
        scales:{x:{ticks:{color:'#4a5568'},grid:{color:'#1a2030'}},y:{ticks:{color:'#4a5568',callback:v=>'R$'+Math.round(v/1000)+'k'},grid:{color:'#1a2030'}}}}
    });
  };
  const renderInfo=()=>{
    document.getElementById('modalTabContent').innerHTML=`
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
        ${[['SKU',p.SKU],['Produto',p.produto||'-'],['Curva',p.curva||'-'],['Estoque',fmtN(p.estoque||0)+' un'],
           ['Venda/Dia',(p.vd||0).toFixed(2)+'/dia'],['Cobertura',(p.cobertura||0)+' dias'],
           ['Sugestão Compra',fmtN(p.sugestao||0)+' un'],['Status',statusBadge(p)]]
          .map(([l,v])=>`<div style="background:#0f1117;border-radius:8px;padding:12px;"><div style="font-size:10px;color:#4a5568;text-transform:uppercase;letter-spacing:0.5px;">${l}</div><div style="font-size:14px;color:#e2e8f0;margin-top:4px;font-weight:500;">${v}</div></div>`).join('')}
      </div>`;
  };

  window.switchModalTab=(tab)=>{
    document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));
    document.getElementById('tab'+tab.charAt(0).toUpperCase()+tab.slice(1)).classList.add('active');
    if(tab==='chart')renderChart(); else renderInfo();
  };

  renderChart();
  document.getElementById('modalOverlay').classList.add('open');
}

function closeModal(e){
  if(!e||e.target===document.getElementById('modalOverlay')){
    document.getElementById('modalOverlay').classList.remove('open');
  }
}

// Inicializa ao carregar
loadData();
