# Cast V2 Final Validation

Baseline: `41dcffc3129b53171fe01c55f8cebe277e0ad700`

| Acceptance check | Result |
|---|---|
| Canonical roster locked fields unchanged | PASS — zero drift |
| Canonical IDs | PASS — 192 unique |
| Role counts | PASS — 48 each |
| Role × Type | PASS — 24 each |
| Role × Type × gender ledger | PASS — 12 each |
| Affinity structure | PASS — two visible, one hidden, all distinct |
| Active genres | PASS — 21 |
| Removed genres absent from active schema | PASS |
| Genre-pair coverage | PASS — 210 / 210 |
| Practical Role × Type genre coverage | PASS |
| Independent runtime portraits | PASS — 192 / 192 |
| Approved/runtime portrait hashes | PASS — identical |
| Portrait dimensions and format | PASS — 512×512 WebP |
| Package checksums | PASS |
| No Cast V2 sprite-sheet position dependency | PASS |
| Type selection and persistence | PASS |
| Type match +10%; mismatch no penalty | PASS |
| Visible rating and sales bonus | PASS |
| Hidden exact 2× rating and sales bonus | PASS |
| Best tier only; no per-character stacking | PASS |
| Hidden active before discovery | PASS |
| Hidden UI secrecy before discovery | PASS |
| Release-only, one-time discovery | PASS |
| Discovery save persistence | PASS |
| Legacy save/genre/staff/franchise migration | PASS |
| TypeScript | PASS |
| Automated application tests | PASS — 312 / 312 |
| Dedicated balance tests | PASS — 3 / 3 |
| Production web build | PASS |
| Capacitor Android sync | PASS |

Validation commands:

```text
npm run cast-v2:generate
npm run cast-v2:validate
npm run cast-v2:validate-assets
npm test -- --reporter=dot
npm run cast-v2:balance
npm run build
npx cap sync android
```
