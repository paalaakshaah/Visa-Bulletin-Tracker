# PostHog Insights

All insights below were created via PostHog's REST API
(`https://us.posthog.com/api/projects/525462/...`) rather than through the
UI, using a Personal API Key scoped to `insight:write` + `dashboard:write`.

They're split across two dashboards, since PostHog dashboards don't
support in-page tabs -- this is the closest equivalent (two separate pages
filed next to each other) rather than mixing everything on one page with a
section header (which was tried first and dropped):

- **Engagement** (`https://us.posthog.com/project/525462/dashboard/1912995`)
  -- general site engagement: #2-#4.
- **Onboarding** (`https://us.posthog.com/project/525462/dashboard/1926163`)
  -- everything about the onboarding funnel: #1, #5-#9.

## Dashboards

```bash
curl -s -X POST "https://us.posthog.com/api/projects/525462/dashboards/" \
  -H "Authorization: Bearer $POSTHOG_PERSONAL_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"name": "Engagement", "description": "Visa Bulletin Tracker engagement metrics"}'
```

Created dashboard id: `1912995`

```bash
curl -s -X POST "https://us.posthog.com/api/projects/525462/dashboards/" \
  -H "Authorization: Bearer $POSTHOG_PERSONAL_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"name": "Onboarding", "description": "Visa Bulletin Tracker onboarding funnel metrics", "folder": "Unfiled/Dashboards"}'
```

Created dashboard id: `1926163`. Filed in the same folder as Engagement
(`folder` isn't settable at creation time -- it came back `null` and had
to be set via a follow-up `PATCH`) and pinned, so it's as easy to find as
Engagement in the dashboard list.

Insights #1 and #5-#9 were originally created on the Engagement dashboard
(with a `## Onboarding` markdown text-card header grouping them, per an
earlier iteration of this doc), then relocated to the new Onboarding
dashboard one tile at a time via the (undocumented) `move_tile` endpoint:

```bash
curl -s -X PATCH "https://us.posthog.com/api/projects/525462/dashboards/1912995/move_tile/" \
  -H "Authorization: Bearer $POSTHOG_PERSONAL_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"to_dashboard": 1926163, "tile": {"id": <dashboard_tile_id>}}'
```

Note `<dashboard_tile_id>` is the dashboard *tile* id (from a dashboard's
`tiles[].id`), not the insight id. The header text tile was left behind
with no tiles under it and disappeared on its own -- no explicit deletion
call was needed.

The `dashboards` array in each insight's creation command below reflects
where it lives now (Onboarding dashboard id `1926163` for the onboarding
insights), not the Engagement id it may have originally been created
under.

## Engagement dashboard

### 2. Page visits

Daily count of `$pageview` events. Requires `capture_pageview: true` in
`frontend/components/PostHogInit.js` (Vercel Analytics also tracks
pageviews independently/redundantly, which is fine -- the two serve
different dashboards).

```bash
curl -s -X POST "https://us.posthog.com/api/projects/525462/insights/" \
  -H "Authorization: Bearer $POSTHOG_PERSONAL_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Page visits",
    "dashboards": [1912995],
    "query": {
      "kind": "InsightVizNode",
      "source": {
        "kind": "TrendsQuery",
        "series": [
          { "kind": "EventsNode", "event": "$pageview", "name": "$pageview", "math": "total" }
        ],
        "interval": "day"
      }
    }
  }'
```

Insight id: `10498146`

### 3. Dashboard vs Trends tab clicks

Daily count of `tab_changed` events, broken down by the `tab` event
property so each tab gets its own bar, displayed as a per-day bar chart
(`trendsFilter.display: "ActionsBar"`).

This tracks tab *views*, not just clicks: `frontend/app/page.js` fires
`tab_changed` both when the nav buttons are clicked and via a `useEffect`
whenever the currently-shown tab changes (including once on initial
render). Trends is the default tab, so a user who never clicks a tab
button still counts as a Trends view -- without this, only explicit clicks
were tracked and the default Trends landing was invisible in this metric.

```bash
curl -s -X POST "https://us.posthog.com/api/projects/525462/insights/" \
  -H "Authorization: Bearer $POSTHOG_PERSONAL_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Dashboard vs Trends tab clicks",
    "dashboards": [1912995],
    "query": {
      "kind": "InsightVizNode",
      "source": {
        "kind": "TrendsQuery",
        "series": [
          { "kind": "EventsNode", "event": "tab_changed", "name": "tab_changed", "math": "total" }
        ],
        "interval": "day",
        "breakdownFilter": { "breakdown_type": "event", "breakdown": "tab" }
      }
    }
  }'
```

Insight id: `10498152`. Later updated (via `PATCH
/api/projects/525462/insights/10498152/`) to render as a bar chart instead
of the default line chart, by adding `"trendsFilter": { "display":
"ActionsBar" }` to the `query.source` object alongside the existing
`breakdownFilter` and `interval`.

