#!/usr/bin/env python3
"""Convert the supplied 2027 Beijing exam .xls workbook to static site data.

Install the parser with:
    python -m pip install -r scripts/beijing/requirements.txt
Run with:
    python scripts/beijing/import_positions.py --source-dir /path/to/北京市考
"""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path

import xlrd


PROJECT_ROOT = Path(__file__).resolve().parents[2]
OUTPUT_ROOT = PROJECT_ROOT / "public" / "beijing"
POSITION_FILE = "P020261109404659110579.xls"
GUIDE_FILE = "P020261109404659566645.docx"
DISTRICTS = [
    "东城区", "西城区", "朝阳区", "丰台区", "石景山区", "海淀区", "门头沟区", "房山区",
    "通州区", "顺义区", "昌平区", "大兴区", "怀柔区", "平谷区", "密云区", "延庆区",
]


def cell_text(value: object) -> str:
    if value is None:
        return ""
    if isinstance(value, float) and value.is_integer():
        return str(int(value))
    return str(value).strip()


def write_json(path: Path, value: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="\n") as handle:
        json.dump(value, handle, ensure_ascii=False, indent=2)
        handle.write("\n")


def district_for(unit_name: str) -> str:
    for district in DISTRICTS:
        if district in unit_name:
            return district
    return "北京市本级"


def age_text(value: str) -> str:
    chunks = re.findall(r"[^；;。\n]*(?:年龄|周岁)[^；;。\n]*", value)
    return "；".join(chunk.strip(" ，,") for chunk in chunks if chunk.strip(" ，,"))


def import_positions(source_root: Path) -> tuple[list[dict[str, object]], list[dict[str, object]]]:
    source_path = source_root / POSITION_FILE
    if not source_path.exists():
        raise FileNotFoundError(source_path)

    workbook = xlrd.open_workbook(source_path, on_demand=True)
    positions: list[dict[str, object]] = []
    sheets: list[dict[str, object]] = []
    seen_codes: set[str] = set()

    for sheet in workbook.sheets():
        headers = [cell_text(sheet.cell_value(1, col)).replace("\n", "").replace("\r", "")
                   for col in range(sheet.ncols)]
        sheet_positions: list[dict[str, object]] = []
        for row_index in range(2, sheet.nrows):
            raw = {
                header: cell_text(sheet.cell_value(row_index, col))
                for col, header in enumerate(headers) if header
            }
            code = raw.get("职位代码", "")
            if not code or not raw.get("职位名称"):
                continue
            if code in seen_codes:
                raise ValueError(f"职位代码重复：{code}（工作表 {sheet.name}，第 {row_index + 1} 行）")
            seen_codes.add(code)

            try:
                recruit_count: int | None = int(raw.get("招考人数", ""))
            except ValueError:
                recruit_count = None
            organization = raw.get("单位名称", "")
            hiring_department = raw.get("用人部门", "")
            condition_text = "；".join(filter(None, [raw.get("其它条件", ""), raw.get("备注", "")]))
            experience = raw.get("基层工作经历最低年限", "")
            position = {
                "id": f"beijing:2027:{code}",
                "positionCode": code,
                "positionTitle": raw.get("职位名称", ""),
                "departmentName": organization,
                "hiringDepartment": hiring_department,
                "organizationName": organization,
                "sourceSheet": sheet.name,
                "sourceRow": row_index + 1,
                "positionAttribute": raw.get("机构性质", ""),
                "positionType": raw.get("职位类别", ""),
                "positionSubType": raw.get("职位层级", ""),
                "recruitCount": recruit_count,
                "educationRaw": raw.get("学历要求", ""),
                "degreeRaw": raw.get("学位要求", ""),
                "existingIdentityRaw": experience,
                "freshGraduateRaw": experience if "应届" in experience else "",
                "grassrootsRequirementRaw": experience,
                "politicalStatusRaw": raw.get("政治面貌", ""),
                "ethnicityRaw": "",
                "ageRaw": age_text(condition_text),
                "majorRaw": raw.get("专业要求", ""),
                "positionDescription": raw.get("职位简介", ""),
                "professionalTestRaw": raw.get("是否组织专业能力测试", ""),
                "physicalTestRaw": "是" if "体能测评" in condition_text else "",
                "psychologicalTestRaw": "是" if "心理测试" in condition_text or "心理测评" in condition_text else "",
                "specialRequirementRaw": condition_text,
                "remarkRaw": raw.get("备注", ""),
                "otherConditionsRaw": raw.get("其它条件", ""),
                "workProvince": "北京市",
                "workCity": "北京市",
                "workDistrict": district_for(organization),
                "workLocation": district_for(organization),
                "searchText": " ".join(value for value in raw.values() if value),
                "rawFields": raw,
            }
            positions.append(position)
            sheet_positions.append(position)

        sheets.append({
            "name": sheet.name,
            "positionCount": len(sheet_positions),
            "recruitCount": sum(int(item["recruitCount"] or 0) for item in sheet_positions),
        })

    workbook.release_resources()
    return positions, sheets


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source-dir", type=Path, required=True, help="包含 2027 职位表与报考指南的目录")
    args = parser.parse_args()
    positions, sheets = import_positions(args.source_dir)
    metadata = {
        "examType": "beijing",
        "year": 2027,
        "title": "北京市各级机关2027年度考试录用公务员职位表",
        "positionSource": f"北京市考/{POSITION_FILE}",
        "guideSource": f"北京市考/{GUIDE_FILE}",
        "majorCatalogSource": "2027专业目录（用于个人专业路径辅助）",
        "workDistrictDerivation": "由单位名称提取，不代表实际工作地址",
        "positionCount": len(positions),
        "recruitCount": sum(int(item["recruitCount"] or 0) for item in positions),
        "sheets": sheets,
    }
    write_json(OUTPUT_ROOT / "positions-2027.json", positions)
    write_json(OUTPUT_ROOT / "metadata-2027.json", metadata)
    print(f"Wrote {len(positions):,} positions and {metadata['recruitCount']:,} openings to {OUTPUT_ROOT}")


if __name__ == "__main__":
    main()
