// trend.js — Tendência Global (compartilhada por Estoque e Vendas)

window.calcTrend = function(qtd30, qtd60, qtd90){
  const q30 = Number(qtd30) || 0;
  const q60 = Number(qtd60) || 0;
  const q90 = Number(qtd90) || 0;
  if(q90 > 0){
    const antes = (q90 - q30) / 2;
    if(antes === 0) return 0;
    return Math.round(((q30 - antes) / antes) * 100);
  }
  if(q60 > 0){
    const antes = q60 - q30;
    if(antes === 0) return 0;
    return Math.round(((q30 - antes) / antes) * 100);
  }
  return 0;
};

window.trendCell = function(trend){
  const t = Number(trend) || 0;
  const abs = Math.abs(t);
  let color, arrow, label;
  if(t > 10){
    color = '#34d399'; arrow = '\u25b2'; label = '+' + t + '%';
  } else if(t < -10){
    color = '#f87171'; arrow = '\u25bc'; label = t + '%';
  } else {
    color = '#8892a4'; arrow = '\u2794'; label = (t >= 0 ? '+' : '') + t + '%';
  }
  const barPct   = Math.min(abs, 100);
  const barColor = t > 10 ? '#34d399' : t < -10 ? '#f87171' : '#4a5568';
  const tip = t !== 0
    ? 'Variacao de vendas: ' + label + ' (base 90d ou 60d)'
    : 'Sem variacao significativa';
  return '<div title="' + tip + '" style="display:flex;flex-direction:column;gap:4px;min-width:100px;max-width:130px;">'
    + '<div style="display:flex;align-items:center;gap:5px;">'
    + '<span style="color:' + color + ';font-size:13px;font-weight:700;line-height:1;">' + arrow + '</span>'
    + '<span style="color:' + color + ';font-size:12px;font-weight:600;">' + label + '</span>'
    + '</div>'
    + '<div style="background:#1e2535;border-radius:3px;height:5px;width:100%;overflow:hidden;">'
    + '<div style="background:' + barColor + ';border-radius:3px;height:5px;width:' + barPct + '%;transition:width 0.4s ease;"></div>'
    + '</div>'
    + '</div>';
};