### 4. USCIS case status button clicks

Daily count of `uscis_status_clicked` events, fired from
`frontend/components/UscisCaseStatusLink.js` when the "Check My Case
Status on USCIS" button (shown at the bottom of both the Dashboard and
Trends pages) is clicked.

```bash
curl -s -X POST "https://us.posthog.com/api/projects/525462/insights/" \
  -H "Authorization: Bearer $POSTHOG_PERSONAL_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "USCIS case status button clicks",
    "dashboards": [1912995],
    "query": {
      "kind": "InsightVizNode",
      "source": {
        "kind": "TrendsQuery",
        "series": [
          { "kind": "EventsNode", "event": "uscis_status_clicked", "name": "uscis_status_clicked", "math": "total" }
        ],
        "interval": "day"
      }
    }
  }'
```

Insight id: `10498155`

## Onboarding dashboard

### 1. Onboarding completion rate (% of daily users)

Percentage of daily unique users who complete the welcome/onboarding form
(`onboarding_completed`) vs. skip it (`onboarding_skipped`), using a
formula so the two are shown as a single normalized percentage rather than
raw counts.

```bash
curl -s -X POST "https://us.posthog.com/api/projects/525462/insights/" \
  -H "Authorization: Bearer $POSTHOG_PERSONAL_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Onboarding completion rate (% of daily users)",
    "dashboards": [1926163],
    "query": {
      "kind": "InsightVizNode",
      "source": {
        "kind": "TrendsQuery",
        "series": [
          { "kind": "EventsNode", "event": "onboarding_completed", "name": "onboarding_completed", "math": "dau" },
          { "kind": "EventsNode", "event": "onboarding_skipped", "name": "onboarding_skipped", "math": "dau" }
        ],
        "interval": "day",
        "trendsFilter": { "formula": "A / (A + B) * 100" }
      }
    }
  }'
```

Insight id: `10497454`

### 5. Onboarding completed vs skipped (bar chart)

Daily count of `onboarding_completed` vs `onboarding_skipped` events (both
fired from `frontend/components/Onboarding.js`), shown as two side-by-side
bars per day (`trendsFilter.display: "ActionsBar"`) -- same bar-chart style
as insight #3, but using two event series instead of a property breakdown,
since completion and skip are already distinct events rather than one event
with a property.

This is a raw-count companion to insight #1 (which shows the same two
events as a normalized daily percentage); this one shows the actual volume
of each.

```bash
curl -s -X POST "https://us.posthog.com/api/projects/525462/insights/" \
  -H "Authorization: Bearer $POSTHOG_PERSONAL_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Onboarding completed vs skipped",
    "dashboards": [1926163],
    "query": {
      "kind": "InsightVizNode",
      "source": {
        "kind": "TrendsQuery",
        "series": [
          { "kind": "EventsNode", "event": "onboarding_completed", "name": "onboarding_completed", "math": "total" },
          { "kind": "EventsNode", "event": "onboarding_skipped", "name": "onboarding_skipped", "math": "total" }
        ],
        "interval": "day",
        "trendsFilter": { "display": "ActionsBar" }
      }
    }
  }'
```

Insight id: `10574071`

### 6. Onboarding completed by country

