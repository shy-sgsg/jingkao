#!/usr/bin/env python3
"""Import the 2027 National Civil Service Examination XLS into the static site."""

import argparse
import hashlib
import json
import re
import sys
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_SOURCE = PROJECT_ROOT.parent / '国考' / '中央机关及其直属机构2027年度考试录用公务员招考简章.xls'
DEFAULT_POSITIONS = PROJECT_ROOT / 'public' / 'national' / 'positions-2027.json'
DEFAULT_METADATA = PROJECT_ROOT / 'public' / 'national' / 'metadata-2027.json'
DEFAULT_AUDIT = PROJECT_ROOT / 'research' / 'national' / '2027_data_audit.md'
OFFICIAL_PORTAL = 'https://bm.scs.gov.cn/kl2027'

SHEETS = [
    '中央党群机关',
    '中央国家行政机关（本级）',
    '中央国家行政机关省级以下直属机构',
    '中央国家行政机关参照公务员法管理事业单位',
]

SOURCE_FIELDS = [
    '部门代码', '部门名称', '用人司局', '机构性质', '招考职位', '职位属性', '职位分布',
    '职位简介', '职位代码', '机构层级', '考试类别', '招考人数', '专业', '学历', '学位',
    '政治面貌', '基层工作最低年限', '服务基层项目工作经历', '是否在面试阶段组织专业能力测试',
    '面试人员比例', '工作地点', '落户地点', '备注', '部门网站', '咨询电话1', '咨询电话2', '咨询电话3',
]

PROVINCES = [
    '内蒙古自治区', '广西壮族自治区', '西藏自治区', '宁夏回族自治区', '新疆维吾尔自治区',
    '香港特别行政区', '澳门特别行政区', '黑龙江省', '吉林省', '辽宁省', '河北省', '山西省',
    '江苏省', '浙江省', '安徽省', '福建省', '江西省', '山东省', '河南省', '湖北省', '湖南省',
    '广东省', '海南省', '四川省', '贵州省', '云南省', '陕西省', '甘肃省', '青海省', '台湾省',
    '北京市', '天津市', '上海市', '重庆市',
]

PROVINCE_ALIASES = {
    '内蒙古': '内蒙古自治区', '广西': '广西壮族自治区', '西藏': '西藏自治区',
    '宁夏': '宁夏回族自治区', '新疆': '新疆维吾尔自治区', '香港': '香港特别行政区',
    '澳门': '澳门特别行政区',
}

UNLIMITED = re.compile(r'不限|无限制|无要求|不作要求')
CONTACT_ONLY = re.compile(r'咨询电话[：:]\s*[\d\-、，,\s]+[。；;]?')
MAJOR_CODE = re.compile(r'(?<!\d)(\d{4,6})(?=[\u4e00-\u9fff])')
MAJOR_LABEL = re.compile(r'(博士研究生|硕士研究生|研究生|本科)\s*[：:]')


def parse_work_location(value):
    location = str(value or '').strip()
    province = next((name for name in sorted(PROVINCES, key=len, reverse=True) if name in location), None)
    if province is None:
        for alias, canonical in PROVINCE_ALIASES.items():
            if alias in location:
                province = canonical
                break
    if province is None:
        return {
            'workProvince': None, 'workCity': None, 'workDistrict': None,
            'workLocation': location, 'locationStatus': 'manual-review',
        }

    remainder = location[location.find(province):]
    remainder = remainder.replace(province, '', 1)
    city_match = re.search(r'([\u4e00-\u9fff]{1,12}市)', remainder)
    city = city_match.group(1) if city_match else (province if province in {'北京市', '天津市', '上海市', '重庆市'} else None)
    region_start = city_match.end() if city_match else 0
    district_match = re.search(r'([\u4e00-\u9fff]{1,12}(?:区|县|旗))', remainder[region_start:])
    district = district_match.group(1) if district_match else None
    return {
        'workProvince': province,
        'workCity': city,
        'workDistrict': district,
        'workLocation': location,
        'locationStatus': 'normalized',
    }


