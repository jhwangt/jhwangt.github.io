from __future__ import annotations

import csv
import json
import re
from collections import Counter, defaultdict
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent
RAW_DIR = ROOT / "data" / "raw"
PROCESSED_DIR = ROOT / "data" / "processed"

OPM_RAW = RAW_DIR / "employment_202509_2.txt"
AI_SUMMARY = PROCESSED_DIR / "2024_ai_inventory_summary.json"

AGENCY_COUNTS_CSV = PROCESSED_DIR / "2025_09_opm_agency_employee_counts.csv"
SUBAGENCY_COUNTS_CSV = PROCESSED_DIR / "2025_09_opm_subagency_employee_counts.csv"
DEGREE_COUNTS_CSV = PROCESSED_DIR / "2025_09_opm_agency_degree_percentages.csv"
SERIES_COUNTS_CSV = PROCESSED_DIR / "2025_09_opm_agency_selected_series_percentages.csv"
SUBAGENCY_DEGREE_COUNTS_CSV = PROCESSED_DIR / "2025_09_opm_subagency_degree_percentages.csv"
SUBAGENCY_SERIES_COUNTS_CSV = PROCESSED_DIR / "2025_09_opm_subagency_selected_series_percentages.csv"
JOINED_CSV = PROCESSED_DIR / "2024_ai_inventory_agency_counts_with_opm_2025_09_employment.csv"
METADATA_JSON = PROCESSED_DIR / "2025_09_opm_employee_count_metadata.json"

OPM_SOURCE_URL = (
    "https://data.opm.gov/api/blob/download/chunked/"
    "employment_202509_2.txt?customFileName=employment_202509_2_2026-04-13.txt"
    "&fileType=application/json"
)


OPM_TO_AI_AGENCY = {
    "DFC": "U.S. International Development Finance Corporation",
    "BOARD OF GOVERNORS OF THE FEDERAL RESERVE SYSTEM": "Board of Governors of the Federal Reserve System",
    "COMMISSION ON CIVIL RIGHTS": "United States Commission on Civil Rights",
    "DEPARTMENT OF AGRICULTURE": "Department of Agriculture",
    "DEPARTMENT OF COMMERCE": "Department of Commerce",
    "DEPARTMENT OF EDUCATION": "Department of Education",
    "DEPARTMENT OF ENERGY": "Department of Energy",
    "DEPARTMENT OF HEALTH AND HUMAN SERVICES": "Department of Health and Human Services",
    "DEPARTMENT OF HOMELAND SECURITY": "Department of Homeland Security",
    "DEPARTMENT OF HOUSING AND URBAN DEVELOPMENT": "Department of Housing and Urban Development",
    "DEPARTMENT OF HOUSING AND URBAN DEVELOPM": "Department of Housing and Urban Development",
    "DEPARTMENT OF INTERIOR": "Department of the Interior",
    "DEPARTMENT OF JUSTICE": "Department of Justice",
    "DEPARTMENT OF LABOR": "Department of Labor",
    "DEPARTMENT OF STATE": "Department of State",
    "DEPARTMENT OF THE TREASURY": "Department of the Treasury",
    "DEPARTMENT OF TRANSPORTATION": "Department of Transportation",
    "DEPARTMENT OF TREASURY": "Department of the Treasury",
    "DEPARTMENT OF VETERANS AFFAIRS": "Department of Veterans Affairs",
    "ENVIRONMENTAL PROTECTION AGENCY": "Environmental Protection Agency",
    "GENERAL SERVICES ADMINISTRATION": "General Services Administration",
    "NATIONAL AERONAUTICS AND SPACE ADMINISTRATION": "National Aeronautics and Space Administration",
    "NAT ARCHIVES AND RECORDS ADMINISTRATION": "National Archives and Records Administration",
    "NAT AERONAUTICS AND SPACE ADMINISTRATION": "National Aeronautics and Space Administration",
    "NATIONAL SCIENCE FOUNDATION": "National Science Foundation",
    "NUCLEAR REGULATORY COMMISSION": "Nuclear Regulatory Commission",
    "OFFICE OF PERSONNEL MANAGEMENT": "Office of Personnel Management",
    "SECURITIES AND EXCHANGE COMMISSION": "Securities and Exchange Commission",
    "SMALL BUSINESS ADMINISTRATION": "Small Business Administration",
    "SOCIAL SECURITY ADMINISTRATION": "Social Security Administration",
    "TRADE AND DEVELOPMENT AGENCY": "United States Trade and Development Agency",
    "U.S.AGENCY FOR GLOBAL MEDIA": "United States Agency for Global Media",
    "U.S. AGENCY FOR INTERNATIONAL DEVELOPMENT": "United States Agency for International Development",
    "U.S. AGENCY FOR INTERNATIONAL DEV": "United States Agency for International Development",
}

