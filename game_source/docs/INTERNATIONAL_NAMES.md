# International name pool

Anime Runner's generated staff and original human-character billing uses a compiled 50-country name pool.

Each included country contributes the **top 100 male first names, top 100 female first names and top 100 surnames** available in the source data. First names and surnames are sampled independently, including independently selected countries, so any supported first name can combine with any supported surname.

First names are gender-locked for clearly male- or female-presenting worker sprites. The shipped worker art was visually reviewed one sprite at a time. Worker 12, Worker 28 and Worker 29 were deliberately marked **neutral** because the artwork is ambiguous; those looks draw from a separate neutral first-name pool instead of being forced into male/female naming. Neutral names come from globally common Onomaverse names where both male and female probability are at least 35%.

For the male/female pools, source rows tagged exclusively male or female stay in that pool. Names tagged for both genders are only included for a gender where the source's global gender inference is at least 70%; otherwise they are excluded as ambiguous.

Special named workers such as Dante and Avril keep their authored names. Non-human/mascot cast keep their authored character names. Licensed IP character billing also remains authored/canonical to the in-game property.

## Data source and attribution

Names data from **Onomaverse Names Datasets v2026.06**, licensed **CC BY 4.0**.

Source: https://onomaverse.com/datasets

Required attribution: **Names data from Onomaverse (https://onomaverse.com/datasets), licensed CC BY 4.0.**

The runtime subset is stored in `src/engine/generated/internationalNames.json`; the full upstream CSVs are not vendored.
