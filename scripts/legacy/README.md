# Legacy scripts

These produced the data this project started from. They are kept for
provenance and are not part of the current build.

- `extract_enhanced_data.py`, `extract_data.py`, `process_bukhari.py` turned
  two CSV files (`all_rawis.csv`, narrator records; `all_hadiths_clean.csv`,
  hadith with their chains as narrator IDs) into the per-narrator JSON files
  the site used to serve. Those CSVs are not in the repository.
- `generate_hadith_index.py` built the old `hadith-index.json`.
- `fill_missing_english.py`, `fill_from_duplicates.py`,
  `fetch_missing_translations.py`, `map_usc_msa_refs.py` attached English
  translations **by hadith number**. The numbering differs between editions for
  several collections, so hundreds of hadith received the translation of a
  different hadith. The current build does not use their output; see
  `scripts/data/fetch-hadith-api.ts`, which matches by Arabic text instead.
- `convert_to_sqlite.py`, `analyze-*`, `generate-stats.js`,
  `update-translations*.js` supported features that have been replaced.

The current pipeline starts from `data/source/` (imported once from the legacy
files by `scripts/data/import-legacy.ts`). See `DATA.md`.