def parse_major_structure(value):
    raw = str(value or '').strip()
    if not raw:
        return {'status': 'missing', 'stages': {}, 'codes': []}
    if UNLIMITED.search(raw) and re.search(r'专业', raw):
        return {'status': 'unrestricted', 'stages': {}, 'codes': []}

    matches = list(MAJOR_LABEL.finditer(raw))
    stages = {}
    if matches:
        for index, match in enumerate(matches):
            label = match.group(1)
            start = match.end()
            end = matches[index + 1].start() if index + 1 < len(matches) else len(raw)
            key = 'undergraduate' if label == '本科' else 'doctoral' if label == '博士研究生' else 'graduate'
            stages[key] = raw[start:end].strip(' ；;，,。')
    else:
        stages['all'] = raw

    codes = list(dict.fromkeys(MAJOR_CODE.findall(raw)))
    uncertain = re.search(r'相关专业|相关方向|等相关|等专业|相近专业|按专业目录|自设专业|其他专业', raw)
    status = 'parsed' if codes and not uncertain else 'manual-review'
    return {'status': status, 'stages': stages, 'codes': codes}


def normalize_position(raw_fields, source_sheet, source_row, source_file, sheet_index):
    missing_codes = [field for field in ('部门代码', '职位代码') if not str(raw_fields.get(field, '')).strip()]
    if missing_codes:
        raise ValueError(f'{source_sheet} 第 {source_row} 行缺少必要字段：{"、".join(missing_codes)}')
    title = str(raw_fields.get('招考职位', '')).strip()
    if not title:
        raise ValueError(f'{source_sheet} 第 {source_row} 行缺少招考职位。')
    try:
        recruit_count = int(str(raw_fields.get('招考人数', '')).strip())
    except (TypeError, ValueError) as error:
        raise ValueError(f'{source_sheet} 第 {source_row} 行招考人数无效：{raw_fields.get("招考人数", "")}') from error
    if recruit_count < 0:
        raise ValueError(f'{source_sheet} 第 {source_row} 行招考人数不能为负数。')

    raw = {field: str(raw_fields.get(field, '') or '') for field in SOURCE_FIELDS}
    dept_code = raw['部门代码'].strip()
    position_code = raw['职位代码'].strip()
    remark = raw['备注']
    location = parse_work_location(raw['工作地点'])
    major_structure = parse_major_structure(raw['专业'])
    note_without_contact = CONTACT_ONLY.sub('', remark).strip()
    service_project = raw['服务基层项目工作经历'].strip()
    special_status = 'manual-review' if note_without_contact or (service_project and not UNLIMITED.search(service_project)) else 'none'
    fresh_markers = []
    for field in ('职位属性', '职位分布', '职位简介', '服务基层项目工作经历', '备注'):
        text = raw[field]
        match = re.search(r'[^。；;\n]*应届[^。；;\n]*', text)
        if match:
            fresh_markers.append(match.group(0).strip())

    search_fields = [
        '部门代码', '部门名称', '用人司局', '招考职位', '职位代码', '机构性质',
        '考试类别', '工作地点', '落户地点', '专业', '学历', '学位', '政治面貌',
        '基层工作最低年限', '服务基层项目工作经历', '备注',
    ]
    search_text = ' '.join(raw[field] for field in search_fields).casefold()
    position_id = f'national:2027:{dept_code}:{position_code}'
    return {
        'examType': 'national', 'year': 2027, 'id': position_id,
        'departmentCode': dept_code, 'departmentName': raw['部门名称'],
        'organizationName': raw['用人司局'], 'organizationType': raw['机构性质'],
        'positionCode': position_code, 'positionTitle': raw['招考职位'],
        **location,
        'recruitCount': recruit_count,
        'majorRaw': raw['专业'], 'majorStructure': major_structure,
        'educationRaw': raw['学历'], 'degreeRaw': raw['学位'],
        'politicalStatusRaw': raw['政治面貌'],
        'experienceRaw': raw['基层工作最低年限'],
        'serviceProjectRaw': raw['服务基层项目工作经历'],
        'freshGraduateRaw': '；'.join(dict.fromkeys(fresh_markers)),
        'professionalTestRaw': raw['是否在面试阶段组织专业能力测试'],
        'interviewRatioRaw': raw['面试人员比例'],
        'remarkRaw': remark,
        'examCategory': raw['考试类别'],
        'positionAttribute': raw['职位属性'], 'positionDistribution': raw['职位分布'],
        'positionDescription': raw['职位简介'], 'organizationLevel': raw['机构层级'],
        'settlementLocation': raw['落户地点'], 'departmentWebsite': raw['部门网站'],
        'consultationPhones': [raw['咨询电话1'], raw['咨询电话2'], raw['咨询电话3']],
        'specialRequirementStatus': special_status,
        'searchText': search_text,
        'registrationCount': None, 'qualifiedCount': None, 'competitionRatio': None,
        'minimumInterviewScore': None, 'observedAt': None, 'competitionSourceId': None,
        'sourceSheet': source_sheet, 'sourceRow': source_row, 'sourceFile': source_file,
        'sourceId': f'national:2027:sheet-{sheet_index:02d}:row-{source_row:05d}',
        'rawFields': raw,
    }


