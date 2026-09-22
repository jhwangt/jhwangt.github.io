# How this page was made

The dashboard uses Python's standard library, plain HTML/CSS, and browser JavaScript. GitHub Pages serves the generated static file.

1. [`scripts/build_workforce_trends.py`](scripts/build_workforce_trends.py) streams the six exact source files named in [DATA.md](DATA.md). It reads `agency`, `agency_subelement`, `count`, `cfo_act_agency_indicator`, `education_level_bracket`, and `occupational_series_code`.
2. The builder applies the existing agency mapping in [`scripts/build_opm_employment_counts.py`](scripts/build_opm_employment_counts.py), groups Department of Defense components, and separates CFPB and FERC.
3. It sums `count` by agency and OPM subelement, including selected occupation and education categories. It checks that bureau totals equal agency totals and hashes the complete source files.
4. It combines the aggregates with [`scripts/workforce_trends_template.html`](scripts/workforce_trends_template.html) and [`scripts/workforce_trends_app.js`](scripts/workforce_trends_app.js) to generate [`index.html`](index.html).
5. Browser JavaScript filters the aggregates, plots the six observations at their actual date spacing on a zero-based y-axis, and updates the cards and comparison tables. The bureau comparison keeps up to four selected subelements when the agency filter changes, allowing cross-agency comparison. Lines between points do not supply monthly data.

To rebuild, place the six exact filenames in [DATA.md](DATA.md) under `data/raw/` and run `python3 scripts/build_workforce_trends.py`. The raw files are intentionally absent from this public repository. Check source hashes, totals, missing records, and links before publishing a new snapshot.
