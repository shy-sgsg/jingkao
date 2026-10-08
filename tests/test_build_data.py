import sys
import unittest
import subprocess
import json
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from scripts.build_data import build_aggregate_evidence, build_aptitude, build_essay, build_score_rows, render_coverage_report


class WorkbookEvidenceTests(unittest.TestCase):
    def test_keeps_2026_qualification_snapshots_scoped_to_the_reported_position_or_unit(self):
        root = Path(__file__).resolve().parents[1]
        sources = json.loads((root / "data" / "source_registry.json").read_text(encoding="utf-8"))
        observations = build_aggregate_evidence(sources)[0]
        snapshot_rows = [row for row in observations if row["sourceId"].startswith("eoffcn-2026-snapshot-")]

        expected = {
            ("821261102", "2025-11-17 18:00", 44, "eoffcn-2026-snapshot-20251117-1800"),
            (None, "2025-11-17 18:00", 9, "eoffcn-2026-snapshot-20251117-1800"),
            ("821261102", "2025-11-18 09:00", 131, "eoffcn-2026-snapshot-20251118-0900"),
            ("821263001", "2025-11-18 09:00", 22, "eoffcn-2026-snapshot-20251118-0900"),
            ("821261102", "2025-11-18 18:00", 275, "eoffcn-2026-snapshot-20251118-1800"),
            ("821263001", "2025-11-18 18:00", 81, "eoffcn-2026-snapshot-20251118-1800"),
            ("821261102", "2025-11-19 09:00", 275, "eoffcn-2026-snapshot-20251119-0900"),
            ("821263001", "2025-11-19 09:00", 95, "eoffcn-2026-snapshot-20251119-0900"),
            ("821261102", "2025-11-19 18:00", 424, "eoffcn-2026-snapshot-20251119-1800"),
            ("821263001", "2025-11-19 18:00", 150, "eoffcn-2026-snapshot-20251119-1800"),
        }
        actual = {
            (row["positionCode"], row["observedAt"], row["applicantsQualified"], row["sourceId"])
            for row in snapshot_rows
        }

        self.assertEqual(actual, expected)
        self.assertEqual(len(snapshot_rows), 10)
        for row in snapshot_rows:
            with self.subTest(source=row["sourceId"], position=row["positionCode"]):
                self.assertEqual(row["year"], 2026)
                self.assertEqual(row["observationType"], "qualified_snapshot")
                self.assertEqual(row["sourceLevel"], "secondary")
                self.assertIsNone(row["applicantsRegistered"])
                self.assertIsNone(row["applicantsPaid"])
                self.assertIsNone(row["applicantsConfirmed"])
                self.assertIsNone(row["actualTestTakers"])
                if row["positionCode"]:
                    self.assertEqual(row["scope"], "position-level")
                else:
                    self.assertEqual(row["scope"], "unit-level")

    def test_2026_annual_reconciliation_keeps_both_secondary_mirror_totals(self):
        root = Path(__file__).resolve().parents[1]
        sources = json.loads((root / "data" / "source_registry.json").read_text(encoding="utf-8"))
        conflicts = build_aggregate_evidence(sources)[1]
        annual = [row for row in conflicts if row.get("year") == 2026]

        for metric, field, expected in [
            ("position_count", "reportedPositionCount", 88),
            ("recruit_count", "reportedRecruitCount", 138),
        ]:
            with self.subTest(metric=metric):
                rows = [row for row in annual if row.get("metric") == metric]
                self.assertEqual(
                    {(row["sourceId"], row["value"]) for row in rows},
                    {("huatu-2026-list", expected), ("gwyzwb-2026-list", expected)},
                )
                self.assertTrue(all(row["level"] == "secondary" for row in rows))

    def test_includes_traceable_secondary_2024_longzeyuan_role_with_degree_specific_major_codes(self):
        root = Path(__file__).resolve().parents[1]
        positions = json.loads((root / "data" / "positions_seed.json").read_text(encoding="utf-8"))
        sources = json.loads((root / "data" / "source_registry.json").read_text(encoding="utf-8"))
        position = next((row for row in positions if row.get("code") == "231259102"), None)
        self.assertIsNotNone(position)
        self.assertEqual(position["year"], 2024)
        self.assertEqual(position["recruitCount"], 2)
        self.assertEqual(
            position["majorText"],
            "本科：政治学类（0302），社会学类（0303），公共管理类（1204）；研究生：政治学（0302），社会学（0303），马克思主义理论（0305），社会工作（0352），公共管理学（1204）",
        )
        self.assertEqual(
            position["majorCriteria"],
            {"undergraduate": ["0302", "0303", "1204"], "graduate": ["0302", "0303", "0305", "0352", "1204"]},
        )
        self.assertEqual(position["sourceLevel"], "secondary")
        self.assertIn("华图列表单位名", position["eligibilityText"])
        self.assertIn("huatu-2024-list", position["sources"])
        self.assertIn("fenbi-2024-longzeyuan", position["sources"])
        self.assertIn("huatu-2024-list", {source["sourceId"] for source in sources})
        self.assertIn("fenbi-2024-longzeyuan", {source["sourceId"] for source in sources})

    def test_2026_longzeyuan_candidate_keeps_graduate_1204_and_1252_separate(self):
        root = Path(__file__).resolve().parents[1]
        positions = json.loads((root / "data" / "positions_seed.json").read_text(encoding="utf-8"))
        position = next(row for row in positions if row.get("code") == "231263802")
        self.assertEqual(position["majorCriteria"]["undergraduate"], ["0301", "1204"])
        self.assertEqual(position["majorCriteria"]["graduate"], ["0301", "0351", "1204", "1252"])

    def test_source_linked_2026_roles_remain_secondary_without_official_verification(self):
        root = Path(__file__).resolve().parents[1]
        positions = json.loads((root / "data" / "positions_seed.json").read_text(encoding="utf-8"))
        sources = json.loads((root / "data" / "source_registry.json").read_text(encoding="utf-8"))
        target_codes = {
            "121262901", "221262201", "221262301", "221262401", "221262601",
            "821263001", "821263101", "241264201", "231264601", "241264202", "241264902",
            "231264401", "231264602",
        }
        matches = {row["code"]: row for row in positions if row.get("code") in target_codes}
        self.assertEqual(set(matches), target_codes)
        self.assertEqual(sum(row["year"] == 2026 for row in positions), 83)
        source_ids = {source["sourceId"] for source in sources}
        for code, position in matches.items():
            with self.subTest(code=code):
                self.assertEqual(position["sourceLevel"], "secondary")
                self.assertFalse(position["eligibilityComplete"])
                self.assertGreater(position["recruitCount"], 0)
                self.assertTrue(position["sources"])
                self.assertTrue(set(position["sources"]).issubset(source_ids))

    def test_imports_all_visible_position_cutoffs_and_only_unique_code_matches(self):
        rows = build_score_rows()
        self.assertEqual(len(rows), 31)
        self.assertEqual(len({row["id"] for row in rows}), 31)
        self.assertEqual(sum(row["mappingConfidence"] == "high" for row in rows), 24)
        self.assertEqual(sum(row["mappingConfidence"] == "ambiguous" for row in rows), 6)
        self.assertEqual(sum(row["mappingConfidence"] == "unmatched" for row in rows), 1)
        self.assertTrue(all(row["positionCode"] is None for row in rows if row["mappingConfidence"] != "high"))
        self.assertEqual({row["orgType"] for row in rows}, {"区直", "街道", "镇"})
        self.assertEqual(min(row["score"] for row in rows), 106.25)
        self.assertEqual(max(row["score"] for row in rows), 139.5)
        self.assertTrue(all(row["sourceId"] == "cgzj-2026-cutoff-sample" for row in rows))

    def test_template_zeroes_are_not_imported_as_completed_practice(self):
        self.assertTrue(all(item["attempted"] is None for item in build_aptitude()))
        self.assertTrue(all(item["completed"] is None for item in build_essay()))


