# Build Ledger

**Authority:** First created in MD-CT1. B0 recorded this file as absent (GAP-009).

Historical EOS-S01–S04 notes saying “No Railway mutation” record what those slices did. They are not a current standing prohibition. Current rule: `docs/control/DEPLOYMENT_AND_PRODUCTION_REALISM_POLICY.md` (6 September 2026). Production operations remain unauthorised.

| Slice | Prompt | Native | Product | Commit | Status | Notes |
|-------|--------|--------|---------|--------|--------|-------|
| MD-B0 | — | B0 | FOUNDATION | `f7abb431be9a15ab730b3fdd16baa8e83776c170` | IN_REVIEW | Controlled corpus baseline. Not ACCEPTED. |
| MD-CT0 | MD-PR-0001 | CT0 | FOUNDATION | `c77f0b6c25a574ddfd70fb86dce7ec8533812a9f` | IN_REVIEW | Planning baseline. Not ACCEPTED. |
| MD-CT1 | MD-PR-0002 | CT1 | FOUNDATION | `f9c1db0ba0068f0bf19e65844f168e90185a9b50` | IN_REVIEW | Programme-domain validator. Not ACCEPTED. |
| MD-CT2 | MD-PR-0003 | CT2 | FOUNDATION | `0f5257636479bf84851cb5b350cf76b1db0d70ab` | IN_REVIEW | Events, snapshots and status calculator. Not ACCEPTED. |
| MD-CT3 | MD-PR-0004 | CT3 | FOUNDATION | `3164b7d73ebff68c41a7f33944a993ddb4f43906` | IN_REVIEW | Repository and CI ingestion. Not ACCEPTED. |
| MD-CT4 | MD-PR-0005 | CT4 | FOUNDATION | `8920007ca62442b5fb1eb4b6fece8d1985e06a98` | IN_REVIEW | Control Tower shell and executive portfolio. Not ACCEPTED. |
| MD-CT5 | MD-PR-0006 | CT5 | FOUNDATION | `ef1b6e0041b0e35e34f46953091c232a170c6b6e` | IN_REVIEW | Roadmap, product and slice drill-down. Not ACCEPTED. |
| MD-CT6 | MD-PR-0007 | CT6 | FOUNDATION | `a9c263a59b561b81d5a5d822c1698b59815134d6` | IN_REVIEW | Controlled workflows. Corrective `b087c20679e2f8dce0ec747c9277f05dbd7f5ad9`. Not ACCEPTED. |
| MD-CT7 | MD-PR-0008 | CT7 | FOUNDATION | `64854a70ec5efa9a5c9e91c6d4c3833cc7be7b47` | IN_REVIEW | Grounded assistant; citations and abstention. Not ACCEPTED. |
| MD-CT8 | MD-PR-0009 | CT8 | FOUNDATION | `bf5214483e238c19ca04908016eff71a19a3ffd0` | IN_REVIEW | Charts, freshness and in-app notices. Not ACCEPTED. |
| MD-CT9 | MD-PR-0010 | CT9 | FOUNDATION | `28958e31778e92c3354e72447150353939ed4596` | IN_REVIEW | Operations evidence pack. Not ACCEPTED. Not production authorised. |
| MD-FC1 | MD-PR-S001 | FC1 | FOUNDATION | `e337eba83cfc41590f226f980772f848d827b6e3` | IN_REVIEW | Foundation closeout. Technically reviewed; not ACCEPTED. Production not authorised. |
| MD-LV1 | MD-PR-S002 | LV1 | FOUNDATION | `b554da4f00cf7911bbccb8cac09a7a2ada7141d5` | IN_REVIEW | Live Railway deployment and automated verification. Human verification recorded in MD-HV1. Production not authorised. |
| MD-HV1 | MD-PR-S003 | HV1 | FOUNDATION | `de29a916bab35ba476745a9fe8f52c0b61aa86d9` | IN_REVIEW | CEO human live verification PASS; issues NONE. Not ACCEPTED. Production not authorised. |
| EOS-S01 | MD-PR-S004 / MD-PR-S007 | S01 | EVENT_OS | `b815268e939cfbd0fc33ce10df77f1c8a1374d52` | ACCEPTED | Shared platform and Event OS foundation. Technically accepted by ChatGPT / AI CTO. Production not authorised. No Railway mutation. |
| EOS-S02 | MD-PR-S008 / MD-PR-S009 | S02 | EVENT_OS | `23e8ad98f7a0b8d18ae083f385bfc04cd43ab973` | ACCEPTED | Guest intake and operational directory. Technically accepted by ChatGPT / AI CTO. Production not authorised. No Railway mutation. |
| EOS-S03 | MD-PR-S010 / MD-PR-S011 | S03 | EVENT_OS | `bed7cebeb14e731c1d0e8a289ceb7cfa21f546fe` | ACCEPTED | RSVP and guest self-service. Technically accepted by ChatGPT / AI CTO. Production not authorised. No Railway mutation. S01–S03 CEO human verification recorded under MD-PR-S013 / EOS-HV1 as PASS WITH MINOR REFINEMENTS. Accepted implementation SHA unchanged. |
| EOS-S04-RECON | MD-PR-S014 | S4-01–S4-62 | EVENT_OS | `30c75f17495ed7bdcf2330296b4e792673310874` | READY | Canonical S04 scope reconciled. Implementation authorised only under MD-PR-S015. Production not authorised. No Railway mutation. |
| EOS-S04 | MD-PR-S015 / MD-PR-S016 | S4-01–S4-62 | EVENT_OS | `8d87dc13ce87ab1431783d0e6649b34807eeb7ab` | ACCEPTED | Guest communications and concierge. Technically accepted by ChatGPT / AI CTO. S4-61/S4-62 satisfied for technical review/handover only. Production not authorised. No Railway mutation. Accepted implementation SHA unchanged. |
| EOS-S04A | MD-PR-S017 | Guest intelligence | EVENT_OS | `8f1957d2353db539449d9bcce62f9e4d71eb31af` | ACCEPTED | Guest addressing, relationships and party entitlements. Technically accepted by ChatGPT / AI CTO on 2026-09-07 after Claude-in-Chrome focused verification. Not a catalogue slice; accepted-slice count remains 4. Persistence POSTGRES; migrations APPLIED; productionAuthorised false. Historical closeout text that S04A does not authorise S04B is superseded by MD-PR-S018. |
| EOS-S04B | MD-PR-S018 / MD-PR-S019 | Multi-phase / routing / perimeter | EVENT_OS | `f9f218c9d3e357ba82e6c04e7409138267a94396` | ACCEPTED | First complete vertical plus accessibility remediation. Not a catalogue slice. Production not authorised. |
| EOS-S04C | MD-PR-S020 | Aso-ebi / aso-oke / merchandise | EVENT_OS | see implementation chain | IN_PROGRESS | CEO ratification overlay. P00–P11 authorised. Not a catalogue slice. Production not authorised. EOS-S04D–F and EOS-S05 not started. |
| MD-GR1 | MD-PR-S006 | GR1 | FOUNDATION | `230b6a71ea254b42435949fcf9623f6c35b158fa` | IN_REVIEW | Dependency semantics reconciled. Foundation remains unaccepted. Production not authorised. |
