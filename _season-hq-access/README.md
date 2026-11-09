# Season HQ access service

1. In Vercel, import `jhwangt/jhwangt.github.io` and set **Root Directory** to `_season-hq-access`. Use the **Other** framework preset.
2. Add these as **Production** secrets in Vercel:
   - `GITHUB_ISSUES_TOKEN` — fine-grained token scoped to `jhwangt/ingenuity-season-data` with **Issues: Read and write**.
   - `TEAM_PASSWORD` — a password manager-generated value, 24–128 printable ASCII characters without spaces. Share this password with approved team members.
3. Deploy and use the stable production domain. The API is `/api/issues`. Supply the production domain to configure the Season HQ frontend.

The API accepts the team password as a bearer credential over HTTPS and keeps the GitHub token on the server. It only supports listing, reading, creating, and updating issues on the fixed private repository. Closing an issue is an update. GitHub attributes edits to the token owner. Rotate the shared password to revoke access. Use Vercel's firewall to rate-limit requests if available on your plan.
