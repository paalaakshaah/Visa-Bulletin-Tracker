# PostHog Insights

All insights below live on the **Engagement** dashboard
(`https://us.posthog.com/project/525462/dashboard/1912995`) and were created
via PostHog's REST API (`https://us.posthog.com/api/projects/525462/...`)
rather than through the UI, using a Personal API Key scoped to
`insight:write` + `dashboard:write`.

## Dashboard

```bash
curl -s -X POST "https://us.posthog.com/api/projects/525462/dashboards/" \
  -H "Authorization: Bearer $POSTHOG_PERSONAL_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"name": "Engagement", "description": "Visa Bulletin Tracker engagement metrics"}'
```

Created dashboard id: `1912995`

## 1. Onboarding completion rate (% of daily users)

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
    "dashboards": [1912995],
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

## 2. Page visits

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

## 3. Dashboard vs Trends tab clicks

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

## 4. USCIS case status button clicks

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

## Notes

- `$POSTHOG_PERSONAL_API_KEY` above is a placeholder -- never commit an
  actual Personal API Key. It only needs `insight:write` + `dashboard:write`
  scope for these calls.
- These insights only show data once the corresponding events actually fire
  in production, which requires `NEXT_PUBLIC_POSTHOG_KEY` and
  `NEXT_PUBLIC_POSTHOG_HOST` to be set as Environment Variables in the
  Vercel project (not just `.env.local`, which is local-only) and a fresh
  deploy to pick them up.
