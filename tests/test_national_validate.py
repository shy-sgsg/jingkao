import importlib.util
import json
import os
import sys
import tempfile
import unittest
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
VALIDATOR_PATH = PROJECT_ROOT / 'scripts' / 'national' / 'validate_positions.py'
sys.path.insert(0, str(VALIDATOR_PATH.parent))
SPEC = importlib.util.spec_from_file_location('national_validate_positions', VALIDATOR_PATH)
validator = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(validator)

SOURCE = Path(os.environ.get(
    'NATIONAL_SOURCE_XLS',
    str(PROJECT_ROOT.parent / '国考' / '中央机关及其直属机构2027年度考试录用公务员招考简章.xls'),
))
POSITIONS = PROJECT_ROOT / 'public' / 'national' / 'positions-2027.json'
METADATA = PROJECT_ROOT / 'public' / 'national' / 'metadata-2027.json'
AUDIT = PROJECT_ROOT / 'research' / 'national' / '2027_data_audit.md'


class NationalDataValidationTests(unittest.TestCase):
    def test_published_source_metadata_uses_the_filename_without_a_local_path(self):
        metadata = json.loads(METADATA.read_text(encoding='utf-8'))
        audit = AUDIT.read_text(encoding='utf-8')
        self.assertNotIn('sourcePathAtImport', metadata)
        self.assertEqual(metadata['sourceFile'], '中央机关及其直属机构2027年度考试录用公务员招考简章.xls')
        self.assertIn(f"- 用户指定来源文件：`{metadata['sourceFile']}`", audit)
        self.assertNotIn(str(SOURCE), audit)

    @unittest.skipUnless(SOURCE.is_file(), 'source workbook is not available in this checkout')
    def test_generated_dataset_matches_every_source_cell_and_metadata_total(self):
        report = validator.validate_files(SOURCE, POSITIONS, METADATA)
        self.assertEqual(report['positionCount'], 19426)
        self.assertEqual(report['recruitCountTotal'], 35691)
        self.assertEqual(report['rawFieldMismatches'], 0)

    @unittest.skipUnless(SOURCE.is_file(), 'source workbook is not available in this checkout')
    def test_validation_rejects_a_modified_official_raw_field(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            tampered = Path(temp_dir) / 'positions.json'
            positions = json.loads(POSITIONS.read_text(encoding='utf-8'))
            positions[0]['rawFields']['备注'] = 'edited'
            tampered.write_text(json.dumps(positions, ensure_ascii=False), encoding='utf-8')
            with self.assertRaisesRegex(ValueError, 'rawFields|原始字段|一致'):
                validator.validate_files(SOURCE, tampered, METADATA)


if __name__ == '__main__':
    unittest.main()
