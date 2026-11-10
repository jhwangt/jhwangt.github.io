"""Fetch only approved issues and publish only their titles and states."""

import json
import os
from datetime import datetime
from pathlib import Path
import sys
from urllib.error import HTTPError, URLError
from urllib.request import HTTPRedirectHandler, Request, build_opener
from zoneinfo import ZoneInfo

REPOSITORY = "https://api.github.com/repos/jhwangt/ingenuity-season-data"
APPROVED_ISSUES = (12, 13, 14, 15, 16, 17, 18, 19)


class NoRedirect(HTTPRedirectHandler):
    """Keep the private API credential on the original request URL."""

    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def read_issue(number, token):
    request = Request(
        f"{REPOSITORY}/issues/{number}",
        headers={
            "Authorization": f"Bearer {token}",
            "Accept": "application/vnd.github+json",
            "User-Agent": "Ingenuity-Season-HQ-summary",
        },
    )
    try:
        with build_opener(NoRedirect()).open(request, timeout=20) as response:
            issue = json.load(response)
    except HTTPError as error:
        raise SystemExit(f"Could not read approved issue #{number} (HTTP {error.code}).") from None
    except (URLError, TimeoutError, ValueError):
        raise SystemExit(f"Could not read approved issue #{number}.") from None
    title, state = issue.get("title"), issue.get("state")
    if (issue.get("number") != number or "pull_request" in issue
            or not isinstance(title, str) or not title.strip()
            or state not in {"open", "closed"}):
        raise SystemExit(f"Unexpected data for approved issue #{number}.")
    return {"title": title, "status": state.capitalize()}


def main():
    token = os.environ.get("SEASON_HQ_ISSUES_READ_TOKEN")
    if not token:
        raise SystemExit("Set the SEASON_HQ_ISSUES_READ_TOKEN repository secret.")
    issues = [read_issue(number, token) for number in APPROVED_ISSUES]
    checked = datetime.now(ZoneInfo("America/New_York")).date().isoformat()
    summary = {"checked": checked, "issues": issues}
    Path(sys.argv[1]).write_text(json.dumps(summary, ensure_ascii=False, indent=2) + "\n")
    print(f"Prepared title and status for {len(issues)} approved issues.")


if __name__ == "__main__":
    main()
