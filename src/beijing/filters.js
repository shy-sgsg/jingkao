import { evaluateBeijingEligibility } from './eligibility.js';

function beijingNormalizeSearch(value) {
  return String(value ?? '').trim().toLocaleLowerCase('zh-CN');
}

export function filterBeijingPositions(positions, filters = {}, profile = {}, majorCatalog = [], eligibilityCache = null) {
  const rows = Array.isArray(positions) ? positions : [];
  const keyword = beijingNormalizeSearch(filters.keyword);
  const minRecruitCount = filters.minRecruitCount === '' || filters.minRecruitCount === undefined
    ? null : Number(filters.minRecruitCount);
  return rows.filter((position) => {
    if (filters.sourceSheet && position.sourceSheet !== filters.sourceSheet) return false;
    if (filters.workDistrict && position.workDistrict !== filters.workDistrict) return false;
    if (filters.positionAttribute && position.positionAttribute !== filters.positionAttribute) return false;
    if (filters.positionType && position.positionType !== filters.positionType) return false;
    if (filters.positionSubType && position.positionSubType !== filters.positionSubType) return false;
    if (filters.educationRaw && position.educationRaw !== filters.educationRaw) return false;
    if (filters.politicalStatusRaw && position.politicalStatusRaw !== filters.politicalStatusRaw) return false;
    if (filters.existingIdentityRaw && position.existingIdentityRaw !== filters.existingIdentityRaw) return false;
    if (Number.isFinite(minRecruitCount) && Number(position.recruitCount || 0) < minRecruitCount) return false;
    const searchable = beijingNormalizeSearch(position.searchText || [
      position.departmentName, position.positionTitle, position.positionCode,
      position.hiringDepartment, position.workDistrict,
      position.positionAttribute, position.positionType, position.positionSubType,
      position.educationRaw, position.degreeRaw, position.existingIdentityRaw,
      position.politicalStatusRaw, position.ageRaw, position.majorRaw, position.remarkRaw,
    ].join(' '));
    if (keyword && !searchable.includes(keyword)) return false;

    const cached = eligibilityCache?.get(position);
    const eligibility = cached || evaluateBeijingEligibility(position, profile, majorCatalog);
    if (!cached) eligibilityCache?.set(position, eligibility);
    if (filters.qualificationStatus && eligibility.status !== filters.qualificationStatus) return false;
    if (filters.excludeExplicitMismatch && eligibility.status === 'incompatible') return false;
    if (filters.onlyMajorMatch && eligibility.checks.major.status !== 'match') return false;
    return true;
  });
}

export function sortBeijingPositions(positions, sort = 'recruit-desc') {
  return [...(Array.isArray(positions) ? positions : [])].sort((left, right) => {
    if (sort === 'department') return String(left.departmentName || '').localeCompare(String(right.departmentName || ''), 'zh-CN')
      || String(left.positionCode || '').localeCompare(String(right.positionCode || ''));
    if (sort === 'position-code') return String(left.positionCode || '').localeCompare(String(right.positionCode || ''));
    if (sort === 'recruit-asc') return Number(left.recruitCount || 0) - Number(right.recruitCount || 0)
      || String(left.positionCode || '').localeCompare(String(right.positionCode || ''));
    return Number(right.recruitCount || 0) - Number(left.recruitCount || 0)
      || String(left.positionCode || '').localeCompare(String(right.positionCode || ''));
  });
}
