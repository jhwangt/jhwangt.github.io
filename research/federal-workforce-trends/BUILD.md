# How this page was made

The dashboard uses Python's standard library, plain HTML/CSS, and browser JavaScript. It needs no application server or external JavaScript library after the page is generated.

1. [`scripts/build_workforce_trends.py`](scripts/build_workforce_trends.py) reads the three OPM text files one line at a time. It extracts `agency`, `agency_subelement`, `count`, `cfo_act_agency_indicator`, `education_level_bracket`, and `occupational_series_code`.
2. The builder uses the agency-name mapping in [`scripts/build_opm_employment_counts.py`](scripts/build_opm_employment_counts.py), groups Department of Defense components, and separates CFPB and FERC as described in [METHODOLOGY.md](METHODOLOGY.md).
3. It sums employee counts by agency and by OPM agency subelement. It also calculates education and seven selected occupational-series counts at both levels, checks that bureau totals roll up to agency totals, and records the source-file SHA-256 hashes.
4. The builder inserts those aggregates into [`scripts/workforce_trends_template.html`](scripts/workforce_trends_template.html) and inserts [`scripts/workforce_trends_app.js`](scripts/workforce_trends_app.js). The result is [`index.html`](index.html).
5. Browser JavaScript filters the embedded aggregates, draws a zero-based line chart, and updates summary cards, education and occupation breakdowns, and comparison tables. No employee-level records are sent to the browser.

To rebuild, place the exact filenames in [DATA.md](DATA.md) under `data/raw/` in this folder and run:

```bash
python3 scripts/build_workforce_trends.py
```

The raw files are several gigabytes and are intentionally absent from this repository. Rebuilding from a newer OPM release may change the output. Check source hashes, dashboard totals, missing agency or bureau records, and all links before committing a new snapshot. The fuller [methods note](METHODOLOGY.md) describes what the counts can and cannot support in research.
