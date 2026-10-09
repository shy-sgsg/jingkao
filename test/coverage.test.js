import test from 'node:test';
import assert from 'node:assert/strict';
import * as coverage from '../src/data/coverage.js';
const { summarizePositionCoverage } = coverage;

test('home coverage spotlight labels mirror totals as references, not verified coverage', () => {
  assert.equal(typeof coverage.getCoverageSpotlight, 'function', 'the home should have a data-backed coverage summary');
  const result = coverage.getCoverageSpotlight({
    positions: [
      { year: 2026, recruitCount: 2 },
      { year: 2026, recruitCount: 1 },
    ],
    sources: [{
      sourceId: 'mirror-2026',
      year: 2026,
      level: 'secondary',
      reportedPositionCount: 4,
      reportedRecruitCount: 8,
    }],
  }, 2026);

  assert.deepEqual(result, {
    year: 2026,
    importedPositions: 2,
    referencePositions: 4,
    importedRecruits: 3,
    referenceRecruits: 8,
    positionRatio: 0.5,
    recruitRatio: 3 / 8,
    sourceId: 'mirror-2026',
    verified: false,
  });
});

test('citywide secondary totals never become district coverage denominators', () => {
  const result = coverage.getCoverageSpotlight({
    positions: [{ year: 2026, recruitCount: 2 }],
    sources: [
      { sourceId: 'fenbi-citywide', year: 2026, level: 'secondary', geographicScope: 'citywide',
        reportedPositionCount: 1690, reportedRecruitCount: 3694 },
      { sourceId: 'changping-mirror', year: 2026, level: 'secondary', geographicScope: 'district',
        reportedPositionCount: 88, reportedRecruitCount: 138 },
    ],
  }, 2026);

  assert.equal(result.referencePositions, 88);
  assert.equal(result.referenceRecruits, 138);
  assert.equal(result.sourceId, 'changping-mirror');
});

test('home coverage spotlight keeps unavailable denominators null', () => {
  assert.equal(typeof coverage.getCoverageSpotlight, 'function', 'the home should have a data-backed coverage summary');
  const result = coverage.getCoverageSpotlight({ positions: [{ year: 2026, recruitCount: null }] }, 2026);

  assert.equal(result.referencePositions, null);
  assert.equal(result.referenceRecruits, null);
  assert.equal(result.positionRatio, null);
  assert.equal(result.recruitRatio, null);
  assert.equal(result.verified, false);
});

test('coverage reports visible examples without inventing an annual denominator', () => {
  const rows = summarizePositionCoverage({
    positions: [
      { year: 2024, recruitCount: 1 },
      { year: 2025, recruitCount: null },
      { year: 2026, recruitCount: 2 },
    ],
    scoreRows: [{ year: 2026, positionCode: null }, { year: 2026, positionCode: null }],
    scoreSamples: [{ year: 2026, samplePositions: 31, complete: false, scope: 'partial' }],
  });
  assert.deepEqual(rows.map((row) => row.year), [2024, 2025, 2026]);
  assert.equal(rows[0].visiblePositions, 1);
  assert.equal(rows[0].knownRecruitCount, 1);
  assert.equal(rows[0].coverageRate, null);
  assert.equal(rows[0].status, 'INCOMPLETE');
});

test('unknown recruitment counts stay unknown and score sources remain separate', () => {
  const [row] = summarizePositionCoverage({
    positions: [{ year: 2025, recruitCount: null }],
    scoreRows: [{ year: 2025, score: 130, positionCode: null }],
    scoreSamples: [{ year: 2025, samplePositions: 9, complete: false }],
  }, [2025]);
  assert.equal(row.visiblePositions, 1);
  assert.equal(row.knownRecruitCount, 0);
  assert.equal(row.unknownRecruitPositions, 1);
  assert.equal(row.namedScoreExamples, 1);
  assert.equal(row.rangeSamples[0].reportedPositions, 9);
  assert.equal(row.status, 'INCOMPLETE');
});

test('secondary annual totals can contextualize intake without becoming official coverage', () => {
  const [row] = summarizePositionCoverage({
    positions: [{ year: 2026, recruitCount: 2 }, { year: 2026, recruitCount: null }],
    scoreRows: [],
    scoreSamples: [],
    sources: [{
      sourceId: 'huatu-2026-list',
      year: 2026,
      level: 'secondary',
      reportedPositionCount: 4,
      reportedRecruitCount: 7,
    }],
  }, [2026]);

  assert.deepEqual(row.secondaryReference, {
    sourceId: 'huatu-2026-list',
    reportedPositionCount: 4,
    reportedRecruitCount: 7,
    visiblePositionRatio: 0.5,
    knownRecruitRatio: 2 / 7,
  });
  assert.equal(row.coverageRate, null);
  assert.equal(row.status, 'INCOMPLETE');
});

test('district-scoped mirrors compare only positions assigned to the same district', () => {
  const [row] = summarizePositionCoverage({
    districts: [
      { id: 'changping', name: '昌平区' },
      { id: 'shijingshan', name: '石景山区' },
    ],
    positions: [
      { year: 2024, districtId: 'changping', recruitCount: 2 },
      { year: 2024, districtId: 'shijingshan', recruitCount: 3, sources: ['shijingshan-list'] },
      { year: 2024, districtId: null, recruitCount: 1, sources: ['changping-org-list'] },
    ],
    sources: [
      {
        sourceId: 'changping-mirror',
        year: 2024,
        level: 'secondary',
        geographicScope: '昌平区',
        reportedPositionCount: 95,
        reportedRecruitCount: 197,
      },
      { sourceId: 'shijingshan-list', title: '2024石景山区职位页', geographicScope: '石景山区' },
      { sourceId: 'changping-org-list', title: '京考职位网昌平职位明细' },
    ],
  }, [2024]);

  assert.equal(row.visiblePositions, 2);
  assert.equal(row.knownRecruitCount, 3);
  assert.equal(row.secondaryReference.visiblePositionRatio, 2 / 95);
  assert.equal(row.secondaryReference.knownRecruitRatio, 3 / 197);
});