COMPONENT_TO_CFO24 = {
    "Department Of Defense": "Department of Defense",
    "Department Of The Army": "Department of Defense",
    "Department Of The Navy": "Department of Defense",
    "Department Of The Air Force": "Department of Defense",
}

DEGREE_BUCKETS = [
    "HIGH SCHOOL OR LESS",
    "SOME COLLEGE OR ASSOCIATES DEGREE",
    "BACHELORS DEGREE",
    "MASTERS OR PROFESSIONAL DEGREE",
    "DOCTORATE DEGREE",
    "NO DATA REPORTED",
]

DEGREE_COLUMN_MAP = {
    "HIGH SCHOOL OR LESS": "high_school_or_less",
    "SOME COLLEGE OR ASSOCIATES DEGREE": "some_college_or_associates_degree",
    "BACHELORS DEGREE": "bachelors_degree",
    "MASTERS OR PROFESSIONAL DEGREE": "masters_or_professional_degree",
    "DOCTORATE DEGREE": "doctorate_degree",
    "NO DATA REPORTED": "no_data_reported",
}

SELECTED_SERIES = {
    "0601": "general_health_science_0601",
    "1510": "actuarial_science_1510",
    "1515": "operations_research_1515",
    "1529": "mathematical_statistics_1529",
    "1530": "statistician_1530",
    "1560": "data_science_1560",
    "2210": "it_specialist_data_management_2210",
}