Daily count of `onboarding_completed` events (fired from
`frontend/components/Onboarding.js`), broken down by the `area` event
property so each country of birth gets its own colored line -- default
Trends line-chart display (no `trendsFilter.display` override, unlike
insights #3 and #5 which force a bar chart).

`area` holds the raw country code selected in the onboarding form (see
`AREA_LABELS` in `frontend/lib/constants.js`): `ALL` (All Other Countries),
`CHINA`, `INDIA`, `MEXICO`, `PHILIPPINES`, `VIETNAM`, `EL_SV_GT_HN` (El
Salvador / Guatemala / Honduras).

Built on `onboarding_completed` specifically (not `onboarding_skipped`),
so anyone who skips onboarding never fires this event and never
contributes a data point -- the graph only ever reflects completions.

```bash
curl -s -X POST "https://us.posthog.com/api/projects/525462/insights/" \
  -H "Authorization: Bearer $POSTHOG_PERSONAL_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Onboarding completed by country",
    "dashboards": [1926163],
    "query": {
      "kind": "InsightVizNode",
      "source": {
        "kind": "TrendsQuery",
        "series": [
          { "kind": "EventsNode", "event": "onboarding_completed", "name": "onboarding_completed", "math": "total" }
        ],
        "interval": "day",
        "breakdownFilter": { "breakdown_type": "event", "breakdown": "area" }
      }
    }
  }'
```

Insight id: `10575258`

### 7. Onboarding completed by family subcategory

Same idea as #6, but scoped to the Family-Sponsored group and broken down
by `category` instead of `area`: one line per family subcategory (`F1`,
`F2A`, `F2B`, `F3`, `F4` -- see `db/schema.sql` for the full code list).
An `exact`-operator property filter on `category` restricts the underlying
series to just those five codes before the breakdown runs, so Employment-
Based submissions never show up as lines here. Default line-chart display,
built on `onboarding_completed` so skips never populate it.

```bash
curl -s -X POST "https://us.posthog.com/api/projects/525462/insights/" \
  -H "Authorization: Bearer $POSTHOG_PERSONAL_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Onboarding completed by family subcategory",
    "dashboards": [1926163],
    "query": {
      "kind": "InsightVizNode",
      "source": {
        "kind": "TrendsQuery",
        "series": [
          {
            "kind": "EventsNode",
            "event": "onboarding_completed",
            "name": "onboarding_completed",
            "math": "total",
            "properties": [
              { "key": "category", "type": "event", "operator": "exact", "value": ["F1","F2A","F2B","F3","F4"] }
            ]
          }
        ],
        "interval": "day",
        "breakdownFilter": { "breakdown_type": "event", "breakdown": "category" }
      }
    }
  }'
```

Insight id: `10575415`

### 8. Onboarding completed by employment subcategory

Same as #7, but scoped to the Employment-Based group: one line per EB
subcategory (`EB1`, `EB2`, `EB3`, `EB3-OW`, `EB4`, `EB4-R`, `EB5`,
`EB5-NonRegional`, `EB5-Regional`, `EB5-Unreserved`, `EB5-Rural`,
`EB5-HighUnemployment`, `EB5-Infrastructure`). Same `exact`-operator
property filter approach, just against the Employment-Based code list
instead of the Family-Sponsored one.

```bash
curl -s -X POST "https://us.posthog.com/api/projects/525462/insights/" \
  -H "Authorization: Bearer $POSTHOG_PERSONAL_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Onboarding completed by employment subcategory",
    "dashboards": [1926163],
    "query": {
      "kind": "InsightVizNode",
      "source": {
        "kind": "TrendsQuery",
        "series": [
          {
            "kind": "EventsNode",
            "event": "onboarding_completed",
            "name": "onboarding_completed",
            "math": "total",
            "properties": [
              { "key": "category", "type": "event", "operator": "exact", "value": ["EB1","EB2","EB3","EB3-OW","EB4","EB4-R","EB5","EB5-NonRegional","EB5-Regional","EB5-Unreserved","EB5-Rural","EB5-HighUnemployment","EB5-Infrastructure"] }
            ]
          }
        ],
        "interval": "day",
        "breakdownFilter": { "breakdown_type": "event", "breakdown": "category" }
      }
    }
  }'
```

Insight id: `10575416`

### 9. Onboarding completed: family vs employment (bar chart)

Daily count of `onboarding_completed` events, split into two bars per day
-- Family-Sponsored vs Employment-Based -- rather than one bar per
individual subcategory like #7/#8. Since the event only carries the
specific `category` code (not a broad-group property), this uses two
series on the same `onboarding_completed` event, each with the same
`exact`-operator `category` property filter as #7 and #8, just aggregated
under a single named series instead of broken down per-code.
`trendsFilter.display: "ActionsBar"` renders it as a bar chart, matching
insights #3 and #5.

```bash
curl -s -X POST "https://us.posthog.com/api/projects/525462/insights/" \
  -H "Authorization: Bearer $POSTHOG_PERSONAL_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Onboarding completed: family vs employment",
    "dashboards": [1926163],
    "query": {
      "kind": "InsightVizNode",
      "source": {
        "kind": "TrendsQuery",
        "series": [
          {
            "kind": "EventsNode",
            "event": "onboarding_completed",
            "name": "Family-Sponsored",
            "math": "total",
            "properties": [
              { "key": "category", "type": "event", "operator": "exact", "value": ["F1","F2A","F2B","F3","F4"] }
            ]
          },
          {
            "kind": "EventsNode",
            "event": "onboarding_completed",
            "name": "Employment-Based",
            "math": "total",
            "properties": [
              { "key": "category", "type": "event", "operator": "exact", "value": ["EB1","EB2","EB3","EB3-OW","EB4","EB4-R","EB5","EB5-NonRegional","EB5-Regional","EB5-Unreserved","EB5-Rural","EB5-HighUnemployment","EB5-Infrastructure"] }
            ]
          }
        ],
        "interval": "day",
        "trendsFilter": { "display": "ActionsBar" }
      }
    }
  }'
```

Insight id: `10575476`

## Notes

- `$POSTHOG_PERSONAL_API_KEY` above is a placeholder -- never commit an
  actual Personal API Key. It only needs `insight:write` + `dashboard:write`
  scope for these calls.
- These insights only show data once the corresponding events actually fire
  in production, which requires `NEXT_PUBLIC_POSTHOG_KEY` and
  `NEXT_PUBLIC_POSTHOG_HOST` to be set as Environment Variables in the
  Vercel project (not just `.env.local`, which is local-only) and a fresh
  deploy to pick them up.
