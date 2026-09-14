# Stage 4 — Training Room and awards calibration

## Awards craft benchmark

The awards craft floors are calibrated from `scripts/award-craft-capacity-sim.test.ts`, which runs the live production model across Years 1–12 using the likely office progression, a full project team, high production scope/funding, contemporary production facilities/research, accumulated staff growth and fully played paid milestone rushes.

The raw production floors are set just below the simulated median for each discipline rather than using one shared value. This is necessary because the production engine naturally generates substantially more Animation output than Story or Sound.

Year 6 benchmark medians: Story 1,246; Animation 1,574; Sound 1,013. Qualification floors: Writing 1,200; Animation 1,500; Score 975.

Year 12 benchmark medians: Story 1,761; Animation 2,247; Sound 1,531. Qualification floors: Writing 1,700; Animation 2,150; Score 1,475.

Player productions use retained literal production points. Rival and legacy entries use their frozen craft metric projected onto the current year's calibrated raw scale so rivals remain mathematically eligible in later years.

## Training Room overhaul

New paid training resolves immediately rather than occupying staff for days/weeks. Legacy timed training jobs are still allowed to finish when an older save contains one.

Skill courses:
- Foundation Clinic: +2, Training Room T1.
- Advanced Workshop: +5, Training Room T2.
- Masterclass: +10, Training Room T3.

Cash and R&D costs rise sharply by course strength, current raw skill and career level. Higher Training Room tiers make lower-tier courses slightly more efficient. A staff member can complete one paid course per industry week.

Genre preparation writes directly into the existing `genreExperience` system:
- Genre Familiarity targets experience 2, removing the harshest novice output penalty.
- Genre Competence targets experience 4 and positive baseline contribution.
- Genre Specialist targets experience 8 for a strong late-game personal multiplier.

Existing experience is never reduced. Related genre groups, favourite genres and specialisations receive retraining discounts. Only genres already unlocked by the studio can be trained.