def normalize_whitespace(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip()


def normalize_text(value: str) -> str:
    if value is None:
        return ""
    return normalize_whitespace(str(value))


def normalize_opm_agency_for_join(opm_agency: str) -> str:
    cleaned = normalize_text(opm_agency)
    if cleaned in OPM_TO_AI_AGENCY:
        return OPM_TO_AI_AGENCY[cleaned]
    return cleaned.title()


def normalize_cfo24_agency(opm_agency: str) -> str:
    normalized = normalize_opm_agency_for_join(opm_agency)
    return COMPONENT_TO_CFO24.get(normalized, normalized)


def dashboard_agency(opm_agency: str, opm_subagency: str) -> str:
    if opm_agency == "FEDERAL RESERVE SYSTEM" and opm_subagency == "BUREAU OF CONSUMER FINANCIAL PROTECTION":
        return "Consumer Financial Protection Bureau"
    if opm_agency == "DEPARTMENT OF ENERGY" and opm_subagency == "FEDERAL ENERGY REGULATORY COMMISSION":
        return "Federal Energy Regulatory Commission"
    return normalize_cfo24_agency(opm_agency)


def stream_opm_counts() -> tuple[
    list[dict[str, object]],
    list[dict[str, object]],
    list[dict[str, object]],
    list[dict[str, object]],
    list[dict[str, object]],
    list[dict[str, object]],
    dict[str, object],
]:
    agency_counts: Counter[str] = Counter()
    subagency_counts: defaultdict[tuple[str, str, str], int] = defaultdict(int)
    component_agencies_by_top_level: defaultdict[str, set[str]] = defaultdict(set)
    degree_counts_by_agency: defaultdict[str, Counter[str]] = defaultdict(Counter)
    selected_series_counts_by_agency: defaultdict[str, Counter[str]] = defaultdict(Counter)
    degree_counts_by_subagency: defaultdict[tuple[str, str, str], Counter[str]] = defaultdict(Counter)
    selected_series_counts_by_subagency: defaultdict[tuple[str, str, str], Counter[str]] = defaultdict(Counter)
    indicator_by_agency: dict[str, str] = {}
    scope_group_by_agency: dict[str, str] = {}
    rows_read = 0

    with OPM_RAW.open("r", encoding="utf-8", newline="") as handle:
        reader = csv.DictReader(handle, delimiter="|")
        for row in reader:
            rows_read += 1
            count = int(row["count"] or 0)
            agency = normalize_text(row["agency"])
            subagency = normalize_text(row["agency_subelement"])
            cfo_indicator = normalize_text(row["cfo_act_agency_indicator"])

            top_level_agency = dashboard_agency(agency, subagency)
            component_agency = normalize_opm_agency_for_join(agency)
            indicator_by_agency[top_level_agency] = cfo_indicator
            scope_group_by_agency[top_level_agency] = (
                "CFO Act" if cfo_indicator == "CFO ACT AGENCY"
                and top_level_agency != "Federal Energy Regulatory Commission"
                else "Other independent agency"
            )
            degree_bucket = normalize_text(row["education_level_bracket"]) or "NO DATA REPORTED"
            series_code = normalize_text(row["occupational_series_code"])

            agency_counts[top_level_agency] += count
            component_agencies_by_top_level[top_level_agency].add(component_agency)
            subagency_counts[(top_level_agency, component_agency, subagency)] += count
            degree_counts_by_agency[top_level_agency][degree_bucket] += count
            degree_counts_by_subagency[(top_level_agency, component_agency, subagency)][degree_bucket] += count
            if series_code in SELECTED_SERIES:
                selected_series_counts_by_agency[top_level_agency][series_code] += count
                selected_series_counts_by_subagency[(top_level_agency, component_agency, subagency)][series_code] += count

    agency_rows = []
    for agency, employee_count in sorted(
        agency_counts.items(), key=lambda item: (-item[1], item[0])
    ):
        agency_rows.append(
            {
                "agency": agency,
                "employee_count": employee_count,
                "cfo_act_agency_indicator": indicator_by_agency[agency],
                "scope_group": scope_group_by_agency[agency],
                "component_agencies_included": " | ".join(
                    sorted(component_agencies_by_top_level[agency])
                ),
            }
        )

    subagency_rows = []
    for (top_level_agency, component_agency, subagency), employee_count in sorted(
        subagency_counts.items(), key=lambda item: (-item[1], item[0][0], item[0][1])
    ):
        subagency_rows.append(
            {
                "agency": top_level_agency,
                "opm_component_agency": component_agency,
                "opm_subagency": subagency,
                "employee_count": employee_count,
                "cfo_act_agency_indicator": indicator_by_agency[top_level_agency],
                "scope_group": scope_group_by_agency[top_level_agency],
            }
        )

    degree_rows = []
    for agency, employee_count in sorted(
        agency_counts.items(), key=lambda item: (-item[1], item[0])
    ):
        row: dict[str, object] = {
            "agency": agency,
            "employee_count": employee_count,
        }
        for bucket in DEGREE_BUCKETS:
            count = degree_counts_by_agency[agency][bucket]
            prefix = DEGREE_COLUMN_MAP[bucket]
            row[f"{prefix}_count"] = count
            row[f"{prefix}_pct"] = round((count / employee_count) * 100, 4) if employee_count else 0
        degree_rows.append(row)

    series_rows = []
    for agency, employee_count in sorted(
        agency_counts.items(), key=lambda item: (-item[1], item[0])
    ):
        row: dict[str, object] = {
            "agency": agency,
            "employee_count": employee_count,
        }
        selected_total = 0
        for series_code, prefix in SELECTED_SERIES.items():
            count = selected_series_counts_by_agency[agency][series_code]
            selected_total += count
            row[f"{prefix}_count"] = count
            row[f"{prefix}_pct"] = round((count / employee_count) * 100, 4) if employee_count else 0
        row["selected_series_total_count"] = selected_total
        row["selected_series_total_pct"] = (
            round((selected_total / employee_count) * 100, 4) if employee_count else 0
        )
        series_rows.append(row)

    subagency_degree_rows = []
    for (top_level_agency, component_agency, subagency), employee_count in sorted(
        subagency_counts.items(), key=lambda item: (-item[1], item[0][0], item[0][1], item[0][2])
    ):
        row: dict[str, object] = {
            "agency": top_level_agency,
            "opm_component_agency": component_agency,
            "opm_subagency": subagency,
            "employee_count": employee_count,
        }
        for bucket in DEGREE_BUCKETS:
            count = degree_counts_by_subagency[(top_level_agency, component_agency, subagency)][bucket]
            prefix = DEGREE_COLUMN_MAP[bucket]
            row[f"{prefix}_count"] = count
            row[f"{prefix}_pct"] = round((count / employee_count) * 100, 4) if employee_count else 0
        subagency_degree_rows.append(row)

    subagency_series_rows = []
    for (top_level_agency, component_agency, subagency), employee_count in sorted(
        subagency_counts.items(), key=lambda item: (-item[1], item[0][0], item[0][1], item[0][2])
    ):
        row: dict[str, object] = {
            "agency": top_level_agency,
            "opm_component_agency": component_agency,
            "opm_subagency": subagency,
            "employee_count": employee_count,
        }
        selected_total = 0
        for series_code, prefix in SELECTED_SERIES.items():
            count = selected_series_counts_by_subagency[(top_level_agency, component_agency, subagency)][series_code]
            selected_total += count
            row[f"{prefix}_count"] = count
            row[f"{prefix}_pct"] = round((count / employee_count) * 100, 4) if employee_count else 0
        row["selected_series_total_count"] = selected_total
        row["selected_series_total_pct"] = (
            round((selected_total / employee_count) * 100, 4) if employee_count else 0
        )
        subagency_series_rows.append(row)

    metadata = {
        "source_url": OPM_SOURCE_URL,
        "source_file": str(OPM_RAW.relative_to(ROOT)),
        "rows_read": rows_read,
        "agency_count": len(agency_rows),
        "cfo_agency_count": sum(row["scope_group"] == "CFO Act" for row in agency_rows),
        "subagency_count": len(subagency_rows),
        "degree_buckets": DEGREE_BUCKETS,
        "selected_series_codes": SELECTED_SERIES,
    }

    return (
        agency_rows,
        subagency_rows,
        degree_rows,
        series_rows,
        subagency_degree_rows,
        subagency_series_rows,
        metadata,
    )


def load_ai_summary() -> list[dict[str, object]]:
    summary = json.loads(AI_SUMMARY.read_text())
    return summary["agencies"]


def build_joined_rows(
    ai_agencies: list[dict[str, object]],
    opm_agency_rows: list[dict[str, object]],
    degree_rows: list[dict[str, object]],
    series_rows: list[dict[str, object]],
) -> list[dict[str, object]]:
    opm_by_ai_name = {
        row["agency"]: row for row in opm_agency_rows
    }
    degree_by_ai_name = {
        row["agency"]: row for row in degree_rows
    }
    series_by_ai_name = {
        row["agency"]: row for row in series_rows
    }

    joined = []
    for ai_row in ai_agencies:
        agency = ai_row["agency"]
        opm_row = opm_by_ai_name.get(agency)
        degree_row = degree_by_ai_name.get(agency, {})
        series_row = series_by_ai_name.get(agency, {})
        joined.append(
            {
                "agency": agency,
                "ai_use_case_count": ai_row["use_case_count"],
                "ai_impact_count": ai_row["impact_count"],
                "opm_employee_count_2025_09": opm_row["employee_count"] if opm_row else "",
                "opm_cfo_act_agency_indicator": (
                    opm_row["cfo_act_agency_indicator"] if opm_row else ""
                ),
                "opm_scope_group": opm_row["scope_group"] if opm_row else "",
                "opm_component_agencies_included": (
                    opm_row["component_agencies_included"] if opm_row else ""
                ),
                "opm_pct_high_school_or_less": degree_row.get("high_school_or_less_pct", ""),
                "opm_pct_some_college_or_associates_degree": degree_row.get(
                    "some_college_or_associates_degree_pct", ""
                ),
                "opm_pct_bachelors_degree": degree_row.get("bachelors_degree_pct", ""),
                "opm_pct_masters_or_professional_degree": degree_row.get(
                    "masters_or_professional_degree_pct", ""
                ),
                "opm_pct_doctorate_degree": degree_row.get("doctorate_degree_pct", ""),
                "opm_pct_no_data_reported": degree_row.get("no_data_reported_pct", ""),
                "opm_pct_selected_series_total": series_row.get("selected_series_total_pct", ""),
                "opm_pct_data_science_1560": series_row.get("data_science_1560_pct", ""),
                "opm_pct_general_health_science_0601": series_row.get(
                    "general_health_science_0601_pct", ""
                ),
                "opm_pct_actuarial_science_1510": series_row.get(
                    "actuarial_science_1510_pct", ""
                ),
                "opm_pct_operations_research_1515": series_row.get(
                    "operations_research_1515_pct", ""
                ),
                "opm_pct_mathematical_statistics_1529": series_row.get(
                    "mathematical_statistics_1529_pct", ""
                ),
                "opm_pct_statistician_1530": series_row.get("statistician_1530_pct", ""),
                "opm_pct_it_specialist_data_management_2210": series_row.get(
                    "it_specialist_data_management_2210_pct", ""
                ),
                "opm_count_selected_series_total": series_row.get("selected_series_total_count", ""),
                "opm_count_data_science_1560": series_row.get("data_science_1560_count", ""),
                "opm_count_general_health_science_0601": series_row.get(
                    "general_health_science_0601_count", ""
                ),
                "opm_count_actuarial_science_1510": series_row.get(
                    "actuarial_science_1510_count", ""
                ),
                "opm_count_operations_research_1515": series_row.get(
                    "operations_research_1515_count", ""
                ),
                "opm_count_mathematical_statistics_1529": series_row.get(
                    "mathematical_statistics_1529_count", ""
                ),
                "opm_count_statistician_1530": series_row.get("statistician_1530_count", ""),
                "opm_count_it_specialist_data_management_2210": series_row.get(
                    "it_specialist_data_management_2210_count", ""
                ),
            }
        )

    return sorted(joined, key=lambda row: row["agency"])


def write_csv(path: Path, rows: list[dict[str, object]]) -> None:
    if not rows:
        return
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=list(rows[0].keys()))
        writer.writeheader()
        writer.writerows(rows)


