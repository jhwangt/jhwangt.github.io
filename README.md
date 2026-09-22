# John H. Wan's site

Source for <https://jhwangt.github.io/>. The root `index.html` is the public homepage. GitHub Pages serves the static files from the `main` branch.

## Published projects

- [Federal Workforce Dashboard](research/federal-workforce/index.html): interactive OPM employment and OMB AI inventory analysis. See its [methods and limitations](research/federal-workforce/METHODOLOGY.md).
- [Federal Workforce Trends](research/federal-workforce-trends/index.html): six OPM employment snapshots with agency, bureau, occupation, and education comparisons. See its [methods and limitations](research/federal-workforce-trends/METHODOLOGY.md).

## Previous site

The former BrickBotBuilders pages and Python workshop are preserved under `archive/brickbotbuilders/` and are no longer linked from the homepage. This is an unlisted archive, **not private storage**: anyone who knows or guesses a URL can still access files in a public GitHub Pages repository. Remove files from the repository and its history if they must be private.

## Local preview

Open `index.html` in a browser, or run `python3 -m http.server 8765` in this directory and visit <http://127.0.0.1:8765/>.

## Updating research tools

Keep each tool in a separate folder under `research/`. Include its source dates, methods, and limitations. The dashboard is a self-contained snapshot; updating it requires copying a newly generated HTML file to `research/federal-workforce/index.html` and updating the accompanying documentation.
