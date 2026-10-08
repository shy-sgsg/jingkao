function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
}

function getStatusLabel(check, position) {
  if (check.status === 'missing') return '待补充个人资料';
  if (check.status === 'match') return '匹配已录入条件';
  if (position.sourceLevel === 'official') return '明确不符合';
  return '与当前收录条件不一致 · 待官方核验';
}

export function renderEligibilityChecks(eligibility, position = {}) {
  const checks = Array.isArray(eligibility?.requirementChecks) ? eligibility.requirementChecks : [];
  const source = position.sourceLevel === 'official' ? '官方来源' : '第三方 / 待核来源';
  const completeness = position.eligibilityComplete === true ? '结构化条件完整' : '完整性未核实';
  const rows = checks.map((check) => {
    const statusClass = check.status === 'match' ? 'match' : check.status === 'missing' ? 'missing' : position.sourceLevel === 'official' ? 'mismatch' : 'review';
    const actual = check.actual === null || check.actual === undefined ? '未填写' : check.actual;
    return `<li class="eligibility-check-row is-${statusClass}"><div class="eligibility-check-copy"><strong>${escapeHtml(check.label)}</strong><span>职位要求：${escapeHtml(check.expected)}</span><small>你的资料：${escapeHtml(actual)}</small></div><span class="eligibility-check-status">${escapeHtml(getStatusLabel(check, position))}</span></li>`;
  }).join('');
  const content = rows || '<p class="eligibility-check-empty">目前没有结构化身份限制记录；这不代表“无限制”。请查看职位条件原文和官方职位表。</p>';
  return `<section class="eligibility-checks" aria-label="已录入资格限制核对"><div class="eligibility-checks-head"><strong>已录入资格限制</strong><span>${source} · ${completeness}</span></div>${rows ? `<ul>${content}</ul>` : content}<p class="eligibility-check-note">“匹配”仅表示与你填写的信息和已录入条件相符，不代表完整报考资格；最终以当年官方职位表为准。</p></section>`;
}
