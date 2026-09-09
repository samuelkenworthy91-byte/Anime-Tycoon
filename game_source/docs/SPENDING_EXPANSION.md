# Strategic Spending Expansion

Production interventions are defined in `src/engine/spending.ts` and shown contextually on active project cards. Every intervention has stage eligibility, a once-per-project ID, cost, bounded effect, and either risk or a schedule/hype opportunity cost. Failed interventions provide only limited benefit and can add issues; none directly sets review scores.

The same module defines save-stable staff retention contracts and seven capital projects. Contract signing bonuses are based on the worker's actual salary and term. Capital projects range from a private screening theatre to the £1.1bn studio museum and are capability/objective descriptions, not a collection of generic +5% modifiers.

All one-off spending is appended to `strategicSpend` with week, label, amount and optional project ID for finance/archive use.

