# Visit history & visit runs

## VisitRecord

Persisted outcomes (no patient information):

- visit ID, account/place/CRM ids, rep placeholder
- visit date, type, outcome, people met, products discussed
- next action, follow-up date, notes, createdAt

Dev form on account brief panel (`recordVisitAction`). Auth deferred.

## VisitListRun / VisitListItem snapshots

On each successful prospecting run:

- **Run:** province, start, target, radius, min fit, providers, rep placeholder, status
- **Item:** sequence, distance, fit + lead product snapshots, revisit flag, CRM id/match state, last-order status snapshot

Historical runs are not mutated when accounts later change.

## Revisit rules

1. DNC always wins  
2. Explicit due revisit (CRM `nextRevisitDueDate <= asOf` or paste) included if otherwise valid → labeled **RE-VISIT**  
3. Already visited / not due: CRM excludes only when `lastVisit` exists **and** `nextRevisitDueDate` is in the future; paste lists still exclude by name  
4. Geographic order with normal prospects  
5. No duplicate if discovery + revisit both list the same account  

Paste lists remain overrides/supplements (`A20`).