test('coverage identifies unit-level position gaps from explicitly secondary references', () => {
  const [row] = summarizePositionCoverage({
    positions: [
      { year: 2026, unit: '北京市昌平区百善镇', recruitCount: 1 },
      { year: 2026, unit: '北京市昌平区延寿镇', recruitCount: 1 },
    ],
    sources: [{
      sourceId: 'huatu-2026-list',
      year: 2026,
      level: 'secondary',
      reportedPositionCount: 88,
      reportedRecruitCount: 138,
      positionUnitReferences: [
        { unit: '北京市昌平区人力资源和社会保障局', positionCount: 3, recruitCount: 6 },
        { unit: '北京市昌平区百善镇', positionCount: 2, recruitCount: 2 },
        { unit: '北京市昌平区延寿镇', positionCount: 2, recruitCount: 2 },
      ],
    }],
  }, [2026]);

  assert.deepEqual(row.unitGaps, [
    {
      unit: '北京市昌平区人力资源和社会保障局',
      importedPositions: 0,
      reportedPositions: 3,
      missingPositions: 3,
      importedRecruits: 0,
      reportedRecruits: 6,
      missingRecruits: 6,
    },
    {
      unit: '北京市昌平区百善镇',
      importedPositions: 1,
      reportedPositions: 2,
      missingPositions: 1,
      importedRecruits: 1,
      reportedRecruits: 2,
      missingRecruits: 1,
    },
    {
      unit: '北京市昌平区延寿镇',
      importedPositions: 1,
      reportedPositions: 2,
      missingPositions: 1,
      importedRecruits: 1,
      reportedRecruits: 2,
      missingRecruits: 1,
    },
  ]);
  assert.equal(row.coverageRate, null);
  assert.equal(row.status, 'INCOMPLETE');
});

test('unknown recruit counts prevent a fabricated unit recruit gap', () => {
  const [row] = summarizePositionCoverage({
    positions: [{ year: 2026, unit: '北京市昌平区百善镇', recruitCount: null }],
    sources: [{
      sourceId: 'mirror-2026',
      year: 2026,
      level: 'secondary',
      reportedPositionCount: 2,
      reportedRecruitCount: 2,
      positionUnitReferences: [{ unit: '北京市昌平区百善镇', positionCount: 2, recruitCount: 2 }],
    }],
  }, [2026]);

  assert.equal(row.unitGaps[0].missingPositions, 1);
  assert.equal(row.unitGaps[0].missingRecruits, null);
});

test('position completeness grades count only exact job evidence and explain missing sections', () => {
  assert.equal(typeof coverage.getPositionDataCompleteness, 'function', 'each position should expose a data-completeness grade');
  if (typeof coverage.getPositionDataCompleteness !== 'function') return;

  const position = {
    year: 2026,
    code: 'P-1',
    unit: '示例单位',
    title: '综合岗',
    orgType: '区直',
    jobType: '综合管理',
    recruitCount: 1,
    education: '本科及以上',
    majorText: '不限',
    eligibilityComplete: true,
    sourceLevel: 'official',
    sources: ['official-position'],
  };
  const source = { sourceId: 'official-position', level: 'official' };
  const score = {
    year: 2026,
    unit: '示例单位',
    title: '综合岗',
    positionCode: 'P-1',
    mappingConfidence: 'high',
    score: 120,
  };
  const registration = { year: 2026, positionCode: 'P-1', applicantsQualified: 0 };

  assert.deepEqual(coverage.getPositionDataCompleteness(position, {
    sources: [source], scoreRows: [score], observations: [registration],
  }), { grade: '完整', availableSections: 8, totalSections: 8, missingSections: [] });

  const withoutRegistration = coverage.getPositionDataCompleteness(position, {
    sources: [source], scoreRows: [score], observations: [],
  });
  assert.deepEqual(withoutRegistration, {
    grade: '较完整', availableSections: 7, totalSections: 8,
    missingSections: ['岗位级报名观察'],
  });

  const partial = coverage.getPositionDataCompleteness({ ...position, eligibilityComplete: false }, {
    sources: [source],
    scoreRows: [{ ...score, positionCode: null, mappingConfidence: 'ambiguous' }],
    observations: [{ year: 2026, positionCode: null, scope: 'district', applicantsQualified: 500 }],
  });
  assert.deepEqual(partial, {
    grade: '部分', availableSections: 5, totalSections: 8,
    missingSections: ['资格条件完整核验', '岗位级报名观察', '岗位级进面线'],
  });

  const severe = coverage.getPositionDataCompleteness({ ...position, recruitCount: null, education: null, majorText: null, eligibilityComplete: false }, {
    sources: [source], scoreRows: [], observations: [],
  });
  assert.deepEqual(severe, {
    grade: '严重缺失', availableSections: 3, totalSections: 8,
    missingSections: ['招录人数', '学历与专业', '资格条件完整核验', '岗位级报名观察', '岗位级进面线'],
  });

  const missingYear = coverage.getPositionDataCompleteness({ ...position, year: null }, {
    sources: [source], scoreRows: [score], observations: [registration],
  });
  assert.deepEqual(missingYear, {
    grade: '严重缺失', availableSections: 5, totalSections: 8,
    missingSections: ['职位基本信息', '岗位级报名观察', '岗位级进面线'],
  });
});
