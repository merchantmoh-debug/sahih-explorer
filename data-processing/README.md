# data-processing

This folder holds the project's vision document, [Project.md](Project.md)
("Isnad-Graph"). It sets out the problems the site addresses and who it is
for.

The data processing itself has moved:

- `data/source/` holds the source data, committed and editable.
- `scripts/data/` is the build that turns it into what the site serves:
  chains read against the text, transmission graphs, chain notes, the same
  report across collections, and integrity checks. Run it with
  `npm run data:build`.
- `scripts/legacy/` keeps the Python and Node scripts that produced the
  original data. They are there for provenance only.

[DATA.md](../DATA.md) documents the sources, the build, corrections and known
limitations.
