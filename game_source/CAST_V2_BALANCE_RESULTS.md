# Cast V2 Balance Results

The deterministic simulation runs 400 identical-seed trials per scenario using the production scoring and sales functions. The fixture genre is Romance; only cast affinity tiers and the stated production-quality preset change.

| Scenario | Avg rating | Avg sales | Avg revenue | Failure | Hit | Blockbuster |
|---|---:|---:|---:|---:|---:|---:|
| A — no affinity | 13.115 | 36,432 | 94,723 | 97.8% | 0.0% | 0.0% |
| B — one visible | 13.435 | 39,385 | 102,401 | 93.5% | 0.0% | 0.0% |
| C — four visible | 13.840 | 43,353 | 112,719 | 84.3% | 0.0% | 0.0% |
| D — one hidden | 13.738 | 42,357 | 110,128 | 86.8% | 0.0% | 0.0% |
| E — two hidden | 14.168 | 46,493 | 120,881 | 68.8% | 0.0% | 0.0% |
| F — four hidden | 15.852 | 61,070 | 158,782 | 1.3% | 0.0% | 0.0% |
| G — four hidden, poor production | 4.530 | 3,207 | 8,339 | 100.0% | 0.0% | 0.0% |
| H — no affinity, excellent production | 25.392 | 192,134 | 499,548 | 0.0% | 6.0% | 0.0% |
| I — four hidden, excellent production | 27.003 | 246,240 | 640,225 | 0.0% | 76.2% | 0.0% |

Accepted values:

- Visible rating component: `0.60 × role weight × Type modifier`.
- Hidden rating component: exactly twice visible.
- Visible sales component: `2.5% × role weight × Type modifier`.
- Hidden sales component: exactly twice visible.
- Type match: `+10%` on that individual contribution; mismatch has no penalty.

The results make good casting noticeable both critically and commercially. The poor-production gate demonstrates that even a hidden-perfect ensemble cannot rescue disastrous execution.

Reproduce with `npm run cast-v2:balance`.

