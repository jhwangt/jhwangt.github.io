# Methodology and limitations

## Sources and period

The employment measures come from the September 2025 OPM EHRI employment extract. The AI measures come from the OMB 2024 Federal AI Use Case Inventory. These are different reporting periods, so comparisons are cross-sectional and exploratory. This site contains a generated snapshot, not a live connection to either source.

Source references: [OPM workforce data](https://data.opm.gov/explore-data/analytics/workforce-size-and-composition) and [OMB inventory repository](https://github.com/ombegov/2024-Federal-AI-Use-Case-Inventory).

The local 2024 inventory CSV used for this dashboard has 1,757 rows. The OMB repository's published summary describes a larger snapshot; this dashboard should not be read as a count of every use case currently in that repository. The exact local source-file fingerprints and processing steps are in the [data guide](DATA.md). The upstream OMB commit from which the local CSV was obtained was not recorded.

## Measures

- **Employees:** Sum of the OPM extract's `count` field for the selected agency or component. The workforce view uses both `CFO ACT AGENCY` and `OTHER AGENCY` records. The all-agency total covers AI inventory agencies with an OPM match, not the entire federal workforce. OPM's published [EHRI coverage notes](https://data.opm.gov/resources/data-sources) identify excluded populations, including the Federal Reserve Board of Governors and Tennessee Valley Authority.
- **Education:** OPM education brackets expressed as a share of employees in the same selected scope. `No data` is retained as a category.
- **Selected technical series:** Sum of employees in OPM occupational series 0601 General Health Science, 1510 Actuarial Science, 1515 Operations Research, 1529 Mathematical Statistics, 1530 Statistician, 1560 Data Science, and 2210 Information Technology Management. The percentage uses all employees in the selected scope as its denominator. The seven series are an analyst-defined selection, not an official OPM AI workforce classification. Series 2210 covers IT management broadly; it does not identify only data management staff.
- **AI use cases:** Count of rows in the 2024 inventory attributed to an agency. This is a reporting count, not necessarily a count of active projects, distinct systems, AI staff, or spending.
- **AI use cases per 10,000 employees:** AI inventory rows from agencies with an OPM workforce match divided by employees at those same agencies, multiplied by 10,000. The separate AI use case total includes every agency in the selected scope, including those with no OPM match. In the all-agency view, 1,667 matched inventory rows and 1,255,050 matched employees produce 13.28 per 10,000; the displayed AI use case total is 1,757.

## Agency and bureau matching

The analysis normalizes agency names between OMB and OPM and groups the OPM `agency` and `agency_subelement` fields into a department or agency hierarchy. The CFO Act scope contains the 18 CFO Act agencies and departments represented in this AI inventory with an OPM match. It is not a total for all 24 CFO Act agencies. The other independent-agency group includes 16 with OPM matches and three without a match in this extract: the Federal Reserve Board of Governors, Postal Regulatory Commission, and Tennessee Valley Authority. A blank OPM value does not mean zero employees.

OPM records CFPB as `BUREAU OF CONSUMER FINANCIAL PROTECTION` under `FEDERAL RESERVE SYSTEM`; the dashboard attributes those 1,408 employees to CFPB. OPM records FERC's 1,475 employees under the Department of Energy. For dashboard grouping, FERC is shown separately and its employees are removed from DOE's total, preventing double counting. FERC's raw OPM CFO flag is retained in the processed data, but its dashboard group is independent agency.

For component-level AI counts, the inventory's bureau field is matched to OPM subagency names using exact names, known aliases, normalized variants, and a fallback when an agency has only one OPM subagency. Of 1,757 inventory rows, 1,523 receive a component match and 234 do not. The fallback is an assumption, not direct evidence that the bureau name agrees. Component-level AI counts therefore describe matched inventory rows and can understate the total for an agency. Never sum employee counts across the row-level AI/OPM join: the same component workforce figure is repeated on each matched use-case row.

## Reading the charts

The workforce and AI datasets have different coverage, definitions, and time periods. A point on the AI versus workforce chart shows two reported quantities for the same matched organization; its position does not establish that staffing caused AI activity. Differences in reporting practice and organizational structure can also affect comparisons. Use the source datasets and institutional context before making policy or performance claims.

## Reproducibility

The published `index.html` embeds the aggregate data used by the dashboard. It was generated in the dissertation research workspace from processed OPM and OMB files. This public package is sufficient to inspect the published figures and client-side code, but it does not include the processing scripts, raw 1.6 GB OPM employment extract, or intermediate files needed for a full rebuild. The [data guide](DATA.md) records the pipeline and source fingerprints; obtain raw data from the primary publishers for independent replication. A separate public research repository is planned for the scripts and downloadable aggregate tables.
