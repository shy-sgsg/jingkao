#!/usr/bin/env python3
"""Small, repeatable checks for the generated public dataset."""

import json
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = json.loads((ROOT / "public/data.json").read_text(encoding="utf-8"))
errors: list[str] = []

codes = [position.get("code") for position in DATA.get("positions", [])]
for code, count in Counter(codes).items():
    if not code or count > 1:
        errors.append(f"duplicate or empty position code: {code!r}")

source_ids = {source.get("sourceId") for source in DATA.get("sources", [])}
for position in DATA.get("positions", []):
    count = position.get("recruitCount")
    if count is not None and (not isinstance(count, (int, float)) or count <= 0):
        errors.append(f"invalid recruit count: {position.get('code')}={count!r}")
    if not position.get("sources") or any(source_id not in source_ids for source_id in position.get("sources", [])):
        errors.append(f"missing source reference: {position.get('code')}")

positions_by_code = {position.get("code"): position for position in DATA.get("positions", [])}
for observation in DATA.get("observations", []):
    for field in ("applicantsRegistered", "applicantsQualified", "applicantsPaid", "applicantsConfirmed", "actualTestTakers"):
        value = observation.get(field)
        if value is not None and (not isinstance(value, (int, float)) or value < 0):
            errors.append(f"invalid {field}: {observation.get('year')}={value!r}")
    code = observation.get("positionCode")
    if code and code not in positions_by_code:
        errors.append(f"observation references unknown position: {code}")
    if observation.get("sourceId") not in source_ids:
        errors.append(f"observation has no source: {observation.get('sourceId')!r}")
    if observation.get("actualTestTakers") == 0 and observation.get("applicantsQualified") is None:
        errors.append("unknown counts were likely collapsed into a zero")

for conflict in DATA.get("conflicts", []):
    if conflict.get("sourceId") not in source_ids:
        errors.append(f"conflict has no source: {conflict.get('sourceId')!r}")

score_rows = DATA.get("scoreRows", [])
score_row_ids = [row.get("id") for row in score_rows]
if any(not row_id for row_id in score_row_ids) or len(set(score_row_ids)) != len(score_row_ids):
    errors.append("score sample rows must have unique, nonempty ids")
score_codes = Counter(row.get("positionCode") for row in score_rows if row.get("positionCode"))
for code, count in score_codes.items():
    if count > 1:
        errors.append(f"multiple score rows reference the same position code: {code}")

for score_row in score_rows:
    if score_row.get("sourceId") not in source_ids:
        errors.append(f"score sample has no source: {score_row.get('name')!r}")
    score = score_row.get("score")
    if not isinstance(score, (int, float)) or score <= 0:
        errors.append(f"invalid score sample: {score_row.get('name')!r}={score!r}")
    confidence = score_row.get("mappingConfidence")
    code = score_row.get("positionCode")
    if confidence not in {"high", "ambiguous", "unmatched"}:
        errors.append(f"invalid score position mapping confidence: {score_row.get('name')!r}={confidence!r}")
    if code:
        position = positions_by_code.get(code)
        if not position or position.get("year") != score_row.get("year"):
            errors.append(f"score sample references unknown year/code: {score_row.get('year')}/{code}")
        elif position.get("unit") != score_row.get("unit") or position.get("title") != score_row.get("title"):
            errors.append(f"score sample code does not match exact unit/title: {score_row.get('name')!r}")
        if confidence != "high":
            errors.append(f"score sample code lacks a high-confidence unique match: {score_row.get('name')!r}")
    elif confidence == "high":
        errors.append(f"high-confidence score row is missing its position code: {score_row.get('name')!r}")

for sample in DATA.get("scoreSamples", []):
    sample_rows = [row for row in score_rows if row.get("year") == sample.get("year") and row.get("sourceId") == sample.get("sourceId") and isinstance(row.get("score"), (int, float))]
    sample_scores = [row["score"] for row in sample_rows]
    if sample.get("samplePositions") != len(sample_rows):
        errors.append(f"score sample count differs from concrete rows: {sample.get('year')}")
    if sample_scores and (sample.get("minimum") != min(sample_scores) or sample.get("maximum") != max(sample_scores)):
        errors.append(f"score sample range differs from concrete rows: {sample.get('year')}")

if not DATA.get("studyPlan"):
    errors.append("study plan is empty")
if errors:
    print("STRUCTURE: FAIL")
    print("COVERAGE: NOT ASSESSED")
    print("DATA CHECK FAILED")
    for error in errors:
        print(f"- {error}")
    raise SystemExit(1)