def main() -> None:
    PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
    (
        agency_rows,
        subagency_rows,
        degree_rows,
        series_rows,
        subagency_degree_rows,
        subagency_series_rows,
        metadata,
    ) = stream_opm_counts()
    joined_rows = build_joined_rows(load_ai_summary(), agency_rows, degree_rows, series_rows)

    write_csv(AGENCY_COUNTS_CSV, agency_rows)
    write_csv(SUBAGENCY_COUNTS_CSV, subagency_rows)
    write_csv(DEGREE_COUNTS_CSV, degree_rows)
    write_csv(SERIES_COUNTS_CSV, series_rows)
    write_csv(SUBAGENCY_DEGREE_COUNTS_CSV, subagency_degree_rows)
    write_csv(SUBAGENCY_SERIES_COUNTS_CSV, subagency_series_rows)
    write_csv(JOINED_CSV, joined_rows)
    METADATA_JSON.write_text(json.dumps(metadata, indent=2) + "\n", encoding="utf-8")

    print(f"Wrote {len(agency_rows)} agency rows to {AGENCY_COUNTS_CSV}")
    print(f"Wrote {len(subagency_rows)} subagency rows to {SUBAGENCY_COUNTS_CSV}")
    print(f"Wrote {len(degree_rows)} degree rows to {DEGREE_COUNTS_CSV}")
    print(f"Wrote {len(series_rows)} selected-series rows to {SERIES_COUNTS_CSV}")
    print(f"Wrote {len(subagency_degree_rows)} subagency degree rows to {SUBAGENCY_DEGREE_COUNTS_CSV}")
    print(f"Wrote {len(subagency_series_rows)} subagency series rows to {SUBAGENCY_SERIES_COUNTS_CSV}")
    print(f"Wrote joined AI/OPM rows to {JOINED_CSV}")
    print(f"Wrote metadata to {METADATA_JSON}")


if __name__ == "__main__":
    main()
