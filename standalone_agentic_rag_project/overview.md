# Enterprise Fintech & Support Hybrid Agentic RAG System

## System Overview
The **Enterprise Fintech & Support Hybrid Agentic RAG System** is an autonomous AI assistant that combines:
1. **RAG Knowledge Retrieval**: Searching and summarizing enterprise documentation, warehouse policies, and customer support tickets.
2. **Stateful Tool Calling**: Triggering financial operations (wire transfers, refunds) and dispatching customer notifications.

## Architecture
- **Inbound Ingress**: User prompts are validated against direct jailbreaks, system overrides, and foreign-script homoglyphs.
- **RAG Retrieval Engine**: Queries local knowledge files (`knowledge_docs/`) and tags retrieved snippets as untrusted external context.
- **Autonomous Reasoning Core**: Analyzes the user intent along with retrieved RAG context to formulate structured tool calls.
- **Outbound Reference Monitor**: Intercepts proposed tool calls before execution to verify:
  - TCEAV Evidence & Authority (untrusted context cannot redirect payee destinations).
  - Single-call financial ceilings ($500.00 max).
  - Stateful cumulative session budgets ($1,000.00 max).
  - Output redaction for auto-exfiltrating Markdown links.

## Registered Tools
1. `query_knowledge_base`: Search enterprise knowledge documents and customer tickets.
2. `execute_wire_transfer`: Dispatches bank wire transfers (requires verified payee and amount <= $500).
3. `issue_customer_refund`: Processes refund for defective orders.
4. `send_email_notification`: Sends outbound notification email to verified customer addresses.

## Security Contract Invariants
- Default Deny for unregistered tools.
- Strict Parameter Binding: `recipient` cannot originate exclusively from untrusted RAG documents.
- Cumulative Session Ceiling: $1,000.00.
