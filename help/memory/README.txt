BeadBoard Native Memory System (Index)

Use this folder when you need to understand, query, or update memory in BeadBoard.
Memory source-of-truth is bd + Dolt history, not markdown notes.

Files:
- memory_fabric_workflow.txt: full lifecycle and operating procedure
- query_and_injection.txt: task-start retrieval and attachment commands
- schema_and_noise_budget.txt: node types, edge rules, and anti-noise limits

Fast path for agents:
1) Read memory_fabric_workflow.txt
2) Run query_and_injection.txt command sequence at task start
3) Follow schema_and_noise_budget.txt before creating new memory nodes
4) Verify provenance links on selected memory nodes (`bd show` + `bd dep list`)
