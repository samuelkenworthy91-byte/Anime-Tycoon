# Anime Runner — Three-Click UX Audit

## Principle

From the main office, any routine management goal should be reachable and commit-able in no more than three navigation/action clicks. This audit counts navigation and the final command, but not substantive creative choices inside a deliberate builder (for example choosing four cast members for a new show).

## Immediate fix implemented

### Leadership promises

Old path: Office → More/Studio Culture → Ambitions → promise card/project selector, then back to production. In practice this was 4–6 navigation/actions and required remembering a promise outside the production context.

New path: Office → Project Board → **ASSIGN + NAME [CREATOR] [DEPARTMENT] LEAD**. Two clicks from the office if the project qualifies. The promise card is visible beside team/rush/intervention controls. If the creator was not named before department work began, they can still earn the appointment later once they personally hold at least 60% of the department's recorded production days. This keeps the promise meaningful without creating a hidden irreversible failure.

## Current click-depth audit

| Goal | Current path | Approx. clicks | Status | Streamlining direction |
| --- | --- | ---: | --- | --- |
| Name promised creative lead | Project Board → promise action | 2 | PASS after this patch | Keep on project card and surface progress % |
| Assign staff to a project | Project Board → Team → Assign | 3 | PASS | Keep team accordion state sticky while board is open |
| Start a milestone rush | Project Board → Assign Rush Lead → choose lead | 3 | PASS | Prefer promised/department leads at top of selector |
| Buy a production intervention | Project Board → Paid Interventions → intervention | 3 | PASS | Auto-expand when project is in crisis |
| Release a ready show | Project Board → Release Prep → confirm release route | 3 | PASS | Keep all final-release choices on one sheet |
| Start the next season while airing | Project Board → Start Season | 2 | PASS | Preserve this pattern for spin-offs/reboots |
| Open original production builder | New Project → Original Production | 2 | PASS | Creative selections inside the builder are intentional choices, not navigation debt |
| Open licensed adaptation builder | New Project → Licensed Adaptation/rights → property | 2–3 | PASS/BORDERLINE | Owned IPs should appear immediately; auctions remain a separate acquisition goal |
| Research a technology | More/R&D → research item | 2–3 | PASS | Add contextual R&D shortcuts where a locked feature cites its requirement |
| Hire a worker | Staff → candidate → Sign | 3 | PASS | Keep dossier as bottom sheet; never add another confirmation page |
| Train a worker | Staff → employee expand → training panel → course | 3–4 | BORDERLINE | Put one-tap recommended training buttons in expanded employee card |
| Appoint department head | Staff → employee expand → head control → appoint | 3–4 | BORDERLINE | Show eligible head vacancy CTA directly on employee card |
| Accept/respond to salary or poach event | Staff → event → decision | 2–3 | PASS | Surface urgent event card at top of Staff |
| Accept a passion-project pitch | More → Studio Culture → Ambitions → pitch → accept | 4 | FAIL | Surface active pitches as actionable cards in Staff and as an Office alert; accept/decline in-place |
| Fund passion-project development | More → Studio Culture → Ambitions → pitch → fund | 4 | FAIL | Same contextual pitch card; no separate Ambitions visit required |
| Change working policy | More → Studio Culture → Working Policies → option → schedule | 4+ | FAIL | Put Working Policies as a direct More tile; one sheet with apply button |
| Start an overseas release | More → Studio Culture → Overseas → title/territory → sign | 4+ | FAIL | Add **OVERSEAS** action to released title cards; open preselected title in a bottom sheet |
| Negotiate an overseas edit | More → Studio Culture → Overseas/promise → negotiate | 4+ | FAIL | Put edit request directly on the affected title/promise card |
| Start staff mentorship/story response | Staff/Studio Culture → story inbox → choice | 3–4 | BORDERLINE | Put pending story choice on both people involved, with one shared response sheet |
| Build/upgrade facility | More/Facilities → room → build/upgrade | 3 | PASS | Contextual shortcut from features blocked by missing room |
| Relocate office | More → Relocate → confirm | 3 | PASS | Keep requirements visible before opening |
| Take/assign contract | More/Jobs/Contracts → contract → assign crew | 3–4 | BORDERLINE | Contract card should expand inline to crew selection, then start |
| Continue/reboot/spin-off an existing series | Series/Project card → continuation type → builder | 2–3 | PASS | Keep title-context shortcuts rather than central menus |

## Design rule for the next UX pass

1. **Context beats taxonomy.** If an action affects a project, put it on that project. If it affects a person, put it on that person. The central Studio Culture/More screens become dashboards and history, not mandatory action funnels.
2. **One sheet, one commitment.** A click may open a bottom sheet; the next click selects the target; the third commits. Avoid modal → tab → accordion → selector chains.
3. **Blocked actions should link to their remedy.** “Needs Research Lab”, “needs genre licence”, “needs creator approval”, etc. should be tappable shortcuts to the exact purchase/research/negotiation control.
4. **Urgent/eligible actions surface themselves.** Promises, pitches, staff stories, expiring rights, salary requests and overseas opportunities should create a contextual CTA where the player is already looking.
5. **Do not count meaningful creative decisions as navigation.** Building a show can involve many creative selections. The three-click rule is about getting to the relevant decision, not deleting game depth.

## Proposed implementation order

### Pass A — Staff and creator actions
- Surface passion pitches in Staff and the Office alert stack with Accept / Fund / Decline inline.
- Put recommended training and eligible department-head appointment directly in expanded employee cards.
- Put mentorship/story decisions on the relevant employee profiles.

### Pass B — Project-context commerce
- Add Overseas to released/airing project and Series cards, preselecting the title.
- Put overseas edit consent on the affected promise/project card.
- Make contract crew assignment inline on each contract card.

### Pass C — Smart shortcuts
- Add tappable remedies for locked research, facilities, formats and genre licences.
- Auto-focus the exact requirement when the destination opens.
- Add a small global **Action Centre** badge that aggregates only unresolved decisions, never routine menus.

### Acceptance test
For every player-facing command, record: start context, clicks to control, clicks to commit, and whether the route remains usable on a Pixel 9a portrait viewport. Any routine management goal above three clicks is treated as a UX regression.
