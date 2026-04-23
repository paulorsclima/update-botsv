// ============================================================
// vendas.js — Página Vendas por Produto
// Depende de: config.js, app.js (carregados antes)
// ============================================================

function initVendas() {
  const prods = DATA.produtos.slice();
  const MESES_NOMES = ['','Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

  // ── Popula filtros de ano e mês dinamicamente a partir dos dados da planilha
  const todasChaves = Object.keys(DATA.vendasPorMes || {}).sort();
  const anos  = [...new Set(todasChaves.map(k => k.split('-')[0]))].sort();
  const meses = [...new Set(todasChaves.map(k => k.split('-')[1]))].sort();

  const selAno = document.getElementById('vAno');
  const selMes = document.getElementById('vMes');

  if (selAno) {
    selAno.innerHTML = '<option value="">Todos os anos</option>';
    anos.forEach(a => {
      const o = document.createElement('option');
      o.value = a; o.textContent = a;
      selAno.appendChild(o);
    });
  }
  if (selMes) {
    selMes.innerHTML = '<option value="">Todos os meses</option>';
    meses.forEach(m => {
      const o = document.createElement('option');
      o.value = m; o.textContent = MESES_NOMES[parseInt(m)] || m;
      selMes.appendChild(o);
    });
  }

  // ── Subtítulo
  if (todasChaves.length) {
    const fmtM = k => { const [y, mo] = k.split('-'); return MESES_NOMES[parseInt(mo)] + '/' + y; };
    const sub = document.getElementById('vendasSubtitle');
    if (sub) sub.textContent = fmtM(todasChaves[0]) + ' – ' + fmtM(todasChaves[todasChaves.length - 1]);
  }

  // ── Estado
  let current = prods.slice();
  let sortCol = 'receita', sortDir = -1, curPage = 0;
  const PS = 100;

  // ── KPIs (corrigido: ticket médio vem de DATA.kpis.ticket = Receita total / Total de pedidos)
function updateVKpis(list) {
  const rec = list.reduce((s, p) => s + (p.receita || 0), 0);
  const qtd = list.reduce((s, p) => s + (p.qtd    || 0), 0);

  // ✅ CORREÇÃO — ticket médio calculado sobre o período filtrado
  const ticketMedio = qtd > 0 ? rec / qtd : 0;

  document.getElementById('vKpiReceita').textContent = fmt(rec);
  document.getElementById('vKpiQtd').textContent     = fmtN(qtd) + ' un';
  document.getElementById('vKpiTicket').textContent  = fmt(ticketMedio);
  document.getElementById('vKpiSkus').textContent    = fmtN(list.length);
}

  // ── Gráfico linha
  let vendasLineChartInst = null;
  function buildVendasLineChart(list) {
    const ano   = selAno ? selAno.value : '';
    const mes   = selMes ? selMes.value : '';
    const chaves = todasChaves.filter(k => {
      const [y, m] = k.split('-');
      if (ano && y !== ano) return false;
      if (mes && m !== mes) return false;
      return true;
    });
    const skuSet = new Set(list.map(p => p.SKU));
    const labels = chaves.map(k => { const [y, mo] = k.split('-'); return MESES_NOMES[parseInt(mo)] + '/' + y.slice(2); });
    const data   = chaves.map(k => {
      const arr = DATA.vendasPorMes[k] || [];
      return arr.filter(x => skuSet.has(x.SKU)).reduce((s, x) => s + (x.receita || 0), 0);
    });
    if (vendasLineChartInst) vendasLineChartInst.destroy();
    vendasLineChartInst = new Chart(document.getElementById('vendasLineChart').getContext('2d'), {
      type: 'line',
      data: { labels, datasets: [{ label: 'Receita', data, borderColor: '#6366f1', backgroundColor: 'rgba(99,102,241,0.08)', borderWidth: 2.5, pointRadius: 3, fill: true, tension: 0.35 }] },
      options: { responsive: true, plugins: { legend: { display: false } },
        scales: { x: { ticks: { color: '#4a5568' }, grid: { color: '#1a2030' } }, y: { ticks: { color: '#4a5568', callback: v => 'R$' + Math.round(v / 1000) + 'k' }, grid: { color: '#1a2030' } } } }
    });
  }

  // ── Gráfico curva
  let vendasCurvaChartInst = null;
  function buildVendasCurvaChart(list) {
    const recA = list.filter(p => p.curva === 'A').reduce((s, p) => s + (p.receita || 0), 0);
    const recB = list.filter(p => p.curva === 'B').reduce((s, p) => s + (p.receita || 0), 0);
    const recC = list.filter(p => p.curva === 'C').reduce((s, p) => s + (p.receita || 0), 0);
    if (vendasCurvaChartInst) vendasCurvaChartInst.destroy();
    vendasCurvaChartInst = new Chart(document.getElementById('vendasCurvaChart').getContext('2d'), {
      type: 'doughnut',
      data: { labels: ['Curva A','Curva B','Curva C'], datasets: [{ data: [recA, recB, recC], backgroundColor: ['#34d399','#84cc16','#4a5568'], borderWidth: 0 }] },
      options: { responsive: true, cutout: '62%', plugins: { legend: { position: 'bottom', labels: { color: '#8892a4', font: { size: 11 }, padding: 10 } } } }
    });
  }

  // ── Paginação
  function buildVPag(id, total, pg, onGo) {
    const el = document.getElementById(id);
    if (!el) return;
    const totalPages = Math.ceil(total / PS);
    if (totalPages <= 1) { el.innerHTML = ''; return; }
    const s = pg * PS + 1, e = Math.min((pg + 1) * PS, total);
    let pages = [...Array(totalPages).keys()];
    if (totalPages > 7) { let st = Math.max(0, pg - 3); let en = Math.min(totalPages, st + 7); if (en - st < 7) st = Math.max(0, en - 7); pages = pages.slice(st, en); }
    el.innerHTML = `<span style="font-size:12px;color:#4a5568;margin-right:6px;">${s}–${e} de ${total}</span>`
      + `<button class="page-btn${pg === 0 ? ' disabled' : ''}" onclick="(${onGo})(${pg - 1})" ${pg === 0 ? 'disabled' : ''}>&#8249;</button>`
      + pages.map(p2 => `<button class="page-btn${p2 === pg ? ' active' : ''}" onclick="(${onGo})(${p2})">${p2 + 1}</button>`).join('')
      + `<button class="page-btn${pg === totalPages - 1 ? ' disabled' : ''}" onclick="(${onGo})(${pg + 1})" ${pg === totalPages - 1 ? 'disabled' : ''}>&#8250;</button>`;
  }

  // ── Render tabela
  function renderVendas(pg) {
    curPage = pg || 0;
    const slice = current.slice(curPage * PS, (curPage + 1) * PS);

    const curvaSpan = c => c === 'A'
      ? `<span class="kpi-badge" style="font-size:10px;background:#0d2618;color:#34d399;">A</span>`
      : c === 'B'
        ? `<span class="kpi-badge" style="font-size:10px;background:#1a2f0d;color:#84cc16;">B</span>`
        : `<span class="kpi-badge" style="font-size:10px;background:#1e2535;color:#8892a4;">C</span>`;

    const ticket = p => p.qtd > 0 ? fmt(p.receita / p.qtd) : '—';

    document.getElementById('vendasBody').innerHTML = slice.map((p, i) => {
      const trend = (p.kpi_trend != null && p.kpi_trend !== '')
        ? Number(p.kpi_trend)
        : window.calcTrend(p.qtd30, p.qtd60, p.qtd90);
      return `
        <tr onclick="openModal('${p.SKU}')">
          <td class="rank">${curPage * PS + i + 1}</td>
          <td><span class="sku-tag">${p.SKU}</span></td>
          <td style="max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${p.produto || ''}">${p.produto || '-'}</td>
          <td>${curvaSpan(p.curva || 'C')}</td>
          <td>${fmtN(p.qtd || 0)}</td>
          <td style="color:#34d399;font-weight:600;">${fmt(p.receita || 0)}</td>
          <td>${ticket(p)}</td>
          <td>${(p.vd || 0).toFixed(2)}/dia</td>
          <td>${(p.cobertura || 0)} dias</td>
          <td>${fmtN(p.estoque || 0)}</td>
          <td>${window.trendCell(trend)}</td>
        </tr>`;
    }).join('');

    document.getElementById('vendasTableCount').textContent = current.length + ' produtos';
    window._renderVendas = renderVendas;
    const fn = `(function(p){window._renderVendas(p);})`;
    buildVPag('vendasPagTop', current.length, curPage, fn);
    buildVPag('vendasPagBot', current.length, curPage, fn);
    updateVKpis(current);
    buildVendasLineChart(current);
    buildVendasCurvaChart(current);
  }

  // ── Sort
  window.sortVendas = (col) => {
    if (sortCol === col) sortDir *= -1; else { sortCol = col; sortDir = -1; }
    document.querySelectorAll('[id^="vsort-"]').forEach(el => { el.textContent = '↕'; el.classList.remove('asc', 'desc'); });
    const ico = document.getElementById('vsort-' + col);
    if (ico) { ico.textContent = sortDir === 1 ? '↑' : '↓'; ico.classList.add(sortDir === 1 ? 'asc' : 'desc'); }
    current.sort((a, b) => compareVal(a, b, col, sortDir));
    renderVendas(0);
  };

  // ── Filtros combinados: busca + ano + mês + curva
  window.applyVendasFilters = () => {
    const q     = (document.getElementById('vSearch')?.value || '').toLowerCase();
    const ano   = document.getElementById('vAno')?.value   || '';
    const mes   = document.getElementById('vMes')?.value   || '';
    const curva = document.getElementById('vCurva')?.value || '';

    // Se filtro por período: recalcula receita/qtd a partir de vendasPorMes
    if (ano || mes) {
      const chaves = todasChaves.filter(k => {
        const [y, m] = k.split('-');
        if (ano && y !== ano) return false;
        if (mes && m !== mes) return false;
        return true;
      });
      const skuMap = {};
      chaves.forEach(k => {
        (DATA.vendasPorMes[k] || []).forEach(x => {
          if (!skuMap[x.SKU]) {
            const base = DATA.produtos.find(p => p.SKU === x.SKU) || {};
            skuMap[x.SKU] = {
              ...base,
              receita: 0,
              qtd: 0,
              qtd30:     base.qtd30     || 0,
              qtd60:     base.qtd60     || 0,
              qtd90:     base.qtd90     || 0,
              kpi_trend: base.kpi_trend ?? null
            };
          }
          skuMap[x.SKU].receita += x.receita || 0;
          skuMap[x.SKU].qtd    += x.qtd    || 0;
        });
      });
      current = Object.values(skuMap);
    } else {
      current = prods.slice();
    }

    if (q)     current = current.filter(p => (p.SKU || '').toLowerCase().includes(q) || (p.produto || '').toLowerCase().includes(q));
    if (curva) current = current.filter(p => p.curva === curva);
    current.sort((a, b) => compareVal(a, b, sortCol, sortDir));
    renderVendas(0);
  };

  renderVendas(0);
}
