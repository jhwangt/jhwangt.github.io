# Dashboard data guide

This guide describes the fixed data snapshot embedded in `index.html`. It is not a live OPM or OMB feed. Figures are descriptive comparisons of different reporting periods, not a measure of agency AI capability or a causal relationship.

## Source files and provenance

| Local input | Publisher and period | SHA-256 of the file used |
| --- | --- | --- |
| `2024_consolidated_ai_inventory_raw.csv` | [OMB 2024 Federal AI Use Case Inventory](https://github.com/ombegov/2024-Federal-AI-Use-Case-Inventory), local 1,757-row copy | `9a2c9e25d41eb7b4b2e5463459c8ea78e0e02db0c15e82cc09c88e78889b40f5` |
| `data_dictionary.yaml` | [OMB inventory data dictionary](https://github.com/ombegov/2024-Federal-AI-Use-Case-Inventory/tree/main/validation) | `bc2302170a5b3aee419479522cd6afbb5416de9555a8d6fe7e34a848d7e8eee0` |
| `employment_202509_2.txt` | [OPM EHRI September 2025 employment download](https://data.opm.gov/explore-data/data/data-downloads), pipe-delimited | `cb0b486d41c1e8debe42cdf9971b1a1efd8abb93e87753d565e54ab460e23676` |

The OPM input contained 2,190,219 data rows. Its local download URL was `https://data.opm.gov/api/blob/download/chunked/employment_202509_2.txt?customFileName=employment_202509_2_2026-04-13.txt&fileType=application/json`. The raw download is about 1.6 GB and is **not** in this website repository. OPM describes EHRI Status as a month-end workforce snapshot and publishes its [coverage and exclusion notes](https://data.opm.gov/resources/data-sources). Some source fields are redacted under OPM's release policy.

The OMB repository can change over time. Its repository summary describes a later, larger inventory than the 1,757-row local CSV. The local file hash identifies the exact input used here, but the upstream commit and download date were not captured. Do not substitute the current upstream file and expect identical results without checking its version and rerunning the pipeline.

## Processing path

1. `build_2024_inventory.py` reads the OMB CSV, renames selected columns, normalizes whitespace and a few categorical labels, and produces an agency summary. Each local CSV row counts as one reported use case; 37 distinct agency names remain after cleaning.
2. `build_opm_employment_counts.py` streams the September 2025 OPM text and sums `count` by agency and component. It creates degree and selected-series aggregates, applies the agency mappings below, and joins the agency summary to OPM.
3. `join_ai_inventory_subagency_opm.py` assigns inventory rows to OPM components where possible. It records match status and method for each inventory row.
4. `build_workforce_dashboard.py` embeds the agency and component aggregates in the static HTML. Filtering, ranking, charts, and displayed rates run in the browser; no raw employee records or use-case descriptions are sent to the browser.

These scripts currently live in the dissertation working directory, not this public website repository. The exact build command order and intermediate outputs are recorded in the working project's README. This guide documents the published snapshot; it is not yet a fully runnable public replication package.

## Units and fields

The HTML contains two arrays: `DATA.agencies` (one row per OMB agency) and `DATA.subagencies` (OPM components within those agencies). The latter is restricted to agencies represented in the local AI inventory. Values are aggregate counts or percentages, not person-level records.

| Field or field family | Definition |
| --- | --- |
| `agency` | Cleaned OMB agency name used as the top-level join key. |
| `opm_subagency` | OPM `agency_subelement` label for a component row. The component also retains its OPM parent in `opm_component_agency`. |
| `opm_employee_count_2025_09`; component `employee_count` | Sum of OPM `count` values for the agency or component. Not the number of source lines. |
| `ai_use_case_count` | Number of rows in the local OMB inventory attributed to that agency or matched component. It does not identify unique deployed systems or projects. |
| `ai_impact_count` | Inventory rows whose normalized `impact_type` is Rights-Impacting, Safety-Impacting, or Both. Blank means the field is unavailable at that level. |
| `opm_count_*`; component `*_count` | OPM employee counts in the named occupational series or their selected-series sum. |
| `opm_pct_*`; component `*_pct` | Named education or series count divided by the same agency/component's employee count, times 100. Display rounding can make visible percentages sum slightly differently from 100. |
| `opm_cfo_act_agency_indicator`; `opm_scope_group` | Original OPM CFO flag and the dashboard's derived CFO Act/other grouping. They can differ for FERC. |
| Blank OPM values | No matched OPM record, **not** zero employees. |

The selected occupational series are 0601 General Health Science, 1510 Actuarial Science, 1515 Operations Research, 1529 Mathematical Statistics, 1530 Statistician, 1560 Data Science, and 2210 Information Technology Management. `selected_series_total` adds their employee counts. This analyst-defined set is not an official OPM AI-workforce classification; 2210 covers IT work broadly. Education brackets are high school or less, some college/associate degree, bachelor's, master's/professional, doctorate, and no data reported.

**AI use cases per 10,000 matched employees** = `10,000 * (AI inventory rows in agencies with an OPM match) / (employees in those same agencies)`. The separate AI use-case total includes inventory rows from unmatched agencies. For the all-agency view, this is `10,000 * 1,667 / 1,255,050 = 13.28` after display rounding; the total inventory count shown is 1,757.

## Agency and component decisions

- The OPM extract produced 128 top-level dashboard groupings (24 with the CFO Act scope label) and 523 component groupings before restricting the dashboard to AI-inventory agencies. The CFO Act dashboard selector covers only the 18 CFO Act agencies represented in this local AI inventory **and** matched to OPM, not all 24.
- Of the 37 inventory agencies, 34 match OPM: 18 in the derived CFO Act group and 16 in the derived other/independent group. The Federal Reserve Board of Governors (50 use cases), Postal Regulatory Commission (1), and Tennessee Valley Authority (39) have no matched workforce row. OPM's [coverage notes](https://data.opm.gov/resources/data-sources) explicitly exclude the Federal Reserve Board and TVA; a missing dashboard value should never be interpreted as a zero workforce.
- OPM puts `BUREAU OF CONSUMER FINANCIAL PROTECTION` under `FEDERAL RESERVE SYSTEM`. The dashboard attributes its 1,408 employees to CFPB, not to the Federal Reserve Board.
- OPM puts `FEDERAL ENERGY REGULATORY COMMISSION` under `DEPARTMENT OF ENERGY`. The dashboard moves FERC's 1,475 employees to its own agency group and subtracts them from DOE, avoiding double counting. FERC retains its raw OPM CFO indicator, while `opm_scope_group` labels it independent for the dashboard.
- Other agency names use explicit aliases or normalized names in the build script. Component matching tries known bureau aliases, exact/variant names, an unambiguous substring, then a single-component fallback. The fallback is an assumption when an agency has just one OPM component.

Of 1,757 use-case rows, 1,523 have an OPM component match and 234 do not. Match methods were: 651 explicit aliases, 439 single-component fallbacks, 332 exact variants, 61 exact bureau names, and 40 unambiguous substring variants. The unmatched rows comprise 144 with no component match inside an OPM-matched agency and 90 belonging to the three agencies with no OPM match. Component-level AI counts can therefore be incomplete. Agency-level AI counts are retained even when OPM is missing.

## Validation and limits

For this snapshot, matched agencies sum to 1,255,050 employees and 1,667 AI inventory rows. The displayed total of 1,757 inventory rows also includes the 90 rows from the three unmatched agencies. The published dashboard uses precomputed aggregates; it does not expose the raw OPM file or the full use-case text. Do not add employee counts from the row-level inventory/component join, because a component workforce count repeats for every AI row matched to it.

This comparison pairs a September 2025 workforce snapshot with a 2024 AI inventory. Agency reporting practices, exclusions, different time periods, and imperfect bureau-name matches affect interpretation. The charts show association, not causation. A future public research repository should publish the processing scripts, small aggregate CSVs, source versions, tests, and a license before claiming full independent reproducibility.