class CoverageReportTests(unittest.TestCase):
    def test_coverage_report_calculates_visible_records_and_keeps_mirror_gaps_nonofficial(self):
        dataset = {
            "dataAsOf": "2026-10-08",
            "coverage": {},
            "positions": [
                {"year": 2026, "code": "A1", "unit": "示例单位", "orgType": "街道", "recruitCount": 1,
                 "majorCriteria": {"undergraduate": ["1204"]}, "requirements": {"graduationStatus": "应届"},
                 "sourceLevel": "secondary", "crossVerified": False},
                {"year": 2026, "code": "A2", "unit": "另一单位", "orgType": "区直", "recruitCount": 2,
                 "majorCriteria": {}, "requirements": {}, "sourceLevel": "secondary", "crossVerified": False},
            ],
            "scoreRows": [
                {"year": 2026, "score": 130, "positionCode": "A1", "mappingConfidence": "high"},
                {"year": 2026, "score": 120, "positionCode": None, "mappingConfidence": "unmatched"},
            ],
            "scoreSamples": [{"year": 2026, "samplePositions": 2, "sampleRecruits": 5,
                              "minimum": 120, "maximum": 130, "sourceId": "score-mirror", "sourceLevel": "secondary"}],
            "observations": [
                {"scope": "position-level", "applicantsQualified": 10, "applicantsRegistered": None},
                {"scope": "unit-level", "applicantsQualified": 4, "applicantsRegistered": None},
            ],
            "sources": [
                {"sourceId": "official-index", "level": "official", "year": 2026},
                {"sourceId": "mirror", "level": "secondary", "year": 2026,
                 "reportedPositionCount": 4, "reportedRecruitCount": 6,
                 "positionUnitReferences": [{"unit": "示例单位", "positionCount": 2, "recruitCount": 3}]},
                {"sourceId": "score-mirror", "level": "secondary", "year": 2026},
            ],
        }

        report = render_coverage_report(dataset)

        self.assertIn("| 2026 | 2 | 3 | 1 / 2 | 0 |", report)
        self.assertIn("| 2026 | 1 / 2 | 1 / 2 | 0 / 2 |", report)
        self.assertIn("2 / 4 岗、3 / 6 人；相差 2 岗 / 3 人（仅二手相对比较，非官方覆盖率）", report)
        self.assertIn("示例单位", report)
        self.assertIn("缺 1 岗 / 2 人", report)
        self.assertIn("COVERAGE: INCOMPLETE", report)
        self.assertIn("具名最低进面分共 2 行（唯一代码关联 1 行）", report)
        self.assertIn("范围观察共 2 条：岗位级 1、单位级 1", report)
        self.assertIn("单位汇总参考来源为 `mirror`", report)
        self.assertNotIn("两处二手汇总均报 88 岗 / 138 人", report)
        self.assertIn("python3 scripts/validate_data.py", report)


