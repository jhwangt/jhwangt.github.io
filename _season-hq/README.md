# Team Ingenuity #24220 · BIOBUZZ Season HQ

A shared FTC season workspace for 2026–27. Records live in Cloudflare D1. Coaches and students update records in the app, and Git tracks changes to the app itself.

## Start using the hub

1. Review tentative goals and role assignments. The starter roster uses roles published on the [team site](https://ingenuity.team/).
2. Give work an owner, due date, status, and next action. Use the source field for rule references, CAD, test evidence, or issue links.
3. Open Meeting log and choose **Use meeting template**. Save decisions, add each actionable follow-up as an owned entry, and mark the dated meeting **Done**. The dashboard then shows entries updated from that date onward.
4. Use **Refresh** to load teammates’ edits. If two people edit the same entry, the app asks the second person to refresh before saving.

## Publish from Git

Push this folder to a private repository. Connect it to [Cloudflare Workers Builds](https://developers.cloudflare.com/workers/ci-cd/builds/git-integration/) to deploy on pushes. Keep the team’s existing public website for announcements and sponsors.

- Create a D1 database named `ingenuity-season`. Replace the placeholder database ID in `wrangler.toml` with the new ID.
- Apply the schema with `npx wrangler d1 migrations apply ingenuity-season --remote`.
- Set the build command to `node build.mjs` and the deploy command to `npx wrangler deploy`. Use the Worker name in `wrangler.toml` when connecting the repo.
- Protect the entire app, including `/api/records`, with [Cloudflare Access](https://developers.cloudflare.com/workers/configuration/cloudflare-access/). Allow only team accounts and disable any unprotected alternate hostnames and preview URLs before adding team data. Every admitted user can edit. The “Updated by” field is a self-reported label.
- Check the deployed app with an allowed account and an unauthenticated browser before sharing it. Live records are stored in D1 and do not travel with the Git repository or source ZIP.

For local use, run `node build.mjs`, `npx wrangler d1 migrations apply ingenuity-season --local`, then `npx wrangler dev`. Cloudflare needs its own D1 binding even if the app is already deployed on Sites.
