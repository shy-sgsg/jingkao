import { evaluateNationalEligibility } from './eligibility.js';

const normalize = (value) => String(value ?? '').trim().toLocaleLowerCase('zh-CN');
const selections = (value) => Array.isArray(value) ? value.map(String).filter(Boolean) : [];

function searchableText(position) {
  return normalize(position.searchText || [
    position.departmentCode, position.departmentName, position.organizationName,
    position.positionCode, position.positionTitle, position.workLocation,
    position.majorRaw, position.educationRaw, position.degreeRaw,
    position.politicalStatusRaw, position.experienceRaw, position.serviceProjectRaw,
    position.remarkRaw, position.examCategory,
  ].join(' '));
}

function matchesSelection(selected, value) {
  return selected.length === 0 || selected.includes(String(value ?? ''));
}

function hasAnyProfileValue(profile) {
  const keys = [
    'undergraduateMajor', 'undergraduateMajorCode', 'graduateMajor', 'graduateMajorCode',
    'degree', 'degreeTitle', 'politicalStatus', 'graduationStatus', 'graduationYear',
    'grassrootsYears', 'grassrootsProjectStatus',
  ];
  return keys.some((key) => String(profile?.[key] ?? '').trim());
}

function isMaleOnly(position) {
  const rawFields = position.rawFields && typeof position.rawFields === 'object'
    ? Object.entries(position.rawFields) : [];
  const sources = [
    position.remarkRaw, position.freshGraduateRaw, position.positionDescription,
    position.positionAttribute, position.positionDistribution, position.majorRaw,
    position.educationRaw, position.degreeRaw, position.politicalStatusRaw,
    position.experienceRaw, position.serviceProjectRaw,
    ...rawFields.map(([, value]) => value),
  ].map((value) => String(value || '')).filter(Boolean);
  const maleLimit = /(?<!不)(?:仅限|只限|仅招|只招|限于|限)\s*(?:男性|男生|男)(?!优先|和女性|或女性|、女性|女性均可|男女不限)(?:报考|报名|应聘)?/u;
  const bothAllowed = /(?:男女不限|不限男女|男女均可|男性(?:和|或|、|\/)女性(?:均可|皆可)(?:报考|报名)?|男生(?:和|或|、|\/)女生(?:均可|皆可)(?:报考|报名)?)/u;
  if (sources.some((source) => maleLimit.test(source) && !bothAllowed.test(source))) return true;

  const separateGenderRequirement = /(?:^|[\s，,、；;。:：/（）()])(?:男性|男生|男)(?=$|[\s，,、；;。:：/（）()])/u;
  const genderRequirementSources = [
    position.freshGraduateRaw,
    ...rawFields.filter(([field]) => /要求|条件|资格|备注/u.test(field)).map(([, value]) => value),
  ];
  return genderRequirementSources.some((value) => {
    const source = String(value || '');
    return !/(?:女性|女生)/u.test(source) && separateGenderRequirement.test(source);
  });
}

function matchesPublicAdministrationMajor(position) {
  const raw = String(position.majorRaw || '');
  if (/管理学类?|公共管理|土地资源管理/u.test(raw)) return true;
  const codes = [...raw.matchAll(/(?:^|[^\d])(\d{2,6})(?=$|[^\d])/gu)].map((match) => match[1]);
  return codes.some((code) => code.startsWith('12'));
}

