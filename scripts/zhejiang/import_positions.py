#!/usr/bin/env python3
"""Convert the supplied 2027 Zhejiang exam workbooks to static site data."""

from __future__ import annotations

import json
from pathlib import Path

from openpyxl import load_workbook


PROJECT_ROOT = Path(__file__).resolve().parents[2]
SOURCE_ROOT = PROJECT_ROOT.parent / "浙江省考"
OUTPUT_ROOT = PROJECT_ROOT / "public" / "zhejiang"
POSITION_SOURCE = SOURCE_ROOT / "zj.xlsx"
MAJOR_SOURCE = SOURCE_ROOT / "ml.xlsx"


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


def import_positions() -> tuple[list[dict[str, object]], list[dict[str, object]]]:
    workbook = load_workbook(POSITION_SOURCE, read_only=True, data_only=True)
    positions: list[dict[str, object]] = []
    sheets: list[dict[str, object]] = []
    seen_codes: set[str] = set()

    for sheet in workbook.worksheets:
        rows = sheet.iter_rows(values_only=True)
        headers = [cell_text(value) for value in next(rows)]
        sheet_positions: list[dict[str, object]] = []

        for source_row, row in enumerate(rows, start=2):
            raw = {header: cell_text(row[index] if index < len(row) else None)
                   for index, header in enumerate(headers) if header}
            code = raw.get("职位代码", "")
            if not code or not raw.get("职位名称"):
                continue
            if code in seen_codes:
                raise ValueError(f"职位代码重复：{code}（工作表 {sheet.title}，第 {source_row} 行）")
            seen_codes.add(code)

            recruit_raw = raw.get("考录人数", "")
            try:
                recruit_count: int | None = int(recruit_raw) if recruit_raw else None
            except ValueError:
                recruit_count = None

            identity = raw.get("现有身份要求", "")
            remark = raw.get("备注", "")
            row_text = " ".join(value for value in raw.values() if value)
            position = {
                "id": f"zhejiang:2027:{code}",
                "positionCode": code,
                "positionTitle": raw.get("职位名称", ""),
                "departmentName": raw.get("招录机关名称", ""),
                "organizationName": raw.get("招录机关名称", ""),
                "sourceSheet": sheet.title,
                "sourceRow": source_row,
                "positionAttribute": raw.get("职位属性", ""),
                "positionType": raw.get("职位大类", ""),
                "positionSubType": raw.get("职位小类", ""),
                "recruitCount": recruit_count,
                "educationRaw": raw.get("学历要求", ""),
                "degreeRaw": raw.get("学位要求", ""),
                "existingIdentityRaw": identity,
                "freshGraduateRaw": identity if "应届" in identity else "",
                "grassrootsRequirementRaw": identity if "基层工作经历" in identity else "不限",
                "politicalStatusRaw": raw.get("政治面貌要求", ""),
                "ethnicityRaw": raw.get("民族要求", ""),
                "ageRaw": raw.get("年龄要求", ""),
                "majorRaw": raw.get("专业要求", ""),
                "positionDescription": raw.get("职位简介", ""),
                "consultationPhone": raw.get("咨询电话", ""),
                "psychologicalTestRaw": raw.get("是否加试心理测评", ""),
                "physicalTestRaw": raw.get("是否体能测评", ""),
                "professionalTestRaw": raw.get("是否加试专业", ""),
                "remarkRaw": remark,
                "workLocation": "",
                "searchText": row_text,
                "rawFields": raw,
            }
            positions.append(position)
            sheet_positions.append(position)

        sheets.append({
            "name": sheet.title,
            "positionCount": len(sheet_positions),
            "recruitCount": sum(int(item["recruitCount"] or 0) for item in sheet_positions),
        })

    return positions, sheets


def import_major_catalog() -> list[dict[str, str]]:
    workbook = load_workbook(MAJOR_SOURCE, read_only=True, data_only=True)
    sheet = workbook.active
    rows = sheet.iter_rows(values_only=True)
    headers = [cell_text(value) for value in next(rows)]
    catalog = []
    for row in rows:
        values = [cell_text(row[index] if index < len(row) else None) for index in range(4)]
        if not any(values):
            continue
        catalog.append({
            "level": values[0],
            "category": values[1],
            "classification": values[2],
            "major": values[3],
        })
    if headers[:4] != ["一级学历层次", "二级专业门类", "三级专业目录", "四级专业名称"]:
        raise ValueError(f"专业目录表头不符合预期：{headers[:4]}")
    return catalog


def main() -> None:
    if not POSITION_SOURCE.exists() or not MAJOR_SOURCE.exists():
        raise FileNotFoundError(f"需将 zj.xlsx 与 ml.xlsx 放在 {SOURCE_ROOT}")

    positions, sheets = import_positions()
    catalog = import_major_catalog()
    metadata = {
        "examType": "zhejiang",
        "year": 2027,
        "title": "浙江省各级机关单位2027年度考试录用公务员职位表",
        "positionSource": "浙江省考/zj.xlsx",
        "majorCatalogSource": "浙江省考/ml.xlsx",
        "positionCount": len(positions),
        "recruitCount": sum(int(item["recruitCount"] or 0) for item in positions),
        "majorCount": len(catalog),
        "sheets": sheets,
    }
    write_json(OUTPUT_ROOT / "positions-2027.json", positions)
    write_json(OUTPUT_ROOT / "major-catalog-2027.json", catalog)
    write_json(OUTPUT_ROOT / "metadata-2027.json", metadata)
    print(f"Wrote {len(positions):,} positions and {len(catalog):,} major catalog rows to {OUTPUT_ROOT}")


if __name__ == "__main__":
    main()