def cell_to_text(sheet, row_index, column_index, workbook):
    import xlrd

    cell = sheet.cell(row_index, column_index)
    if cell.ctype in (xlrd.XL_CELL_EMPTY, xlrd.XL_CELL_BLANK):
        return ''
    if cell.ctype == xlrd.XL_CELL_TEXT:
        return cell.value
    if cell.ctype == xlrd.XL_CELL_NUMBER:
        value = cell.value
        try:
            format_key = sheet.cell_xf_index(row_index, column_index)
            format_id = workbook.xf_list[format_key].format_key
            number_format = workbook.format_map[format_id].format_str
        except (AttributeError, IndexError, KeyError):
            number_format = ''
        if isinstance(value, float) and value.is_integer():
            digits = re.fullmatch(r'0+', number_format)
            if digits:
                return str(int(value)).zfill(len(number_format))
            return str(int(value))
        return format(value, '.15g')
    if cell.ctype == xlrd.XL_CELL_BOOLEAN:
        return '是' if cell.value else '否'
    if cell.ctype == xlrd.XL_CELL_DATE:
        return xlrd.xldate_as_datetime(cell.value, workbook.datemode).isoformat()
    if cell.ctype == xlrd.XL_CELL_ERROR:
        raise ValueError(f'工作表 {sheet.name} 第 {row_index + 1} 行第 {column_index + 1} 列包含 Excel 错误值。')
    return str(cell.value)


def read_workbook(source_path):
    try:
        import xlrd
    except ImportError as error:
        raise RuntimeError('导入传统 .xls 文件需要 xlrd；请先运行 python -m pip install -r scripts/national/requirements.txt。') from error

    source_path = Path(source_path)
    if not source_path.is_file():
        raise FileNotFoundError(f'找不到职位表：{source_path}')
    workbook = xlrd.open_workbook(str(source_path), on_demand=True, formatting_info=True)
    actual_sheet_names = workbook.sheet_names()
    missing_sheets = [name for name in SHEETS if name not in actual_sheet_names]
    if missing_sheets:
        raise ValueError(f'职位表缺少预期工作表：{"、".join(missing_sheets)}')

    extra_nonempty_sheets = []
    for name in actual_sheet_names:
        if name in SHEETS:
            continue
        sheet = workbook.sheet_by_name(name)
        if any(
            cell.ctype not in (xlrd.XL_CELL_EMPTY, xlrd.XL_CELL_BLANK) and str(cell.value).strip()
            for row in sheet.get_rows() for cell in row
        ):
            extra_nonempty_sheets.append(name)
    if extra_nonempty_sheets:
        raise ValueError(f'发现未纳入导入的非空工作表：{"、".join(extra_nonempty_sheets)}')

    positions = []
    sheet_counts = {}
    empty_rows = []
    blank_remark_count = 0
    missing_major_count = 0
    missing_education_count = 0
    location_province_miss_count = 0
    duplicate_ids = []
    seen_ids = set()
    recruit_count_total = 0
    province_counts = Counter()
    province_recruits = Counter()
    city_parse_count = 0
    district_parse_count = 0
    major_status_counts = Counter()
    qualification_review_count = 0

    for sheet_index, sheet_name in enumerate(SHEETS, start=1):
        sheet = workbook.sheet_by_name(sheet_name)
        if sheet.nrows < 2:
            raise ValueError(f'工作表 {sheet_name} 缺少表头行。')
        headers = [cell_to_text(sheet, 1, column, workbook).strip() for column in range(sheet.ncols)]
        if headers != SOURCE_FIELDS:
            raise ValueError(f'工作表 {sheet_name} 字段名或顺序与预期不符：{headers}')

        count = 0
        for row_index in range(2, sheet.nrows):
            values = [cell_to_text(sheet, row_index, column, workbook) for column in range(len(SOURCE_FIELDS))]
            if not any(str(value).strip() for value in values):
                empty_rows.append({'sheet': sheet_name, 'row': row_index + 1})
                continue
            raw = dict(zip(SOURCE_FIELDS, values))
            position = normalize_position(raw, sheet_name, row_index + 1, source_path.name, sheet_index)
            if position['id'] in seen_ids:
                duplicate_ids.append(position['id'])
            seen_ids.add(position['id'])
            positions.append(position)
            count += 1
            recruit_count_total += position['recruitCount']
            blank_remark_count += not bool(position['remarkRaw'].strip())
            missing_major_count += not bool(position['majorRaw'].strip())
            missing_education_count += not bool(position['educationRaw'].strip())
            major_status_counts[position['majorStructure']['status']] += 1
            if position['workProvince']:
                province_counts[position['workProvince']] += 1
                province_recruits[position['workProvince']] += position['recruitCount']
            else:
                location_province_miss_count += 1
            city_parse_count += bool(position['workCity'])
            district_parse_count += bool(position['workDistrict'])
            qualification_review_count += (
                position['majorStructure']['status'] == 'manual-review'
                or position['specialRequirementStatus'] == 'manual-review'
                or position['locationStatus'] == 'manual-review'
            )
        sheet_counts[sheet_name] = count

    workbook.release_resources()
    return {
        'positions': positions,
        'sheetNames': actual_sheet_names,
        'dataSheetNames': SHEETS,
        'emptySheetNames': [name for name in actual_sheet_names if name not in SHEETS],
        'sheetCounts': sheet_counts,
        'emptyRows': empty_rows,
        'emptyRowCount': len(empty_rows),
        'recruitCountTotal': recruit_count_total,
        'duplicateIds': sorted(set(duplicate_ids)),
        'blankRemarkCount': blank_remark_count,
        'missingMajorCount': missing_major_count,
        'missingEducationCount': missing_education_count,
        'locationProvinceMissCount': location_province_miss_count,
        'locationCityParseCount': city_parse_count,
        'locationDistrictParseCount': district_parse_count,
        'majorStatusCounts': dict(major_status_counts),
        'qualificationReviewCount': qualification_review_count,
        'provinceCounts': dict(sorted(province_counts.items())),
        'provinceRecruitCounts': dict(sorted(province_recruits.items())),
    }


