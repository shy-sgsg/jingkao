import importlib.util
import os
import unittest
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
IMPORTER_PATH = PROJECT_ROOT / 'scripts' / 'national' / 'import_positions.py'
SPEC = importlib.util.spec_from_file_location('national_import_positions', IMPORTER_PATH)
importer = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(importer)

SOURCE = Path(os.environ.get(
    'NATIONAL_SOURCE_XLS',
    str(PROJECT_ROOT.parent / '国考' / '中央机关及其直属机构2027年度考试录用公务员招考简章.xls'),
))


def raw_record(**overrides):
    row = {field: '' for field in importer.SOURCE_FIELDS}
    row.update({
        '部门代码': '002000', '部门名称': '测试部门', '用人司局': '测试司',
        '机构性质': '中央党群机关', '招考职位': '一级主任科员及以下',
        '职位代码': '100110001001', '考试类别': '行政执法类', '招考人数': '2',
        '专业': '本科：1204公共管理类', '学历': '本科及以上', '学位': '学士',
        '政治面貌': '不限', '基层工作最低年限': '无限制',
        '服务基层项目工作经历': '无限制',
        '工作地点': '北京市朝阳区', '备注': '咨询电话：01012345678。',
    })
    row.update(overrides)
    return row


class NationalImportTests(unittest.TestCase):
    def test_normalized_position_preserves_every_source_field_and_string_codes(self):
        row = raw_record()
        position = importer.normalize_position(row, '中央党群机关', 3, 'source.xls', 1)

        self.assertEqual(position['id'], 'national:2027:002000:100110001001')
        self.assertEqual(position['departmentCode'], '002000')
        self.assertEqual(position['positionCode'], '100110001001')
        self.assertEqual(position['recruitCount'], 2)
        self.assertEqual(position['majorRaw'], row['专业'])
        self.assertEqual(position['remarkRaw'], row['备注'])
        self.assertEqual(position['rawFields'], row)
        self.assertEqual(set(position['rawFields']), set(importer.SOURCE_FIELDS))

    def test_location_parser_keeps_uncertain_source_text_without_inventing_a_region(self):
        parsed = importer.parse_work_location('北京市朝阳区')
        self.assertEqual(parsed['workProvince'], '北京市')
        self.assertEqual(parsed['workCity'], '北京市')
        self.assertEqual(parsed['workDistrict'], '朝阳区')
        self.assertEqual(parsed['locationStatus'], 'normalized')

        unknown = importer.parse_work_location('境外及其他工作地点')
        self.assertIsNone(unknown['workProvince'])
        self.assertEqual(unknown['workLocation'], '境外及其他工作地点')
        self.assertEqual(unknown['locationStatus'], 'manual-review')

    def test_invalid_required_fields_fail_instead_of_silently_dropping_rows(self):
        with self.assertRaisesRegex(ValueError, '职位代码'):
            importer.normalize_position(raw_record(**{'职位代码': ''}), '中央党群机关', 4, 'source.xls', 1)
        with self.assertRaisesRegex(ValueError, '招考人数'):
            importer.normalize_position(raw_record(**{'招考人数': '待定'}), '中央党群机关', 4, 'source.xls', 1)

    @unittest.skipUnless(SOURCE.is_file(), 'official source workbook is not available in this checkout')
    def test_supplied_workbook_reconciles_all_four_sheets_and_recruitment_total(self):
        imported = importer.read_workbook(SOURCE)
        self.assertEqual(imported['sheetCounts'], {
            '中央党群机关': 99,
            '中央国家行政机关（本级）': 312,
            '中央国家行政机关省级以下直属机构': 18193,
            '中央国家行政机关参照公务员法管理事业单位': 822,
        })
        self.assertEqual(len(imported['positions']), 19426)
        self.assertEqual(imported['recruitCountTotal'], 35691)
        self.assertEqual(imported['duplicateIds'], [])
        self.assertEqual(imported['positions'][0]['departmentCode'], '002000')
        self.assertEqual(imported['positions'][0]['positionCode'], '100110001001')
        self.assertEqual(imported['blankRemarkCount'], 254)
        self.assertEqual(imported['missingMajorCount'], 0)
        self.assertEqual(imported['missingEducationCount'], 0)
        self.assertEqual(imported['locationProvinceMissCount'], 0)


if __name__ == '__main__':
    unittest.main()
