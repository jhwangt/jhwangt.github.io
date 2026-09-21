# Data and provenance

The dashboard was built from three local, pipe-delimited [OPM Federal Workforce Data employment downloads](https://data.opm.gov/get-data/data-downloads). These are EHRI Status month-end snapshots, not a live feed.

| Snapshot | Local file | SHA-256 | Source rows | Employees summed from `count` | OPM subelement groupings |
| --- | --- | --- | ---: | ---: | ---: |
| September 2025 | `employment_202509_2.txt` | `cb0b486d41c1e8debe42cdf9971b1a1efd8abb93e87753d565e54ab460e23676` | 2,190,219 | 2,190,219 | 523 |
| February 2026 | `employment_202602_1.txt` | `c9761882e1405b78528cd92710c6922aebb28a9bc1c1866a418473e825872f36` | 2,028,138 | 2,028,138 | 516 |
| July 2026 | `employment_202607_1_2026-09-21.txt` | `46a6147eec6a4c5d35f377ffacb29a8f8514fc4599be0b1d18a977283b3b33db` | 2,020,230 | 2,020,230 | 516 |

Each file produced 24 CFO Act agency groupings. The other-agency group contained 104 groupings in September 2025 and 102 in each 2026 snapshot. The displayed totals use all agency groupings present in each file; coverage changes can affect comparisons. An absent agency or subelement is shown as missing, never zero.

The Python builder hashes each complete input file while streaming it. It sums the `count` field by dashboard agency and by `(dashboard agency, original OPM component agency, agency_subelement)`. Bureau-level employee totals were checked against their agency totals for each snapshot. Education bracket counts sum to employee totals for each bureau and agency. The generated HTML embeds only aggregate data, but some bureau cells are small; review the exact output before reuse or republication.

For the selected series, education definitions, agency mappings, and interpretation limits, see [METHODOLOGY.md](METHODOLOGY.md). OPM's [data sources and coverage notes](https://data.opm.gov/resources/data-sources) explain EHRI Status, exclusions, and release issues.