export function filterNationalPositions(positions, filters = {}, profile = null, eligibilityCache = null) {
  const rows = Array.isArray(positions) ? positions : [];
  const keyword = normalize(filters.keyword);
  const majorQuery = normalize(filters.majorQuery);
  const departmentQuery = normalize(filters.departmentQuery);
  const departmentQueries = selections(filters.departmentQueries).map(normalize).filter(Boolean);
  const workProvinces = selections(filters.workProvinces);
  const workCities = selections(filters.workCities);
  const workDistricts = selections(filters.workDistricts);
  const departments = selections(filters.departments);
  const sourceSheets = selections(filters.sourceSheets);
  const educationRequirements = selections(filters.educationRequirements);
  const educationLevels = selections(filters.educationLevels);
  const degrees = selections(filters.degrees);
  const politicalStatuses = selections(filters.politicalStatuses);
  const grassrootsRequirements = selections(filters.grassrootsRequirements);
  const examCategories = selections(filters.examCategories);
  const qualificationStatuses = selections(filters.qualificationStatuses);
  const hasProfile = hasAnyProfileValue(profile);
  const minRecruitCount = Number.isFinite(Number(filters.minRecruitCount)) && filters.minRecruitCount !== ''
    ? Number(filters.minRecruitCount) : null;
  const maxRecruitCount = Number.isFinite(Number(filters.maxRecruitCount)) && filters.maxRecruitCount !== ''
    ? Number(filters.maxRecruitCount) : null;

  return rows.filter((position) => {
    if (filters.excludeMaleOnly && isMaleOnly(position)) return false;
    if (filters.majorPreset === 'public-administration' && !matchesPublicAdministrationMajor(position)) return false;
    if (workProvinces.length && !workProvinces.includes(String(position.workProvince || ''))) return false;
    if (workCities.length && !workCities.includes(String(position.workCity || ''))) return false;
    if (workDistricts.length && !workDistricts.includes(String(position.workDistrict || ''))) return false;
    if (departments.length && !departments.includes(String(position.departmentName || ''))) return false;
    const hiringUnitText = normalize([position.departmentCode, position.departmentName, position.organizationName].join(' '));
    if (departmentQuery && !hiringUnitText.includes(departmentQuery)) return false;
    if (departmentQueries.length && !departmentQueries.some((query) => hiringUnitText.includes(query))) return false;
    if (sourceSheets.length && !sourceSheets.includes(String(position.sourceSheet || ''))) return false;
    if (educationRequirements.length && !educationRequirements.includes(String(position.educationRaw || ''))) return false;
    if (educationLevels.length && !educationLevels.some((level) => normalize(position.educationRaw).includes(normalize(level)))) return false;
    if (degrees.length && !degrees.includes(String(position.degreeRaw || ''))) return false;
    if (politicalStatuses.length && !politicalStatuses.includes(String(position.politicalStatusRaw || ''))) return false;
    if (grassrootsRequirements.length && !grassrootsRequirements.includes(String(position.experienceRaw || ''))) return false;
    if (examCategories.length && !examCategories.includes(String(position.examCategory || ''))) return false;
    if (minRecruitCount !== null && Number(position.recruitCount) < minRecruitCount) return false;
    if (maxRecruitCount !== null && Number(position.recruitCount) > maxRecruitCount) return false;
    if (filters.onlyRecruitAtLeastTwo && Number(position.recruitCount) < 2) return false;

    if (filters.hasProfessionalTest === true && !/是|有/u.test(String(position.professionalTestRaw || ''))) return false;
    if (filters.hasProfessionalTest === false && /是|有/u.test(String(position.professionalTestRaw || ''))) return false;
    const cleanedRemark = String(position.remarkRaw || '').replace(/咨询电话[：:]\s*[\d\-、，,\s]+[。；;]?/gu, '').trim();
    const hasMeaningfulRemark = Boolean(cleanedRemark && !/^无[。.]?$/u.test(cleanedRemark));
    const specialRequirement = position.specialRequirementStatus
      ? position.specialRequirementStatus === 'manual-review'
      : Boolean(hasMeaningfulRemark
        || (String(position.serviceProjectRaw || '').trim() && !/不限|无限制|无要求/u.test(String(position.serviceProjectRaw))));
    if (filters.hasSpecialRequirement === true && !specialRequirement) return false;
    if (filters.hasSpecialRequirement === false && specialRequirement) return false;
    if (filters.onlyUnrestrictedMajor && !/不限专业|专业不限|不限制专业/u.test(String(position.majorRaw || ''))) return false;

    if (keyword && !searchableText(position).includes(keyword)) return false;
    if (majorQuery && !normalize(position.majorRaw).includes(majorQuery)) return false;

    let eligibility = null;
    const eligibilityFor = () => {
      if (eligibility) return eligibility;
      eligibility = eligibilityCache?.get(position) || evaluateNationalEligibility(position, profile || {});
      eligibilityCache?.set(position, eligibility);
      return eligibility;
    };
    if (hasProfile) {
      const result = eligibilityFor();
      if (qualificationStatuses.length && !qualificationStatuses.includes(result.status)) return false;
      if (filters.excludeMajorMismatch && result.checks.major.status === 'mismatch') return false;
      if (filters.excludeEducationMismatch && result.checks.education.status === 'mismatch') return false;
      if (filters.excludePoliticalMismatch && result.checks.politicalStatus.status === 'mismatch') return false;
      if (filters.excludeGrassrootsMismatch && result.checks.grassrootsExperience.status === 'mismatch') return false;
      if (filters.excludeExplicitMismatch && result.status === 'incompatible') return false;
      if (filters.excludeNeedsReview && result.status === 'needsReview') return false;
      if (filters.onlyInitialMatch && result.status !== 'initialMatch') return false;
    } else if (qualificationStatuses.length && !qualificationStatuses.includes('incomplete')) {
      return false;
    }

    if (filters.excludeSpecialReview) {
      const specialStatus = hasProfile ? eligibilityFor().checks.specialRequirements.status : null;
      if (specialRequirement && (!specialStatus || ['review', 'missing'].includes(specialStatus))) return false;
    }

    if (filters.onlyWithCompleteRawFields
      && ['departmentCode', 'positionCode', 'positionTitle', 'workLocation', 'majorRaw', 'educationRaw',
        'degreeRaw', 'politicalStatusRaw', 'experienceRaw', 'serviceProjectRaw', 'professionalTestRaw']
        .some((key) => !String(position[key] ?? '').trim())) return false;
    return true;
  });
}

export function sortNationalPositions(positions, sort = 'recruit-desc') {
  return [...(Array.isArray(positions) ? positions : [])].sort((left, right) => {
    if (sort === 'department') return String(left.departmentName || '').localeCompare(String(right.departmentName || ''), 'zh-CN')
      || String(left.positionCode || '').localeCompare(String(right.positionCode || ''));
    if (sort === 'location' || sort === 'province') return String(left.workLocation || left.workProvince || '')
      .localeCompare(String(right.workLocation || right.workProvince || ''), 'zh-CN')
      || String(left.positionCode || '').localeCompare(String(right.positionCode || ''));
    if (sort === 'position-code') return String(left.positionCode || '').localeCompare(String(right.positionCode || ''));
    if (sort === 'title') return String(left.positionTitle || '').localeCompare(String(right.positionTitle || ''), 'zh-CN')
      || String(left.positionCode || '').localeCompare(String(right.positionCode || ''));
    if (sort === 'recruit-asc') return Number(left.recruitCount) - Number(right.recruitCount)
      || String(left.positionCode || '').localeCompare(String(right.positionCode || ''));
    return Number(right.recruitCount) - Number(left.recruitCount)
      || String(left.positionCode || '').localeCompare(String(right.positionCode || ''));
  });
}
