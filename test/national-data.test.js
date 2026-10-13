import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const dataUrl = new URL('../public/national/positions-2027.json', import.meta.url);
const metadataUrl = new URL('../public/national/metadata-2027.json', import.meta.url);
const expectedRawFields = [
  '部门代码', '部门名称', '用人司局', '机构性质', '招考职位', '职位属性', '职位分布', '职位简介',
  '职位代码', '机构层级', '考试类别', '招考人数', '专业', '学历', '学位', '政治面貌',
  '基层工作最低年限', '服务基层项目工作经历', '是否在面试阶段组织专业能力测试', '面试人员比例',
  '工作地点', '落户地点', '备注', '部门网站', '咨询电话1', '咨询电话2', '咨询电话3',
];

test('published 2027 National dataset reconciles raw rows, identifiers, counts, and province totals', async () => {
  const positions = JSON.parse(await readFile(dataUrl, 'utf8'));
  const metadata = JSON.parse(await readFile(metadataUrl, 'utf8'));

  assert.equal(positions.length, 19426);
  assert.equal(metadata.positionCount, 19426);
  assert.equal(metadata.recruitCountTotal, 35691);
  assert.deepEqual(metadata.sheetCounts, {
    '中央党群机关': 99,
    '中央国家行政机关（本级）': 312,
    '中央国家行政机关省级以下直属机构': 18193,
    '中央国家行政机关参照公务员法管理事业单位': 822,
  });
  assert.equal(positions.reduce((sum, position) => sum + position.recruitCount, 0), 35691);
  assert.equal(new Set(positions.map((position) => position.id)).size, positions.length);
  assert.equal(positions[0].id, 'national:2027:002000:100110001001');
  assert.equal(positions[0].departmentCode, '002000');
  assert.equal(positions[0].positionCode, '100110001001');
  assert.equal(positions[0].rawFields['专业'], positions[0].majorRaw);
  assert.equal(positions[0].rawFields['备注'], positions[0].remarkRaw);
  assert.deepEqual(Object.keys(positions[0].rawFields), expectedRawFields);
  assert.ok(positions.every((position) => position.examType === 'national' && position.year === 2027));
  assert.ok(positions.every((position) => position.workProvince && position.locationStatus === 'normalized'));
  assert.equal(positions.filter((position) => !position.remarkRaw.trim()).length, 254);
  assert.equal(positions.filter((position) => !position.majorRaw.trim()).length, 0);
  assert.equal(positions.filter((position) => !position.educationRaw.trim()).length, 0);
  assert.equal(positions[0].registrationCount, null);
  assert.equal(positions[0].minimumInterviewScore, null);
  assert.equal(metadata.provinceCounts['北京市'], 675);
  assert.equal(metadata.provinceRecruitCounts['北京市'], 1291);
  assert.equal(metadata.provinceCounts['湖北省'], 791);
  assert.equal(metadata.provinceRecruitCounts['湖北省'], 1566);
  assert.equal(Object.values(metadata.provinceCounts).reduce((sum, count) => sum + count, 0), 19426);
  assert.equal(Object.values(metadata.provinceRecruitCounts).reduce((sum, count) => sum + count, 0), 35691);
});
