# Methodology and limitations

## Sources and period

The employment measures come from the September 2025 OPM EHRI employment extract. The AI measures come from the OMB 2024 Federal AI Use Case Inventory. These are different reporting periods, so comparisons are cross-sectional and exploratory. This site contains a generated snapshot, not a live connection to either source.

Source references: [OPM workforce data](https://data.opm.gov/explore-data/analytics/workforce-size-and-composition) and [OMB inventory repository](https://github.com/ombegov/2024-Federal-AI-Use-Case-Inventory).

## Measures

- **Employees:** Sum of the OPM extract's `count` field for the selected agency or component. The workforce view uses records marked `CFO ACT AGENCY` in the OPM extract.
- **Education:** OPM education brackets expressed as a share of employees in the same selected scope. `No data` is retained as a category.
- **Selected technical series:** Sum of employees in OPM occupational series 0601 General Health Science, 1510 Actuarial Science, 1515 Operations Research, 1529 Mathematical Statistics, 1530 Statistician, 1560 Data Science, and 2210 Information Technology Management. The percentage uses all employees in the selected scope as its denominator. The seven series are an analyst-defined selection, not an official OPM AI workforce classification. Series 2210 covers IT management broadly; it does not identify only data management staff.
- **AI use cases:** Count of rows in the 2024 inventory attributed to an agency. This is a reporting count, not necessarily a count of active projects, distinct systems, AI staff, or spending.
- **AI use cases per 10,000 employees:** Inventory row count divided by the matched September 2025 OPM employee count, multiplied by 10,000.

## Agency and bureau matching

The analysis normalizes agency names between OMB and OPM and groups the OPM `agency` and `agency_subelement` fields into a department or agency hierarchy. The dashboard offers an aggregate for the CFO Act agencies and departments that have an OPM workforce match in the prepared data. It also lists other independent agencies represented in the AI inventory; a blank OPM value means there is no workforce match in this prepared join, not zero employees.

For component-level AI counts, the inventory's bureau field is matched to OPM subagency names using exact names, known aliases, and normalized variants. Some rows remain unmatched. Component-level AI counts therefore describe matched inventory rows and can understate the total for an agency.

## Reading the charts

The workforce and AI datasets have different coverage, definitions, and time periods. A point on the AI versus workforce chart shows two reported quantities for the same matched organization; its position does not establish that staffing caused AI activity. Differences in reporting practice and organizational structure can also affect comparisons. Use the source datasets and institutional context before making policy or performance claims.

## Reproducibility

The published `index.html` embeds the aggregate data used by the dashboard. It was generated in the dissertation research workspace from processed OPM and OMB files. This public package is sufficient to inspect the published figures and code, but it does not include the raw 1.6 GB OPM employment extract or the intermediate processing files needed for a full rebuild. Those source files should be obtained from the linked primary publishers for independent replication.