class DataValidatorTests(unittest.TestCase):
    def test_validator_separates_structure_from_year_coverage(self):
        root = Path(__file__).resolve().parents[1]
        result = subprocess.run(
            [sys.executable, str(root / "scripts" / "validate_data.py")],
            cwd=root,
            capture_output=True,
            text=True,
            check=False,
        )
        self.assertEqual(result.returncode, 0, result.stderr + result.stdout)
        self.assertIn("STRUCTURE: PASS", result.stdout)
        self.assertIn("COVERAGE: INCOMPLETE", result.stdout)
        self.assertIn("annual official position denominator not verified", result.stdout)

    def test_validator_reports_annual_field_source_and_observation_coverage(self):
        root = Path(__file__).resolve().parents[1]
        result = subprocess.run(
            [sys.executable, str(root / "scripts" / "validate_data.py")],
            cwd=root,
            capture_output=True,
            text=True,
            check=False,
        )
        self.assertEqual(result.returncode, 0, result.stderr + result.stdout)
        self.assertIn(
            "2024 coverage: org type 区直 53, 街道 14, 镇 26, 垂直/驻区 2; "
            "major codes 52/95; structured requirements 0/95; eligibility complete 0/95; "
            "cross verified 0/95; position sources official 0, secondary 95, other 0",
            result.stdout,
        )
        self.assertIn(
            "2026 coverage: org type 区直 55, 街道 10, 镇 18, 垂直/驻区 0; "
            "major codes 59/83; structured requirements 11/83; eligibility complete 0/83; "
            "cross verified 0/83; position sources official 0, secondary 83, other 0",
            result.stdout,
        )
        self.assertIn("Score mappings: high 24, ambiguous 6, unmatched 1 (31 rows)", result.stdout)
        self.assertIn(
            "Observation metric rows: registered 0, qualified 12, paid 0, confirmed 0, actual test takers 0",
            result.stdout,
        )


if __name__ == "__main__":
    unittest.main()