print("STRUCTURE: PASS")
positions = DATA.get("positions", [])
for year in (2024, 2025, 2026):
    year_positions = [position for position in positions if position.get("year") == year]
    known_recruits = [
        position.get("recruitCount")
        for position in year_positions
        if isinstance(position.get("recruitCount"), (int, float))
    ]
    unknown_recruits = len(year_positions) - len(known_recruits)
    named_scores = [row for row in DATA.get("scoreRows", []) if row.get("year") == year]
    range_samples = [row for row in DATA.get("scoreSamples", []) if row.get("year") == year]
    reported_range_positions = [row.get("samplePositions") for row in range_samples if isinstance(row.get("samplePositions"), (int, float))]
    print(
        f"{year}: {len(year_positions)} visible position examples; "
        f"{sum(known_recruits)} known recruits; {unknown_recruits} recruit counts unknown; "
        f"{len(named_scores)} named score examples; "
        f"{', '.join(str(value) for value in reported_range_positions) or 'no range sample'} reported range-sample positions"
    )
    org_type_counts = Counter(position.get("orgType") or "unknown" for position in year_positions)
    common_org_types = ("区直", "街道", "镇", "垂直/驻区")
    org_type_summary = [f"{org_type} {org_type_counts.pop(org_type, 0)}" for org_type in common_org_types]
    org_type_summary.extend(f"{org_type} {count}" for org_type, count in sorted(org_type_counts.items()))
    major_count = sum(bool(position.get("majorCriteria")) for position in year_positions)
    requirements_count = sum(bool(position.get("requirements")) for position in year_positions)
    eligibility_count = sum(position.get("eligibilityComplete") is True for position in year_positions)
    cross_verified_count = sum(position.get("crossVerified") is True for position in year_positions)
    position_source_counts = Counter(position.get("sourceLevel") or "unknown" for position in year_positions)
    other_source_count = len(year_positions) - position_source_counts["official"] - position_source_counts["secondary"]
    print(
        f"{year} coverage: org type {', '.join(org_type_summary)}; "
        f"major codes {major_count}/{len(year_positions)}; "
        f"structured requirements {requirements_count}/{len(year_positions)}; "
        f"eligibility complete {eligibility_count}/{len(year_positions)}; "
        f"cross verified {cross_verified_count}/{len(year_positions)}; "
        f"position sources official {position_source_counts['official']}, "
        f"secondary {position_source_counts['secondary']}, other {other_source_count}"
    )

score_mapping_counts = Counter(row.get("mappingConfidence") or "unknown" for row in DATA.get("scoreRows", []))
score_row_count = len(DATA.get("scoreRows", []))
print(
    f"Score mappings: high {score_mapping_counts['high']}, "
    f"ambiguous {score_mapping_counts['ambiguous']}, unmatched {score_mapping_counts['unmatched']} "
    f"({score_row_count} rows)"
)

observations = DATA.get("observations", [])
observation_metric_counts = {
    "registered": sum(observation.get("applicantsRegistered") is not None for observation in observations),
    "qualified": sum(observation.get("applicantsQualified") is not None for observation in observations),
    "paid": sum(observation.get("applicantsPaid") is not None for observation in observations),
    "confirmed": sum(observation.get("applicantsConfirmed") is not None for observation in observations),
    "actual test takers": sum(observation.get("actualTestTakers") is not None for observation in observations),
}
print(
    "Observation metric rows: "
    + ", ".join(f"{metric} {count}" for metric, count in observation_metric_counts.items())
)

source_level_counts = Counter(source.get("level") or "unknown" for source in DATA.get("sources", []))
other_source_records = len(DATA.get("sources", [])) - source_level_counts["official"] - source_level_counts["secondary"]
print(
    f"Source registry levels: official {source_level_counts['official']}, "
    f"secondary {source_level_counts['secondary']}, other {other_source_records}"
)

official_counts = DATA.get("coverage", {}).get("officialPositionCounts", {})
coverage_complete = all(
    isinstance(official_counts.get(str(year), official_counts.get(year)), int)
    and official_counts.get(str(year), official_counts.get(year)) == sum(1 for position in positions if position.get("year") == year)
    and all(position.get("sourceLevel") == "official" for position in positions if position.get("year") == year)
    for year in (2024, 2025, 2026)
)
if coverage_complete:
    print("COVERAGE: PASS")
else:
    print("COVERAGE: INCOMPLETE — annual official position denominator not verified")
print(
    f"{len(DATA.get('observations', []))} scoped observations; "
    f"{len(DATA.get('sources', []))} sources; "
    f"{len(DATA.get('studyPlan', []))} study days"
)
