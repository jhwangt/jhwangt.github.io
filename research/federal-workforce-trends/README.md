# Federal Workforce Trends

[Open the dashboard](index.html) to compare OPM employment snapshots from September 2025, February 2026, and July 2026. Choose an agency, then a bureau or OPM agency subelement. The page also shows selected occupational series and lets you combine education levels.

This is a fixed, static snapshot. Its HTML embeds aggregate counts and does not contain the three raw OPM downloads. Read [methods and limitations](METHODOLOGY.md), [source fingerprints](DATA.md), and [how the page was built](BUILD.md) before citing the numbers.

The dashboard lives at `https://jhwangt.github.io/research/federal-workforce-trends/`. The separate [AI inventory dashboard](../federal-workforce/) uses a different reporting period and purpose.

## Rebuild

The source code is in [`scripts/`](scripts/). To reproduce this page, obtain the three OPM employment files named in [DATA.md](DATA.md), place them in `data/raw/`, and run `python3 scripts/build_workforce_trends.py` from this folder. It writes `index.html` and local metadata. The raw files and local metadata directories are ignored by Git. Review the generated page before committing it.

No reuse license has been selected for the dashboard code or documentation. Source datasets retain their own terms.
