# Data and provenance

The dashboard uses six local, pipe-delimited [OPM Federal Workforce Data employment downloads](https://data.opm.gov/get-data/data-downloads). They are EHRI Status month-end snapshots, not a live feed. Snapshot dates come from the source filenames.

| Snapshot | Local file | SHA-256 | Source rows | Employees summed from `count` | Agency groupings | OPM subelement groupings |
| --- | --- | --- | ---: | ---: | ---: | ---: |
| September 2022 | `employment_202209_3_2026-09-21.txt` | `44fc8f75f8a8b9c2a9ebe21f51064b4fbf048a0849cff353245267ca71d38ab3` | 2,180,296 | 2,180,296 | 128 | 538 |
| September 2023 | `employment_202309_3_2026-09-21.txt` | `9666dd7e2946bc29743597f301d49e886ca37b566aa25dd71bec95e45a648880` | 2,261,016 | 2,261,016 | 132 | 544 |
| September 2024 | `employment_202409_3_2026-09-21.txt` | `463e651fbb8ffd67fe5a6e508762ad0f027256de3b1a42cf6587d398b293ac6a` | 2,313,216 | 2,313,216 | 130 | 542 |
| September 2025 | `employment_202509_3_2026-09-21.txt` | `90caaf44f4c92832995ef4e2e91da29c470e708d9e1b2b8129b576e340cfc524` | 2,190,219 | 2,190,219 | 128 | 523 |
| February 2026 | `employment_202602_1.txt` | `c9761882e1405b78528cd92710c6922aebb28a9bc1c1866a418473e825872f36` | 2,028,138 | 2,028,138 | 126 | 516 |
| July 2026 | `employment_202607_1_2026-09-21.txt` | `46a6147eec6a4c5d35f377ffacb29a8f8514fc4599be0b1d18a977283b3b33db` | 2,020,230 | 2,020,230 | 126 | 516 |

Each file produced 24 CFO Act agency groupings. The other-agency grouping contains the remaining agency groupings in that file. An absent agency or subelement is displayed as missing, not zero. Changing agency coverage can affect comparisons.

The newly added `employment_202509_3_2026-09-21.txt` is used for September 2025 instead of the earlier local `employment_202509_2.txt`. Both sum to 2,190,219 employees, but their SHA-256 hashes differ. This choice identifies the exact local file used; it does not establish why the releases differ. The separate AI inventory dashboard may still use the earlier file.

The builder hashes each complete input while streaming it and sums `count` by agency and by `(dashboard agency, original OPM component agency, agency_subelement)`. Bureau totals are checked against agency totals in every snapshot. The published HTML contains aggregate counts only. Some bureau cells are small.

For definitions and interpretation limits, see [METHODOLOGY.md](METHODOLOGY.md). See OPM’s [data sources and coverage notes](https://data.opm.gov/resources/data-sources) for EHRI Status exclusions and release issues.
