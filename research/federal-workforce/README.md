# Federal Workforce Dashboard

An interactive, exploratory view of federal employment and reported AI use cases. [Open the dashboard](index.html).

## What you can explore

- Federal workforce counts by agency and, where available, component or bureau
- CFO Act and other independent agencies, individually or by inventory scope
- Education distribution and seven selected occupational series, including 1529 Mathematical Statistics
- Reported AI use cases alongside workforce size and selected series counts

The dashboard is a self-contained static HTML file. It uses embedded aggregate data and runs in a browser; it does not need a server, account, or API key. `index.html` is the GitHub Pages entry point.

## Data and interpretation

- **Employment:** U.S. Office of Personnel Management (OPM) EHRI employment extract, September 2025. [OPM workforce data](https://data.opm.gov/explore-data/analytics/workforce-size-and-composition).
- **AI use cases:** [OMB 2024 Federal AI Use Case Inventory](https://github.com/ombegov/2024-Federal-AI-Use-Case-Inventory). The file used in the analysis contains 1,757 inventory rows.
- **Snapshot:** The dashboard was rebuilt from the research project in September 2026. It is not a live feed.

Read [Methodology and limitations](METHODOLOGY.md) and the [data guide](DATA.md) before using the figures in research or reporting. Counts of reported AI use cases are not counts of unique deployed AI systems or measures of effectiveness. Relationships shown in the charts are descriptive, not causal.

## Files

- `index.html`: interactive dashboard and the aggregate data it displays
- `METHODOLOGY.md`: sources, calculations, scope, and limitations
- `DATA.md`: source-file fingerprints, field definitions, joins, and validation totals

The full dissertation working directory contains source downloads, intermediate analysis, and IRB materials. Those files are intentionally outside this public site package. The published dashboard is a fixed snapshot; rebuilding it from raw sources requires the separate research workflow. The processing scripts and downloadable aggregate tables are not yet published in a separate research repository.

## Run locally

Open `index.html` in a browser, or from this folder run:

```bash
python3 -m http.server 8765
```

Then visit <http://127.0.0.1:8765/>.

## Citation

When citing the dashboard, include the author, dashboard title, repository URL, access date, and the underlying OPM and OMB source datasets. Add a release tag or archived DOI for a versioned dissertation citation.

## License

No reuse license has been selected for the dashboard code or documentation. Source datasets retain their own terms. Add a `LICENSE` file after choosing the terms under which you want others to reuse your work.
