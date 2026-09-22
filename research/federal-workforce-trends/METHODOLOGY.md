# Workforce trends: research design notes

## What this dashboard answers

The [dashboard](index.html) compares six OPM EHRI Status snapshots: September 2022, September 2023, September 2024, September 2025, February 2026, and July 2026. Its selector offers all available agencies, all 24 CFO Act agency groupings, other agencies, and individual agencies. Once an individual agency is selected, a second selector and table show its OPM agency subelements (bureau-level records). A separate comparison panel lets readers select up to four individual subelements; selections persist across agency changes, so bureaus from different agencies can be compared on the same zero-based chart and six-date table. It supports total employees, seven selected occupational series (count and share), and selected education levels (count and share) at the selected scope. Education levels can be combined with checkboxes. The "Bachelor's or higher" preset selects bachelor's, master's/professional, and doctorate; the "Above college: graduate degrees" preset selects master's/professional and doctorate. "No data reported" is a separate optional category. Version 2 separates Overview, Agencies, Bureaus, and Composition into tabs. Agency, subelement, and measure controls persist across tabs. The agency ranking uses the selected measure and requires both endpoint observations. The agency and bureau tables show all six observations and the change between the first and last snapshots. Connecting lines do not imply monthly observations. All line-chart y-axes start at zero. When a selected-series or education measure is chosen, Overview opens an explanation with the latest-snapshot composition for the current scope. Education checkboxes and presets appear there as well as in Composition, and both views use the same selections.

Useful dissertation questions include:

1. Which agencies experienced the largest absolute and proportional workforce changes during the observed period?
2. Did the selected technical series change at the same rate as total employment within each agency?
3. Did the distribution of selected technical capacity across agencies become more concentrated?
4. How sensitive are these findings to the occupational-series definition, especially inclusion of broad 2210 IT management and 0601 health science?
5. Do agency changes coincide with differences in reported AI use cases? This is exploratory because the AI inventory is a different reporting period and counts reported use cases, not deployed systems or staff.

## Definitions and cautions

- Each OPM file is read as pipe-delimited text. `count` is summed; the build does not rely on row count as a general rule, even though each of these files currently sums to its row count.
- Agency names follow the existing project's OPM-to-dashboard mapping. The Department of Defense components are grouped together. CFPB is separated from the Federal Reserve System and FERC from the Department of Energy, avoiding overlap in totals.
- Bureau-level records group OPM `agency_subelement` under its original component agency and mapped dashboard agency. An OPM subelement may represent an entire agency or a reporting unit rather than a conventional bureau; the dashboard retains the source label. The original component distinguishes similarly named subelements under Department of Defense components. A subelement absent from a snapshot is shown as missing, not zero. Bureau employee counts sum exactly to agency counts in each file. Counts by snapshot are listed in the data provenance table.
- CFO Act membership uses the OPM extract's `cfo_act_agency_indicator` field. FERC is shown with other agencies because this dashboard separates it from the Department of Energy. There are 24 CFO Act groupings in each local snapshot. "Other agencies" includes all remaining OPM groupings present in each file, which is broader than only the independent agencies represented in the 2024 AI inventory.
- The selected series are 0601, 1510, 1515, 1529, 1530, 1560, and 2210. This is an analyst-defined proxy, **not an official AI workforce classification**. Series 2210 is broad IT management.
- Education counts come from OPM's `education_level_bracket` field. Multiple selected categories are summed once per employee; the share denominator is the entire workforce in the selected agency or group. Education categories sum to the employee total in each of the six local files. Selecting all reported levels excludes the separate "No data reported" category.
- OPM's raw agency label `DFC` is displayed as [U.S. International Development Finance Corporation](https://www.dfc.gov/who-we-are/about-us).
- The dashboard totals all agency groupings present in each file. A changing set of agencies can affect the total. For agency comparisons, a missing period is shown as missing, never zero.
- The optional fixed-agency mode intersects agency groupings present in all six source files, then uses only that common set for aggregate totals and rankings. This yields 121 groupings in the current files. It is a coverage sensitivity check, not proof that group definitions or reporting practices stayed identical.
- OPM currently flags incomplete June and July 2026 Department of War submissions affecting Status data. The dashboard uses the named July 2026 file and does not fill missing records or correct its total. Review [OPM data quality](https://data.opm.gov/resources/data-quality) and [release notes](https://data.opm.gov/info-and-help/release-notes) before interpreting recent Department of Defense or government-wide changes.
- OPM describes EHRI Status as a month-end snapshot and notes exclusions, delayed submissions, and data quality checks. Consult [OPM data sources](https://data.opm.gov/resources/data-sources) and the [download page](https://data.opm.gov/get-data/data-downloads) before drawing substantive conclusions.
- Trends are descriptive. They do not establish that AI adoption caused staffing changes or that workforce changes caused AI adoption.

## Rebuild and provenance

Run `python3 scripts/build_workforce_trends.py` from this directory. The script reads only the six named local employment files, streams them into agency aggregates, embeds those aggregates in `workforce_trends.html`, and records the input filenames, SHA-256 hashes, row counts, and employee totals in `data/processed/workforce_trends_metadata.json`. Raw files stay outside the dashboard HTML.

Employee and source-row totals for all six snapshots are listed in the [data provenance table](DATA.md). These values are as extracted from the named local files; check OPM release-specific quality notes before interpreting differences as changes in the entire federal workforce.

## Next data additions worth prioritizing

1. Add a matched-agency panel that holds the agency set fixed across periods and flags name or coverage changes.
2. Add OPM Dynamics hiring and separation data if the thesis needs flows rather than status counts. A fall in a status count alone cannot distinguish retirements, other separations, hiring slowdowns, or organizational reclassification.
3. Add age and retirement-eligibility analysis only after validating the available OPM fields and the cohort definitions.
4. Add the newest OMB AI inventory as a separate, versioned data source if longitudinal AI reporting is central to the thesis. Do not interpret different inventory vintages as a clean adoption time series without assessing reporting changes.
