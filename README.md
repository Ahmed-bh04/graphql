# GraphQL Profile

A profile page that signs in to the school platform, queries the GraphQL API for my own data, and
displays it along with three SVG statistic graphs.

**Live site:** https://ahmed-bh04.github.io/graphql/

## Running locally

ES modules do not load over `file://`, so the folder has to be served over HTTP:

```bash
python -m http.server 8000
# then open http://localhost:8000
```

## Structure

| File | Purpose |
|---|---|
| `index.html` | Both views — the login form and the profile — one hidden at a time |
| `css/style.css` | All styling |
| `js/api.js` | Sign in, the stored JWT, the `graphql()` helper, and the three queries |
| `js/format.js` | XP and date formatting |
| `js/charts.js` | The three SVG graphs |
| `js/main.js` | Wires up the form, fetches the data, renders the profile |

## Authentication

`POST https://learn.reboot01.com/api/auth/signin` with an `Authorization: Basic` header holding
base64 of `identifier:password`. The identifier can be either a username or an email — the endpoint
accepts both, so the value is passed through unchanged.

The returned JWT is kept in `localStorage` and sent as `Authorization: Bearer <token>` on every
GraphQL request. Logging out removes it. If the token has expired the GraphQL call fails, and the
app clears it and returns to the login form.

## The three query types

All three live in `js/api.js`:

- **Normal** — `USER_QUERY`: flat fields from the `user` table.
- **Nested** — `XP_QUERY`: each `transaction` also pulls the `object` it belongs to, which is what
  gives each bar in the second graph a project name instead of a path.
- **Arguments** — `PROGRESS_QUERY`: `query Progress($type: String!)`, called with `{ type: 'project' }`.

## What is displayed

1. **Identification** - login, name, email, user id
2. **XP** - total XP and the number of transactions it came from
3. **Audits** - ratio, XP done, XP received
4. **Projects passed** - passed out of graded

Piscine rows are excluded everywhere — from the XP total, the project counts and all three graphs —
by the same `isCursus` check, so every panel describes the same set of work and the XP figure matches
the platform's own profile page.

## Statistics section

Three graphs, all hand-written SVG (no chart library):

- **XP over time** - a line and shaded area showing cumulative XP, with a labelled XP axis and dates
  along the bottom.
- **XP by project** - horizontal bars for the ten highest-earning projects, each labelled with the
  project name and its XP.
- **Projects passed and failed** - a donut built from SVG arc paths, with the pass rate in the
  middle. It reuses the data `PROGRESS_QUERY` already fetched, so it costs no extra request.

All three share the same 720-unit `viewBox` width and carry no fixed pixel size, so they scale with
the page instead of overflowing on a phone.
