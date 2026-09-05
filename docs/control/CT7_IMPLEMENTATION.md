# CT7 Implementation — Grounded programme assistant

**Product:** FOUNDATION  
**Prompt Control ID:** `MD-PR-0008`  
**Native ID:** `CT7`  
**Slice ID:** `MD-CT7`  
**Status:** `IN_REVIEW`  
**Baseline:** `b087c20679e2f8dce0ec747c9277f05dbd7f5ad9`

Allow-listed sources, citations and abstention. RAG explains programme text; the CT2 snapshot remains the status authority. No production model vendor is bound.

## Retrieval

Deterministic extractive retrieval in `@maison-doclar/programme-tower` (`rag.ts`). Indexed categories: canonical control documents, implementation records, manifests, open items, gates and product declarations. Draft/recovered/handover material is not indexed.

## Provider boundary

`RAG_PROVIDER.kind = deterministic-extractive`. `vendorBound = false`. Production model/RAG provider remains unselected (`CT7-OI-001`).

## Open items

`CT7-OI-001` — model/RAG vendor unselected.  
`CT7-OI-002` — index is rebuilt per request; no durable search cluster.
