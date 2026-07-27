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

Daily count of `tab_changed` events (fired in `frontend/app/page.js` when
the Dashboard/Trends nav buttons are clicked), broken down by the `tab`
event property so each tab gets its own line.

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

Insight id: `10498152`

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
