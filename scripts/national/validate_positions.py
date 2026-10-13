#!/usr/bin/env python3
"""Verify the published JSON against every row in the supplied 2027 XLS."""

import argparse
import json
import sys
from pathlib import Path

from import_positions import (
    DEFAULT_METADATA,
    DEFAULT_POSITIONS,
    DEFAULT_SOURCE,
    read_workbook,
    sha256_file,
)


METADATA_KEYS = [
    'examType', 'year', 'sourceFile', 'sourceSHA256', 'sourceBytes',
    'sheetNames', 'dataSheetNames', 'emptySheetNames', 'sheetCounts',
    'positionCount', 'recruitCountTotal', 'duplicateIdCount',
    'blankRemarkCount', 'missingMajorCount', 'missingEducationCount',
    'locationProvinceMissCount', 'locationCityParseCount',
    'locationDistrictParseCount', 'majorStatusCounts', 'qualificationReviewCount',
    'provinceCounts', 'provinceRecruitCounts',
]


def first_difference(expected, actual, path='position'):
    if type(expected) is not type(actual):
        return f'{path}: type {type(expected).__name__} != {type(actual).__name__}'
    if isinstance(expected, dict):
        expected_keys = set(expected)
        actual_keys = set(actual)
        if expected_keys != actual_keys:
            return f'{path}: keys differ (missing={sorted(expected_keys - actual_keys)}, extra={sorted(actual_keys - expected_keys)})'
        for key in expected:
            difference = first_difference(expected[key], actual[key], f'{path}.{key}')
            if difference:
                return difference
        return None
    if isinstance(expected, list):
        if len(expected) != len(actual):
            return f'{path}: length {len(expected)} != {len(actual)}'
        for index, (left, right) in enumerate(zip(expected, actual)):
            difference = first_difference(left, right, f'{path}[{index}]')
            if difference:
                return difference
        return None
    return None if expected == actual else f'{path}: {expected!r} != {actual!r}'


def validate_files(source_path, positions_path=DEFAULT_POSITIONS, metadata_path=DEFAULT_METADATA):
    source_path = Path(source_path)
    positions_path = Path(positions_path)
    metadata_path = Path(metadata_path)
    imported = read_workbook(source_path)
    positions = json.loads(positions_path.read_text(encoding='utf-8'))
    metadata = json.loads(metadata_path.read_text(encoding='utf-8'))

    if not isinstance(positions, list):
        raise ValueError('positions JSON 顶层必须是数组。')
    if len(positions) != len(imported['positions']):
        raise ValueError(f'职位行数不一致：源表 {len(imported["positions"])}，JSON {len(positions)}。')
    if imported['duplicateIds']:
        raise ValueError(f'源表职位编号重复：{imported["duplicateIds"][:10]}')

    for index, (expected, actual) in enumerate(zip(imported['positions'], positions), start=1):
        difference = first_difference(expected, actual, f'第 {index} 条职位')
        if difference:
            if '.rawFields' in difference:
                raise ValueError(f'原始字段与来源工作簿不一致：{difference}')
            raise ValueError(f'导出职位与来源工作簿不一致：{difference}')

    expected_metadata = {
        'examType': 'national',
        'year': 2027,
        'sourceFile': source_path.name,
        'sourceSHA256': sha256_file(source_path),
        'sourceBytes': source_path.stat().st_size,
        'sheetNames': imported['sheetNames'],
        'dataSheetNames': imported['dataSheetNames'],
        'emptySheetNames': imported['emptySheetNames'],
        'sheetCounts': imported['sheetCounts'],
        'positionCount': len(imported['positions']),
        'recruitCountTotal': imported['recruitCountTotal'],
        'duplicateIdCount': len(imported['duplicateIds']),
        'blankRemarkCount': imported['blankRemarkCount'],
        'missingMajorCount': imported['missingMajorCount'],
        'missingEducationCount': imported['missingEducationCount'],
        'locationProvinceMissCount': imported['locationProvinceMissCount'],
        'locationCityParseCount': imported['locationCityParseCount'],
        'locationDistrictParseCount': imported['locationDistrictParseCount'],
        'majorStatusCounts': imported['majorStatusCounts'],
        'qualificationReviewCount': imported['qualificationReviewCount'],
        'provinceCounts': imported['provinceCounts'],
        'provinceRecruitCounts': imported['provinceRecruitCounts'],
    }
    for key in METADATA_KEYS:
        if metadata.get(key) != expected_metadata[key]:
            raise ValueError(f'metadata.{key} 与来源工作簿不一致：{metadata.get(key)!r} != {expected_metadata[key]!r}')

    return {
        'positionCount': len(positions),
        'recruitCountTotal': imported['recruitCountTotal'],
        'rawFieldMismatches': 0,
        'sourceSHA256': expected_metadata['sourceSHA256'],
    }


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source', type=Path, default=DEFAULT_SOURCE, help='原始 .xls 文件路径')
    parser.add_argument('--positions', type=Path, default=DEFAULT_POSITIONS)
    parser.add_argument('--metadata', type=Path, default=DEFAULT_METADATA)
    args = parser.parse_args(argv)
    try:
        report = validate_files(args.source, args.positions, args.metadata)
    except Exception as error:
        print(f'数据校验失败：{error}', file=sys.stderr)
        return 1
    print(f"数据校验通过：{report['positionCount']:,} 个职位，计划招录 {report['recruitCountTotal']:,} 人。")
    print(f"逐条记录及全部 27 个原始字段与来源一致；SHA-256：{report['sourceSHA256']}")
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
