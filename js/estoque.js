// estoque.js — Paginação, KPIs e filtros da página Estoque

(function(){
  const PS = 100;
  let _estPage = 0;
  let _estDadosFiltrados = [];

  function fmtN(v){ return (v||0).toLocaleString('pt-BR'); }
  function fmt(v){ return 'R$ '+(v||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2}); }

  function curvaSpan(c){
    if(c==='A') return '<span class="kpi-badge" style="font-size:10px;background:#0d2618;color:#34d399;">A</span>';
    if(c==='B') return '<span class="kpi-badge" style="font-size:10px;background:#1a2f0d;color:#84cc16;">B</span>';
    return '<span class="kpi-badge" style="font-size:10px;background:#1e2535;color:#8892a4;">C</span>';
  }

  function statusBadgeEst(s){
    if(s==='RUPTURA') return '<span class="badge-ruptura">⚠ Ruptura</span>';
    if(s==='RISCO')   return '<span class="badge-risco">⚠ Risco</span>';
    return '<span class="badge-ok">✓ OK</span>';
  }

  function resolveTrend(r){
    if(r.kpi_trend !== undefined && r.kpi_trend !== null && r.kpi_trend !== ''){
      return Number(r.kpi_trend);
    }
    return window.calcTrend(r.qtd30, r.qtd60, r.qtd90);
  }

  window._filtroEstoque = function(){
    const q      = (document.getElementById('estSearch').value || '').toLowerCase();
    const status = document.getElementById('estFiltroStatus').value;
    const curva  = document.getElementById('estFiltroCurva').value;
    const ordem  = document.getElementById('estFiltroOrdem').value;

    let data = (ESTOQUE_DATA || []).filter(r => {
      if(q && !(r.SKU||'').toLowerCase().includes(q) && !(r.desc||'').toLowerCase().includes(q)) return false;
      if(status && r.status !== status) return false;
      if(curva  && r.curva  !== curva)  return false;
      return true;
    });

    if(ordem === 'az')
      data.sort((a,b) => (a.desc||'').localeCompare(b.desc||'', 'pt-BR'));
    else if(ordem === 'za')
      data.sort((a,b) => (b.desc||'').localeCompare(a.desc||'', 'pt-BR'));
    else if(ordem === 'estoque_asc')
      data.sort((a,b) => (a.estoque||0) - (b.estoque||0));
    else if(ordem === 'estoque_desc')
      data.sort((a,b) => (b.estoque||0) - (a.estoque||0));
    else if(ordem === 'cobertura_asc')
      data.sort((a,b) => (a.cobertura||0) - (b.cobertura||0));

    _estDadosFiltrados = data;
    renderEstoquePage(0);
  };

  function buildEstoquePag(total, pg){
    const totalPages = Math.ceil(total / PS);
    const buildPag = (id) => {
      const el = document.getElementById(id);
      if(!el) return;
      if(totalPages <= 1){ el.innerHTML=''; return; }
      const s = pg*PS+1, e = Math.min((pg+1)*PS, total);
      let pages = [...Array(totalPages).keys()];
      if(totalPages > 7){
        let st = Math.max(0, pg-3);
        let en = Math.min(totalPages, st+7);
        if(en-st < 7) st = Math.max(0, en-7);
        pages = pages.slice(st, en);
      }
      el.innerHTML =
        `<span style="font-size:12px;color:#4a5568;margin-right:6px;">${s}–${e} de ${total}</span>`
        +`<button class="page-btn${pg===0?' disabled':''}" onclick="window._goEstPage(${pg-1})" ${pg===0?'disabled':''}>&#8249;</button>`
        +pages.map(p2=>`<button class="page-btn${p2===pg?' active':''}" onclick="window._goEstPage(${p2})">${p2+1}</button>`).join('')
        +`<button class="page-btn${pg===totalPages-1?' disabled':''}" onclick="window._goEstPage(${pg+1})" ${pg===totalPages-1?'disabled':''}>&#8250;</button>`;
    };
    buildPag('estoquePagTop');
    buildPag('estoquePagBot');
  }

  function renderEstoquePage(pg){
    _estPage = pg || 0;
    const data  = _estDadosFiltrados;
    const slice = data.slice(_estPage*PS, (_estPage+1)*PS);

    document.getElementById('estoqueBody').innerHTML = slice.map((r, i) => `
      <tr onclick="openModal('${r.SKU}')">
        <td class="rank">${_estPage*PS + i + 1}</td>
        <td><span class="sku-tag">${r.SKU}</span></td>
        <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${r.desc||''}">${r.desc||'-'}</td>
        <td>${curvaSpan(r.curva||'C')}</td>
        <td>${fmtN(r.estoque||0)}</td>
        <td>${statusBadgeEst(r.status||'OK')}</td>
        <td>${fmtN(r.qtd30||0)} un</td>
        <td>${window.trendCell(resolveTrend(r))}</td>
        <td style="color:#6366f1;font-weight:600;">${fmtN(r.sugestao||0)} un</td>
        <td style="color:#34d399;">${fmt(r.receita||0)}</td>
      </tr>`).join('');

    document.getElementById('estoqueTableCount').textContent = data.length + ' SKUs';
    document.getElementById('estoqueCountLabel').textContent = data.length + ' SKUs';
    buildEstoquePag(data.length, _estPage);
  }

  function renderEstoqueKpis(){
    const data    = ESTOQUE_DATA || [];
    const total   = data.length;
    const ruptura = data.filter(r => r.status === 'RUPTURA').length;
    const risco   = data.filter(r => r.status === 'RISCO').length;
    const ok      = data.filter(r => r.status === 'OK').length;

    document.getElementById('estKpiTotal').textContent   = fmtN(total);
    document.getElementById('estKpiRuptura').textContent = fmtN(ruptura);
    document.getElementById('estKpiRisco').textContent   = fmtN(risco);
    document.getElementById('estKpiOk').textContent      = fmtN(ok);
  }

  window._goEstPage = function(pg){
    renderEstoquePage(pg);
    window.scrollTo(0,0);
  };

  window.renderEstoque = function(){
    _estDadosFiltrados = ESTOQUE_DATA || [];
    renderEstoqueKpis();
    renderEstoquePage(0);
  };
})();
