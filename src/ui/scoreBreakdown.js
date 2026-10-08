function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character]);
}

function formatNumber(value) {
  return new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 1, minimumFractionDigits: 1 }).format(value);
}

function componentValue(component) {
  if (Number.isFinite(component.score)) {
    return `${formatNumber(component.score)} / 100 · 样本 n=${component.sampleCount}`;
  }
  if (Number.isFinite(component.rawValue)) {
    const sign = component.rawValue > 0 ? '+' : '';
    return `原始差值 ${sign}${formatNumber(component.rawValue)} · 模考 n=${component.userSampleCount} · 参考样本 n=${component.sampleCount}`;
  }
  return `暂缺 · 可比样本 n=${component.sampleCount}`;
}

export function renderScoreBreakdown(label, breakdown = {}) {
  const title = escapeHtml(label);
  const components = Array.isArray(breakdown.components) ? breakdown.components : [];
  const availableCount = components.filter((component) => Number.isFinite(component.score)).length;
  const summary = Number.isFinite(breakdown.score)
    ? `${formatNumber(breakdown.score)} / 100`
    : components.length
      ? `暂不汇总 · ${breakdown.availableWeight || 0}/${breakdown.totalWeight || 100} 权重有证据`
      : '等待资格核验';
  const componentRows = components.map((component, index) => `<article class="score-component" style="--score-index:${index}" data-score-component="${escapeHtml(component.key)}">
    <div class="score-component-heading"><strong>${escapeHtml(component.label)}</strong><span>${component.weight}%</span></div>
    <p class="score-component-value">${escapeHtml(componentValue(component))}</p>
    ${component.direction ? `<p class="score-component-direction">${escapeHtml(component.direction)}</p>` : ''}
    ${component.reason ? `<p class="score-component-reason">${escapeHtml(component.reason)}</p>` : ''}
  </article>`).join('');
  const detail = components.length
    ? `<details class="score-breakdown"><summary>查看评分依据 · ${availableCount}/${components.length} 个分项可计算</summary><div class="score-component-list">${componentRows}</div><p class="score-no-reweight">缺失权重不转给其他分项；合成分只在全部权重都有证据时显示。</p></details>`
    : `<p class="score-breakdown-blocked">${escapeHtml(breakdown.reason || '当前没有可计算的评分分项。')}</p>`;

  return `<section class="assistant-score-card" aria-label="${title}评分">
    <div class="assistant-score-heading"><span>${title}</span><strong>${summary}</strong></div>
    ${detail}
  </section>`;
}
