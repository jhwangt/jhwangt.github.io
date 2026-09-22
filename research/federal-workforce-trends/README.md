# Federal Workforce Trends

[Open the dashboard](index.html) to compare six OPM employment snapshots from September 2022 through July 2026. Choose an agency and, where available, an OPM agency subelement. The bureau comparison panel can plot up to four individually selected subelements, including ones from different agencies. Compare employee counts, selected occupational series, and combinations of education levels.

This static page embeds aggregate counts. Read the [methods and limitations](METHODOLOGY.md), [source fingerprints](DATA.md), and [build guide](BUILD.md) before citing numbers.

The published dashboard is at [jhwangt.github.io/research/federal-workforce-trends/](https://jhwangt.github.io/research/federal-workforce-trends/). The separate [AI inventory dashboard](../federal-workforce/) uses a different reporting period and purpose.

To reproduce this page, obtain the six exact OPM files named in [DATA.md](DATA.md), place them in `data/raw/`, and run `python3 scripts/build_workforce_trends.py` from this folder. The builder writes `index.html` and local metadata. Raw files and local metadata are ignored by Git.

No reuse license has been selected for the dashboard code or documentation. Source datasets retain their own terms.
