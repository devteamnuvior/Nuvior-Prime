"use client";

import { useState, useTransition } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import type { MatchResult } from "@/domain/crm/matching";
import { resolveCrmMatchAction } from "@/app/actions";
import { toast } from "@/components/feedback/toast";

const MONO = { fontFamily: "var(--mono)" } as const;

export function MatchingQueuePanel({
  items,
}: {
  items: { placeId: string; businessName: string; match: MatchResult }[];
}) {
  const [pending, start] = useTransition();
  const [messages, setMessages] = useState<string[]>([]);

  if (items.length === 0) {
    return (
      <Paper variant="outlined" sx={{ p: 5 }}>
        <Typography variant="body1" sx={{ color: "text.secondary" }}>
          Matching queue empty — no POSSIBLE / CONFLICT matches this run.
        </Typography>
      </Paper>
    );
  }

  const resolve = (
    item: { placeId: string },
    c: MatchResult["candidates"][number],
    decision: "confirm" | "reject",
  ) =>
    start(async () => {
      const r = await resolveCrmMatchAction({
        placeId: item.placeId,
        crmExternalId: c.crmExternalId,
        matchMethod: c.method,
        matchConfidence: c.confidence,
        decision,
      });
      setMessages((m) => [...m, r.message]);
      toast.result(r);
    });

  return (
    <Paper variant="outlined" sx={{ p: 5 }}>
      <Typography variant="eyebrow" component="h3" sx={{ display: "block", mb: 3, color: "text.secondary" }}>
        CRM matching queue (dev)
      </Typography>
      <Typography variant="caption" sx={{ display: "block", mb: 3, color: "text.secondary" }}>
        Uncertain matches are not auto-merged. Confirm, reject, or leave unresolved.
      </Typography>
      <Box component="ul" sx={{ m: 0, p: 0, listStyle: "none", display: "grid", gap: 4 }}>
        {items.map((item) => (
          <Paper component="li" key={item.placeId} variant="outlined" sx={{ p: 3 }}>
            <Typography variant="body1" sx={{ fontWeight: 600 }}>
              {item.businessName}
            </Typography>
            <Typography variant="caption" sx={{ display: "block", ...MONO, color: "text.secondary" }}>
              {item.match.state} · {item.match.method} · conf={item.match.confidence.toFixed(2)}
            </Typography>
            <Typography variant="caption" sx={{ display: "block", mt: 1, color: "text.secondary" }}>
              {item.match.reason}
            </Typography>
            <Box component="ul" sx={{ m: 0, mt: 2, p: 0, listStyle: "none", display: "grid", gap: 2 }}>
              {item.match.candidates.map((c) => (
                <li key={c.crmExternalId}>
                  <Typography variant="caption" sx={{ display: "block", ...MONO, fontSize: "0.65rem", color: "text.secondary" }}>
                    {c.crmExternalId} ({c.method} {c.confidence.toFixed(2)})
                  </Typography>
                  <Box sx={{ mt: 1, display: "flex", flexWrap: "wrap", gap: 2 }}>
                    <Button size="small" variant="outlined" color="primary" disabled={pending} onClick={() => resolve(item, c, "confirm")} sx={{ borderColor: "primary.main", color: "primary.main" }}>
                      Confirm
                    </Button>
                    <Button size="small" variant="outlined" disabled={pending} onClick={() => resolve(item, c, "reject")} sx={{ color: "text.secondary" }}>
                      Reject
                    </Button>
                  </Box>
                </li>
              ))}
            </Box>
          </Paper>
        ))}
      </Box>
      {messages.length > 0 && (
        <Box component="ul" role="log" sx={{ m: 0, mt: 3, p: 0, listStyle: "none", display: "grid", gap: 0.5 }}>
          {messages.map((m, i) => (
            <Typography component="li" key={`${i}-${m}`} variant="caption" sx={{ ...MONO, fontSize: "0.65rem", color: "primary.main" }}>
              {m}
            </Typography>
          ))}
        </Box>
      )}
    </Paper>
  );
}
