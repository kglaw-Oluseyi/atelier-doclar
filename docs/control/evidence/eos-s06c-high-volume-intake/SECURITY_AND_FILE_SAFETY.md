# Security and File Safety — EOS-S06C

- Event/org scope enforced on every job command.
- File types: CSV and XLSX only; max 8 MB / 5,000 rows.
- Filename sanitised; content hashed (SHA-256).
- Formula/CSV injection: leading `=+-@` rejected (international `+digits` phones allowed).
- XLSX: cached cell values only; macros / external links rejected.
- Raw file content cleared from source record after successful completion.
- Correction export requires `guest.intake.export`.
- No provider/communication activation; synthetic domains (`example.test`) only.
- Audit actions use hashes/metadata — not raw guest payloads in evidence text.
