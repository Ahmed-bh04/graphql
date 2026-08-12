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
| `js/api.js` | Sign in, the stored JWT, the `graphql()` helper, and the profile query |
| `js/format.js` | XP and date formatting |
| `js/charts.js` | The three SVG graphs |
| `js/main.js` | Routing, the form, fetching the data, rendering the profile |

## Authentication

`POST https://learn.reboot01.com/api/auth/signin` with an `Authorization: Basic` header holding
base64 of `identifier:password`. The identifier can be either a username or an email — the endpoint
accepts both, so the value is passed through unchanged.

The returned JWT is kept in `localStorage` and sent as `Authorization: Bearer <token>` on every
GraphQL request. Logging out removes it. If the token has expired the GraphQL call fails, and the
app clears it and returns to the login form with a message explaining why.

## Routing

Two routes, `#/login` and `#/home`, so the address bar always says which view is on screen.

They are hash routes because GitHub Pages is a static file server: a path like `/home` would be a
request for a file that does not exist, and would 404. Everything after `#` is a fragment, which the
browser never sends to the server, so Pages always serves `index.html` and `applyRoute()` decides
what to show.

`applyRoute()` also guards both routes — it runs on load and on every `hashchange`, sending you to
`#/login` if you reach `#/home` without a token, and to `#/home` if you reach `#/login` with one.

## The three query types

All three are in the single `PROFILE_QUERY` in `js/api.js`:

- **Normal** — the `user` root field: flat fields, no arguments.
- **Nested** — each `transaction` also pulls the `object` it belongs to, which is what gives each bar
  in the project graph a real project name instead of a path segment.
- **Arguments** — the same `transaction` field takes
  `where: { type: { _in: $types } }, order_by: { createdAt: asc }`, called with
  `{ types: ['xp', 'level'] }`.

**It is one query in one request.** The user data and the transactions are two root fields of the
same document, so the whole profile loads in a single POST rather than one request per table — the
point of using GraphQL instead of REST.

## What is displayed

1. **Identification** — login, name, email, user id
2. **Total XP** — the total and the number of transactions it came from
3. **Audit ratio** — the ratio, XP done and XP received
4. **Level** — the highest level reached in the module

Only rows under `/bahrain/bh-module` are counted — in the XP total, the level and both XP graphs —
by the same `isModule` check in `js/main.js`, so every panel describes the same set of work.

The filter has to do two things. `/bahrain/bh-piscine` is a sibling of the module, so it falls
outside the prefix on its own. `piscine-js` sits *inside* the module tree and has to be excluded
explicitly, or its XP inflates the total and its exercises take over the project graph. The exact
match on the bare `/bahrain/bh-module` is there because level-up rows sit on the module root with no
project segment after it.

## Statistics section

Three graphs, all hand-written SVG built with `createElementNS` — no chart library:

- **XP over time** — a line and shaded area showing cumulative XP, with a labelled XP axis and dates
  along the bottom.
- **XP by project** — horizontal bars for the ten highest-earning projects, each labelled with the
  project name and its XP.
- **Audit ratio** — two bars comparing audit XP done against audit XP received, with the ratio read
  out underneath. It uses `totalUp` and `totalDown`, which the profile query already returned, so it
  costs no extra request.

Every graph is sized by `viewBox` with no fixed pixel width, so they scale with the page instead of
overflowing on a phone. The two full-width graphs use a 720-unit `viewBox`; the audit graph uses a
narrower 260-unit one because it sits in a side column, and reusing the wide box there would have
rendered it too small to read.
