// export-estoque.js — Modal de Exportação de Pedido ao Fornecedor

(function(){
  const PS_EXP = 50;
  let _expDados        = [];
  let _expSelecionados = new Set();
  let _expPage         = 0;

  function fmtN(v){ return (v||0).toLocaleString('pt-BR'); }

  function curvaSpanExp(c){
    if(c==='A') return '<span style="font-size:10px;font-weight:700;padding:2px 6px;border-radius:4px;background:#0d2618;color:#34d399;">A</span>';
    if(c==='B') return '<span style="font-size:10px;font-weight:700;padding:2px 6px;border-radius:4px;background:#1a2f0d;color:#84cc16;">B</span>';
    return '<span style="font-size:10px;font-weight:700;padding:2px 6px;border-radius:4px;background:#1e2535;color:#8892a4;">C</span>';
  }

  window.abrirModalExport = function(){
    document.getElementById('exportOverlay').style.display = 'flex';
    document.getElementById('exportFiltroStatus').value = '';
    document.getElementById('exportFiltroCurva').value  = '';
    document.getElementById('exportBusca').value        = '';
    renderExportList(0);
  };

  window.fecharModalExport = function(e){
    if(!e || e.target === document.getElementById('exportOverlay')){
      document.getElementById('exportOverlay').style.display = 'none';
    }
  };

  window.renderExportList = function(pg){
    _expPage = pg || 0;
    const statusFiltro = document.getElementById('exportFiltroStatus').value;
    const curvaFiltro  = document.getElementById('exportFiltroCurva').value;
    const busca = (document.getElementById('exportBusca').value || '').toLowerCase();

    _expDados = (ESTOQUE_DATA || []).filter(r => {
      if(statusFiltro && r.status !== statusFiltro) return false;
      if(curvaFiltro  && r.curva  !== curvaFiltro)  return false;
      if(busca && !(r.SKU||'').toLowerCase().includes(busca) && !(r.desc||'').toLowerCase().includes(busca)) return false;
      return true;
    });

    const total = _expDados.length;
    const slice = _expDados.slice(_expPage * PS_EXP, (_expPage + 1) * PS_EXP);

    document.getElementById('exportBody').innerHTML = slice.map(r => {
      const checked     = _expSelecionados.has(r.SKU) ? 'checked' : '';
      const isRupt      = r.status === 'RUPTURA';
      const isRisco     = r.status === 'RISCO';
      const rowStyle    = isRupt ? 'background:#1a0f14;' : isRisco ? 'background:#161205;' : '';
      const statusLabel = isRupt
        ? '<span style="font-size:10px;font-weight:700;color:#f87171;">⚠ RUPTURA</span>'
        : isRisco
          ? '<span style="font-size:10px;font-weight:700;color:#fbbf24;">⚠ RISCO</span>'
          : '<span style="font-size:10px;font-weight:700;color:#34d399;">✓ OK</span>';
      return `
        <tr style="border-top:1px solid #1a2030;${rowStyle}cursor:pointer;" onclick="exportToggleLine('${r.SKU}')">
          <td style="text-align:center;padding:8px 10px;">
            <input type="checkbox" data-sku="${r.SKU}" ${checked}
              onclick="event.stopPropagation();exportToggleLine('${r.SKU}')"
              style="accent-color:#6366f1;width:14px;height:14px;cursor:pointer;">
          </td>
          <td style="padding:8px;font-size:11px;font-weight:700;color:#6366f1;white-space:nowrap;">${r.SKU}</td>
          <td style="padding:8px;font-size:11px;color:#c0c9d9;max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${r.desc||''}">${r.desc||'-'}</td>
          <td style="padding:8px;text-align:center;">${curvaSpanExp(r.curva||'C')}</td>
          <td style="padding:8px;font-size:11px;color:#c0c9d9;text-align:right;">${fmtN(r.estoque||0)}</td>
          <td style="padding:8px;font-size:12px;font-weight:700;color:#6366f1;text-align:right;">${fmtN(r.sugestao||0)}</td>
          <td style="padding:8px;font-size:11px;color:#c0c9d9;text-align:right;">${fmtN(r.qtd30||0)}</td>
          <td style="padding:8px;font-size:11px;color:#c0c9d9;text-align:right;">${r.cobertura||0} dias</td>
          <td style="padding:8px;text-align:center;">${statusLabel}</td>
        </tr>`;
    }).join('');

    const todosNaPagina = slice.every(r => _expSelecionados.has(r.SKU));
    document.getElementById('exportCheckAll').checked = slice.length > 0 && todosNaPagina;
    document.getElementById('exportCheckAll').indeterminate =
      !todosNaPagina && slice.some(r => _expSelecionados.has(r.SKU));

    _buildExportPag(total, _expPage);
    _atualizarPreview();
  };

  function _buildExportPag(total, pg){
    const totalPages = Math.ceil(total / PS_EXP);
    const el = document.getElementById('exportPag');
    if(!el) return;
    if(totalPages <= 1){ el.innerHTML=''; return; }
    const s = pg*PS_EXP+1, e = Math.min((pg+1)*PS_EXP, total);
    let pages = [...Array(totalPages).keys()];
    if(totalPages > 7){
      let st = Math.max(0, pg-3);
      let en = Math.min(totalPages, st+7);
      if(en-st < 7) st = Math.max(0, en-7);
      pages = pages.slice(st, en);
    }
    el.innerHTML =
      `<span style="font-size:12px;color:#4a5568;margin-right:6px;">${s}–${e} de ${total}</span>`
      +`<button class="page-btn${pg===0?' disabled':''}" onclick="renderExportList(${pg-1})" ${pg===0?'disabled':''}>&#8249;</button>`
      +pages.map(p2=>`<button class="page-btn${p2===pg?' active':''}" onclick="renderExportList(${p2})">${p2+1}</button>`).join('')
      +`<button class="page-btn${pg===totalPages-1?' disabled':''}" onclick="renderExportList(${pg+1})" ${pg===totalPages-1?'disabled':''}>&#8250;</button>`;
  }

  function _atualizarPreview(){
    const selecionados = [..._expSelecionados];
    document.getElementById('exportSelectedCount').textContent = selecionados.length;
    if(selecionados.length === 0){
      document.getElementById('exportPreview').value = '';
      return;
    }
    const hoje = new Date().toLocaleDateString('pt-BR');

    // Cabeçalho das colunas
    const header = 'SKU | Descrição | Curva | Estoque | Status | Venda | 30d | Tendência | Sugestão | Receita';

    const linhas = selecionados.map(sku => {
      const r = (ESTOQUE_DATA || []).find(x => x.SKU === sku);
      if(!r) return '';

      // Tendência: baseada na cobertura vs média esperada (30 dias)
      const cobertura = r.cobertura || 0;
      const tendencia = cobertura >= 30 ? '▲ Alta' : cobertura >= 15 ? '→ Estável' : '▼ Baixa';

      // Receita estimada: sugestão × ticket médio (se disponível) ou campo direto
      const receita = r.receita
        ? 'R$ ' + (r.receita).toLocaleString('pt-BR', {minimumFractionDigits:2, maximumFractionDigits:2})
        : '-';

      return [
        r.SKU              || '-',
        r.desc             || '-',
        r.curva            || 'C',
        fmtN(r.estoque     || 0),
        r.status           || 'OK',
        cobertura + ' dias',
        fmtN(r.qtd30       || 0),
        tendencia,
        fmtN(r.sugestao    || 0),
        receita
      ].join(' | ');
    }).filter(Boolean);

    document.getElementById('exportPreview').value =
      `Pedido ao Fornecedor — ${hoje}\n` +
      `${'─'.repeat(80)}\n` +
      header + '\n' +
      `${'─'.repeat(80)}\n` +
      linhas.join('\n') +
      `\n${'─'.repeat(80)}\n` +
      `Total: ${selecionados.length} produto(s)`;
  }

  window.exportToggleLine = function(sku){
    if(_expSelecionados.has(sku)) _expSelecionados.delete(sku);
    else _expSelecionados.add(sku);
    renderExportList(_expPage);
  };

  window.exportToggleAll = function(checked){
    const slice = _expDados.slice(_expPage * PS_EXP, (_expPage + 1) * PS_EXP);
    slice.forEach(r => checked ? _expSelecionados.add(r.SKU) : _expSelecionados.delete(r.SKU));
    renderExportList(_expPage);
  };

  window.exportSelecionarTudo = function(){
    _expDados.forEach(r => _expSelecionados.add(r.SKU));
    renderExportList(_expPage);
  };

  window.exportLimparTudo = function(){
    _expSelecionados.clear();
    renderExportList(_expPage);
  };

  window.exportCopiar = function(){
    const txt = document.getElementById('exportPreview').value;
    if(!txt) return;
    navigator.clipboard.writeText(txt).then(() => {
      const btn = document.getElementById('btnExportCopiar');
      btn.textContent = '✅ Copiado!';
      setTimeout(() => { btn.textContent = '📋 Copiar'; }, 2000);
    });
  };

  window.exportBaixar = function(){
    const txt = document.getElementById('exportPreview').value;
    if(!txt) return;
    const blob = new Blob([txt], {type:'text/plain;charset=utf-8'});
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `pedido_fornecedor_${new Date().toISOString().slice(0,10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };
})();
