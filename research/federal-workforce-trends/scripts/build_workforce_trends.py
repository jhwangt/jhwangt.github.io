"""Build a local, aggregate-only dashboard from three OPM Status extracts."""
from __future__ import annotations

import hashlib
import json
from collections import Counter, defaultdict
from pathlib import Path

from build_opm_employment_counts import dashboard_agency, normalize_opm_agency_for_join

ROOT = Path(__file__).resolve().parent.parent
SOURCES = {
    "2025-09": ROOT / "data/raw/employment_202509_2.txt",
    "2026-02": ROOT / "data/raw/employment_202602_1.txt",
    "2026-07": ROOT / "data/raw/employment_202607_1_2026-09-21.txt",
}
SERIES = {"0601": "Health science", "1510": "Actuarial science", "1515": "Operations research",
          "1529": "Mathematical statistics", "1530": "Statistics", "1560": "Data science",
          "2210": "IT management"}
EDUCATION = {
    "HIGH SCHOOL OR LESS": "High school or less",
    "SOME COLLEGE OR ASSOCIATES DEGREE": "Some college or associate degree",
    "BACHELORS DEGREE": "Bachelor's degree",
    "MASTERS OR PROFESSIONAL DEGREE": "Master's or professional degree",
    "DOCTORATE DEGREE": "Doctorate degree",
    "NO DATA REPORTED": "No data reported",
}
OUTPUT = ROOT / "index.html"


def new_counts() -> dict:
    return {"employees": 0, "selected": 0, "series": defaultdict(int),
            "education": defaultdict(int), "groups": set()}


def aggregate(path: Path) -> tuple[list[dict], list[dict], dict]:
    counts = defaultdict(new_counts)
    bureau_counts = defaultdict(new_counts)
    digest = hashlib.sha256()
    rows = 0
    with path.open("rb") as source:
        header = source.readline()
        digest.update(header)
        columns = header.decode("utf-8-sig").strip().split("|")
        idx = {name: columns.index(name) for name in
               ("agency", "agency_subelement", "count", "occupational_series_code",
                "education_level_bracket", "cfo_act_agency_indicator")}
        for raw in source:
            digest.update(raw)
            parts = raw.decode("utf-8", errors="replace").rstrip("\r\n").split("|")
            if len(parts) != len(columns):
                raise ValueError(f"Unexpected field count in {path.name}, line {rows + 2}")
            rows += 1
            n = int(parts[idx["count"]] or 0)
            raw_agency = parts[idx["agency"]].strip()
            bureau = parts[idx["agency_subelement"]].strip() or "Unspecified subelement"
            agency = dashboard_agency(raw_agency, parts[idx["agency_subelement"]].strip())
            component = normalize_opm_agency_for_join(raw_agency)
            items = (counts[agency], bureau_counts[(agency, component, bureau)])
            group = ("CFO Act" if parts[idx["cfo_act_agency_indicator"]].strip() == "CFO ACT AGENCY"
                     and agency != "Federal Energy Regulatory Commission" else "Other agency")
            education = parts[idx["education_level_bracket"]].strip() or "NO DATA REPORTED"
            if education not in EDUCATION:
                raise ValueError(f"Unexpected education bracket {education!r} in {path.name}, line {rows + 1}")
            code = parts[idx["occupational_series_code"]].strip()
            for item in items:
                item["employees"] += n
                item["groups"].add(group)
                item["education"][education] += n
                if code in SERIES:
                    item["selected"] += n
                    item["series"][code] += n
    mixed = [agency for agency, item in counts.items() if len(item["groups"]) != 1]
    if mixed:
        raise ValueError(f"Conflicting CFO Act classifications in {path.name}: {mixed}")
    result = [{"agency": agency, "group": next(iter(item["groups"])),
               "employees": item["employees"], "selected": item["selected"],
               "series": dict(item["series"]), "education": dict(item["education"])}
              for agency, item in sorted(counts.items())]
    bureaus = []
    for (agency, component, bureau), item in sorted(bureau_counts.items()):
        key = "\x1f".join((agency, component, bureau)).encode("utf-8")
        bureaus.append({"id": hashlib.sha1(key).hexdigest()[:16], "agency": agency,
                        "component": component, "bureau": bureau,
                        "employees": item["employees"], "selected": item["selected"],
                        "series": dict(item["series"]), "education": dict(item["education"])})
    if len({row["id"] for row in bureaus}) != len(bureaus):
        raise ValueError(f"Bureau ID collision in {path.name}")
    bureau_totals = Counter()
    for row in bureaus:
        bureau_totals[row["agency"]] += row["employees"]
    agency_totals = Counter({row["agency"]: row["employees"] for row in result})
    if bureau_totals != agency_totals:
        raise ValueError(f"Bureau and agency totals differ in {path.name}")
    return result, bureaus, {"file": path.name, "sha256": digest.hexdigest(), "rows": rows,
                             "employees": sum(item["employees"] for item in result),
                             "bureau_records": len(bureaus)}


def main() -> None:
    data = {"periods": [], "series_labels": SERIES, "education_labels": EDUCATION,
            "records": [], "bureaus": [], "sources": []}
    for period, path in SOURCES.items():
        records, bureaus, source = aggregate(path)
        data["periods"].append(period)
        data["sources"].append({"period": period, **source})
        data["records"].extend({"period": period, **row} for row in records)
        data["bureaus"].extend({"period": period, **row} for row in bureaus)
        print(period, source["rows"], source["employees"], flush=True)
    template = (ROOT / "scripts/workforce_trends_template.html").read_text()
    app_js = (ROOT / "scripts/workforce_trends_app.js").read_text()
    OUTPUT.write_text(template.replace("__DASHBOARD_DATA__", json.dumps(data, separators=(",", ":")))
                      .replace("__APP_JS__", app_js), encoding="utf-8")
    metadata = ROOT / "data/processed/workforce_trends_metadata.json"
    metadata.parent.mkdir(parents=True, exist_ok=True)
    metadata.write_text(json.dumps(data["sources"], indent=2) + "\n")
    print(OUTPUT)


if __name__ == "__main__":
    main()
