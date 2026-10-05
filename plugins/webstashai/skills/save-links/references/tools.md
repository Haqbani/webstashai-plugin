# Save tool details

These are 0.2.0 package-candidate workflow contracts. Exact-package host acceptance remains pending; use the matching connected server capabilities. These are WebstashAI MCP tool names and input keys. Prefer the connected server's current schema; when available, `get_capabilities` reports operational features and limits. Never invent unsupported tools or arguments.

| Tool | Arguments | Effect or limitation |
| --- | --- | --- |
| `check_url` | `url` | Checks an existing save; returns its ID, status, and title when found. It does not prove search readiness. |
| `save_page` | `url`, optional `title` | Saves a URL or returns an existing save, with processing status/readiness and retry guidance. Fetching is server-side without JavaScript rendering, so dynamic or access-controlled pages can extract poorly. |
| `get_page_status` | `id` | Cheap owned readiness read with safe failure and `retry_after_seconds`. Follow retry guidance for at most three checks per invocation; report pending state afterward. Never re-save as polling. |
| `get_page` | `id`, optional `max_chars`, `content_cursor` | Reads revision-bound markdown chunks; `max_chars` is 1000–50000 Unicode code points, default/max 50000. Pass returned `next_cursor` as `content_cursor` for the same page, keeping `content_revision`. Restart on `PAGE_CONTENT_CHANGED`; never combine revisions. |
| `save_highlight` | `url`, `text`, optional `note` | Adds a highlight and may auto-save its source page. Text: 1–5000 characters; note: at most 2000. |
| `list_highlights` | Optional `url`, `query`, `limit`, `cursor` | Inspect existing highlights. Default 20, limit 1–100; follow `next_cursor` with unchanged filters only as needed. Structured results carry stable highlight/page IDs and page/source URLs; text includes highlight IDs and page links. |
| `reindex_page` | `id` | Queues a fresh fetch and extraction. Use only when requested; “queued” does not mean indexing succeeded. |

The service may reject private, invalid, unsupported, or unavailable URLs. Report the actual error instead of promising extraction or working around server restrictions. A successful highlight response confirms the highlight, not completion of the page's indexing.

Example: for “Save https://example.org/article to WebstashAI,” check that exact URL, save it only if missing, and report the returned state. Do not infer a title, tag, group, note, or reindex request from the article's contents.
