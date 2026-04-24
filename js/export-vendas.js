// export-vendas.js — Modal de Exportação de Relatório de Vendas

(function(){
  const PS_EXPV = 50;
  let _expVDados        = [];
  let _expVSelecionados = new Set();
  let _expVPage         = 0;

  function fmtN(v){ return (v||0).toLocaleString('pt-BR'); }
  function fmt(v){ return 'R$ '+(v||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2}); }

  function curvaSpanExpV(c){
    if(c==='A') return '<span style="font-size:10px;font-weight:700;padding:2px 6px;border-radius:4px;background:#0d2618;color:#34d399;">A</span>';
    if(c==='B') return '<span style="font-size:10px;font-weight:700;padding:2px 6px;border-radius:4px;background:#1a2f0d;color:#84cc16;">B</span>';
    return '<span style="font-size:10px;font-weight:700;padding:2px 6px;border-radius:4px;background:#1e2535;color:#8892a4;">C</span>';
  }

  window.abrirModalExportVendas = function(){
    document.getElementById('exportVendasOverlay').style.display = 'flex';
    document.getElementById('exportVFiltroCurva').value = '';
    document.getElementById('exportVBusca').value       = '';
    renderExportVList(0);
  };

  window.fecharModalExportVendas = function(e){
    if(!e || e.target === document.getElementById('exportVendasOverlay')){
      document.getElementById('exportVendasOverlay').style.display = 'none';
    }
  };

  window.renderExportVList = function(pg){
    _expVPage = pg || 0;
    const curvaFiltro = document.getElementById('exportVFiltroCurva').value;
    const busca = (document.getElementById('exportVBusca').value || '').toLowerCase();

    _expVDados = (window._vendasAgregadas || []).filter(r => {
      if(curvaFiltro && r.curva !== curvaFiltro) return false;
      if(busca && !(r.SKU||'').toLowerCase().includes(busca) && !(r.produto||'').toLowerCase().includes(busca)) return false;
      return true;
    });

    const total = _expVDados.length;
    const slice = _expVDados.slice(_expVPage * PS_EXPV, (_expVPage + 1) * PS_EXPV);

    document.getElementById('exportVBody').innerHTML = slice.map(r => {
      const checked = _expVSelecionados.has(r.SKU) ? 'checked' : '';
      return `
        <tr style="border-top:1px solid #1a2030;cursor:pointer;" onclick="exportVToggleLine('${r.SKU}')">
          <td style="text-align:center;padding:8px 10px;">
            <input type="checkbox" data-sku="${r.SKU}" ${checked}
              onclick="event.stopPropagation();exportVToggleLine('${r.SKU}')"
              style="accent-color:#6366f1;width:14px;height:14px;cursor:pointer;">
          </td>
          <td style="padding:8px;font-size:11px;font-weight:700;color:#6366f1;white-space:nowrap;">${r.SKU}</td>
          <td style="padding:8px;font-size:11px;color:#c0c9d9;max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${r.produto||''}">${r.produto||'-'}</td>
          <td style="padding:8px;text-align:center;">${curvaSpanExpV(r.curva||'C')}</td>
          <td style="padding:8px;font-size:11px;color:#c0c9d9;text-align:right;">${fmtN(r.qtd||0)}</td>
          <td style="padding:8px;font-size:11px;color:#34d399;text-align:right;">${fmt(r.receita||0)}</td>
          <td style="padding:8px;font-size:11px;color:#c0c9d9;text-align:right;">${fmt(r.ticket||0)}</td>
          <td style="padding:8px;font-size:11px;color:#c0c9d9;text-align:right;">${(r.vd||0).toFixed(1)}</td>
        </tr>`;
    }).join('');

    const todosNaPagina = slice.every(r => _expVSelecionados.has(r.SKU));
    document.getElementById('exportVCheckAll').checked = slice.length > 0 && todosNaPagina;
    document.getElementById('exportVCheckAll').indeterminate =
      !todosNaPagina && slice.some(r => _expVSelecionados.has(r.SKU));

    _buildExportVPag(total, _expVPage);
    _atualizarPreviewV();
  };

  function _buildExportVPag(total, pg){
    const totalPages = Math.ceil(total / PS_EXPV);
    const el = document.getElementById('exportVPag');
    if(!el) return;
    if(totalPages <= 1){ el.innerHTML=''; return; }
    const s = pg*PS_EXPV+1, e = Math.min((pg+1)*PS_EXPV, total);
    let pages = [...Array(totalPages).keys()];
    if(totalPages > 7){
      let st = Math.max(0, pg-3);
      let en = Math.min(totalPages, st+7);
      if(en-st < 7) st = Math.max(0, en-7);
      pages = pages.slice(st, en);
    }
    el.innerHTML =
      `<span style="font-size:12px;color:#4a5568;margin-right:6px;">${s}–${e} de ${total}</span>`
      +`<button class="page-btn${pg===0?' disabled':''}" onclick="renderExportVList(${pg-1})" ${pg===0?'disabled':''}>&#8249;</button>`
      +pages.map(p2=>`<button class="page-btn${p2===pg?' active':''}" onclick="renderExportVList(${p2})">${p2+1}</button>`).join('')
      +`<button class="page-btn${pg===totalPages-1?' disabled':''}" onclick="renderExportVList(${pg+1})" ${pg===totalPages-1?'disabled':''}>&#8250;</button>`;
  }

  function _atualizarPreviewV(){
    const selecionados = [..._expVSelecionados];
    document.getElementById('exportVSelectedCount').textContent = selecionados.length;
    if(selecionados.length === 0){
      document.getElementById('exportVPreview').value = '';
      return;
    }
    const hoje = new Date().toLocaleDateString('pt-BR');

    // Cabeçalho das colunas
    const header = 'SKU | PRODUTO | CURVA | QUANTIDADE VENDIDA | RECEITA | TICKET MEDIO | VENDA DIA | COBERTURA';

    const linhas = selecionados.map(sku => {
      const r = (window._vendasAgregadas || []).find(x => x.SKU === sku);
      if(!r) return '';
      const cobertura = (r.vd && r.vd > 0)
        ? Math.round((r.estoque || 0) / r.vd) + ' dias'
        : '-';
      return [
        r.SKU              || '-',
        r.produto          || '-',
        r.curva            || 'C',
        fmtN(r.qtd         || 0),
        fmt(r.receita      || 0),
        fmt(r.ticket       || 0),
        (r.vd              || 0).toFixed(1),
        cobertura
      ].join(' | ');
    }).filter(Boolean);

    document.getElementById('exportVPreview').value =
      `Relatório de Vendas — ${hoje}\n` +
      `${'─'.repeat(60)}\n` +
      header + '\n' +
      `${'─'.repeat(60)}\n` +
      linhas.join('\n') +
      `\n${'─'.repeat(60)}\n` +
      `Total: ${selecionados.length} produto(s)`;
  }

  window.exportVToggleLine = function(sku){
    if(_expVSelecionados.has(sku)) _expVSelecionados.delete(sku);
    else _expVSelecionados.add(sku);
    renderExportVList(_expVPage);
  };

  window.exportVToggleAll = function(checked){
    const slice = _expVDados.slice(_expVPage * PS_EXPV, (_expVPage + 1) * PS_EXPV);
    slice.forEach(r => checked ? _expVSelecionados.add(r.SKU) : _expVSelecionados.delete(r.SKU));
    renderExportVList(_expVPage);
  };

  window.exportVSelecionarTudo = function(){
    _expVDados.forEach(r => _expVSelecionados.add(r.SKU));
    renderExportVList(_expVPage);
  };

  window.exportVLimparTudo = function(){
    _expVSelecionados.clear();
    renderExportVList(_expVPage);
  };

  window.exportVCopiar = function(){
    const txt = document.getElementById('exportVPreview').value;
    if(!txt) return;
    navigator.clipboard.writeText(txt).then(() => {
      const btn = document.getElementById('btnExportVCopiar');
      btn.textContent = '✅ Copiado!';
      setTimeout(() => { btn.textContent = '📋 Copiar'; }, 2000);
    });
  };

  window.exportVBaixar = function(){
    const txt = document.getElementById('exportVPreview').value;
    if(!txt) return;
    const blob = new Blob([txt], {type:'text/plain;charset=utf-8'});
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `relatorio_vendas_${new Date().toISOString().slice(0,10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };
})();
