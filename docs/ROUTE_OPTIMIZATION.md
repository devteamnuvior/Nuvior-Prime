# Route optimization (Phase 8)

## Objective (deterministic)

```
utility = fit×W_fit + revisit×W_rev − travelMinutes×W_travel − schedulePenalty×W_schedule
```

Defaults (`src/domain/routing/config.ts`):

| Weight | Default | Role |
|---|---|---|
| `ROUTING_WEIGHT_FIT` | 12 | Prefer higher fit (fit-5 beats fit-3 with modest extra travel) |
| `ROUTING_WEIGHT_REVISIT` | 40 | Strong due-revisit priority (DNC still wins upstream) |
| `ROUTING_WEIGHT_TRAVEL` | 1 | Travel efficiency |
| `ROUTING_WEIGHT_SCHEDULE` | 2 | Lunch / hours / workday overflow penalties |

Algorithm: greedy next-stop selection with workday + lunch constraints. Not exact TSP.

## Candidate pool (before matrix)

1. DNC excluded  
2. Already-visited / not-due excluded  
3. Taxonomy + min fit  
4. Geodesic radius prefilter  
5. Due revisits included  
6. Cap: revisits → fit desc → distance asc → `ROUTING_MAX_CANDIDATES`

## Legacy mode

`ROUTE_OPTIMIZATION_ENABLED=false` → nearest→farthest geodesic order (Phase 1–7 style). Drive-time hard constraint is **not** applied in legacy mode (warning emitted if requested).

## Explanations

Per-stop `routeReasons` are rule-based (due revisit, fit N, low detour, hours, geodesic estimate). No LLM.