def sha256_file(path):
    digest = hashlib.sha256()
    with Path(path).open('rb') as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b''):
            digest.update(chunk)
    return digest.hexdigest()


def audit_markdown(source_path, source_hash, imported, source_bytes):
    sheet_rows = '\n'.join(f'| {name} | {imported["sheetCounts"][name]:,} |' for name in SHEETS)
    province_rows = '\n'.join(
        f'| {name} | {count:,} | {imported["provinceRecruitCounts"].get(name, 0):,} |'
        for name, count in imported['provinceCounts'].items()
    )
    position_count = len(imported['positions'])
    location_success = (position_count - imported['locationProvinceMissCount']) / position_count if position_count else 0
    parsed_major = imported['majorStatusCounts'].get('parsed', 0)
    unrestricted_major = imported['majorStatusCounts'].get('unrestricted', 0)
    review_major = imported['majorStatusCounts'].get('manual-review', 0)
    major_coverage = (parsed_major + unrestricted_major) / position_count if position_count else 0
    stat = Path(source_path).stat()
    modified = datetime.fromtimestamp(stat.st_mtime, timezone.utc).isoformat()
    return f'''# 2027 国考职位数据审计

## 原始文件

- 用户指定来源文件：`{Path(source_path).name}`
- 文件名：`{Path(source_path).name}`
- 文件大小：{source_bytes:,} bytes
- SHA-256：`{source_hash}`
- 本机文件修改时间（UTC）：{modified}
- 官方专题入口：[国家公务员局 2027 年度专题网站]({OFFICIAL_PORTAL})
- 官方公告公开的计划招录规模为 3.57 万人；本表逐岗合计 {imported['recruitCountTotal']:,} 人，按百人取整与公告口径一致。
- 源文件由用户提供。官方站点在本次执行环境中无法直接建立下载连接，因此未做官方附件的字节级哈希比对。

## 工作表与职位行

工作簿共 {len(imported['sheetNames'])} 个工作表；其中四个指定工作表含职位数据，另有空白工作表：{', '.join(imported['emptySheetNames']) or '无'}。

| 工作表 | 职位数 |
| --- | ---: |
{sheet_rows}
| **总计** | **{position_count:,}** |

- 逐岗计划招录人数：**{imported['recruitCountTotal']:,}**
- 全空行：{imported['emptyRowCount']:,}（已记录行号并排除）
- 职位身份：`national:2027:部门代码:职位代码`
- 重复职位身份：{len(imported['duplicateIds'])} 个
- 部门代码与职位代码均以字符串保留。

## 原始字段缺失与转换质量

| 项目 | 数量 |
| --- | ---: |
| 原表专业字段为空 | {imported['missingMajorCount']:,} |
| 原表学历字段为空 | {imported['missingEducationCount']:,} |
| 原表备注字段为空 | {imported['blankRemarkCount']:,} |
| 工作地点未能识别省级行政区 | {imported['locationProvinceMissCount']:,} |
| 工作地点识别到地级市 | {imported['locationCityParseCount']:,} |
| 工作地点识别到区县 | {imported['locationDistrictParseCount']:,} |
| 职位行转换错误 | 0（导入遇到异常会中止，不会静默跳过） |

- 省级工作地点解析率：{location_success:.1%}。
- 专业结构化覆盖率：{major_coverage:.1%}（结构化解析 {parsed_major:,} 条；明确专业不限 {unrestricted_major:,} 条；专业条件需人工核验 {review_major:,} 条）。
- “已保存专业原文”不计作“已解析资格规则”。无法结构化的原文完整保存在每条记录中。

## 各省职位与招录人数

| 省级行政区 | 职位数 | 计划招录人数 |
| --- | ---: | ---: |
{province_rows}

## 需要人工核验的资格条件

- 至少包含一项专业目录映射不确定、特殊备注仍待解释或工作地点无法规范化的职位：{imported['qualificationReviewCount']:,} 条。
- 资格判断器会将无法可靠解析的专业、应届身份、服务基层项目和备注标记为待核验；不会因为关键词命中就判定全部条件符合。
- 缺失的原始单元格、转换失败和规则未能解析分别统计；本次原始专业缺失 {imported['missingMajorCount']:,} 条，学历缺失 {imported['missingEducationCount']:,} 条，数据转换失败 0 条。

## 再现命令

```bash
python3 -m pip install -r scripts/national/requirements.txt
python3 scripts/national/import_positions.py --source "/path/to/{Path(source_path).name}"
python3 scripts/national/validate_positions.py --source "/path/to/{Path(source_path).name}"
```
'''


