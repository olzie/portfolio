# itsolga.com API (Cloudflare Worker)

`worker.js` collects visit stats and chat briefs from the site (js/track.js) and serves them to /admin.
`schema.sql` creates the two D1 tables. Setup steps: see the guide linked from the admin page's README in the chat.
Nothing secret lives here: the admin routes check a Cloudflare Access token, the GitHub token stays in the admin's browser.