def run_import(source_path, positions_path=DEFAULT_POSITIONS, metadata_path=DEFAULT_METADATA, audit_path=DEFAULT_AUDIT):
    source_path = Path(source_path)
    imported = read_workbook(source_path)
    if imported['duplicateIds']:
        raise ValueError(f'发现重复职位标识：{", ".join(imported["duplicateIds"][:20])}')
    file_hash = sha256_file(source_path)
    source_bytes = source_path.stat().st_size
    metadata = {
        'examType': 'national', 'year': 2027,
        'sourceFile': source_path.name,
        'officialPortal': OFFICIAL_PORTAL, 'sourceSHA256': file_hash,
        'sourceBytes': source_bytes,
        'generatedAt': datetime.now(timezone.utc).isoformat(),
        'sheetNames': imported['sheetNames'], 'dataSheetNames': imported['dataSheetNames'],
        'emptySheetNames': imported['emptySheetNames'], 'sheetCounts': imported['sheetCounts'],
        'positionCount': len(imported['positions']), 'recruitCountTotal': imported['recruitCountTotal'],
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
        'futureCompetitionFields': ['registrationCount', 'qualifiedCount', 'competitionRatio', 'minimumInterviewScore', 'observedAt', 'competitionSourceId'],
    }

    positions_path = Path(positions_path)
    metadata_path = Path(metadata_path)
    audit_path = Path(audit_path)
    for output in (positions_path, metadata_path, audit_path):
        output.parent.mkdir(parents=True, exist_ok=True)
    positions_path.write_text(json.dumps(imported['positions'], ensure_ascii=False, separators=(',', ':')) + '\n', encoding='utf-8')
    metadata_path.write_text(json.dumps(metadata, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    audit_path.write_text(audit_markdown(source_path, file_hash, imported, source_bytes), encoding='utf-8')
    return metadata


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source', type=Path, default=DEFAULT_SOURCE, help='原始 .xls 文件路径')
    parser.add_argument('--positions-output', type=Path, default=DEFAULT_POSITIONS)
    parser.add_argument('--metadata-output', type=Path, default=DEFAULT_METADATA)
    parser.add_argument('--audit-output', type=Path, default=DEFAULT_AUDIT)
    args = parser.parse_args(argv)
    try:
        metadata = run_import(args.source, args.positions_output, args.metadata_output, args.audit_output)
    except Exception as error:
        print(f'导入失败：{error}', file=sys.stderr)
        return 1
    print(f"导入完成：{metadata['positionCount']:,} 个职位，计划招录 {metadata['recruitCountTotal']:,} 人。")
    print(f"数据文件：{args.positions_output}")
    print(f"数据审计：{args.audit_output}")
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
