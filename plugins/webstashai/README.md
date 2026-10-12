# WebstashAI

Save links, research your saved pages with source links, and manage notes,
highlights, collections, and groups from ChatGPT or Codex.

This package is **0.2.2** for project briefs, highlight reflection,
resumable reading, revision-checked tag edits, optional preview cards, and verified
automatic Organizer configuration. Prior 0.2.0 API and Organizer evidence does
not establish this candidate's installed-host or future-save acceptance. The
version identifies this package and does not establish publication.
These workflows require the matching connected server capabilities.
Use the connected server's exposed tools and, when offered, `get_capabilities`
before relying on a new feature. Report an unavailable capability clearly.

## Connect

Use an existing WebstashAI account. This package connects to
`https://api.webstashai.com/mcp` using the host's OAuth connection flow.
Sign in and consent in the browser; keep passwords, API keys, and tokens out of
chat and plugin files. Connection must be verified in the intended client.

## Try it

- “Save this link to my WebstashAI library.”
- “Find my saved pages about a topic and summarize them with source links.”
- “Show my WebstashAI groups and help me organize a saved page.”

With a server supporting the matching workflows:

- “Build a project brief from my saved sources, with disagreements and gaps.”
- “Review a few of my saved highlights without changing their review state.”
- “Add this tag while preserving my other tags.”
- “Compare these saved sources, or show the comparison as text.”
- “Activate future-save Organizer rules for these collections while preserving all existing placements.”

A newly saved link may still be processing. Search availability and extracted
content depend on the returned status. `get_page_status` provides readiness and
retry guidance; a successful save alone does not prove search availability.
Reading can continue through revision-bound content chunks. Notes, highlights,
and collection browsing can continue through their returned cursors. The plugin
searches your saved library; it does not provide a general public-web search.

Project briefs describe the retrieved evidence and its gaps. Ranked search
results are a subset of the library. Highlight resurfacing selects up to five
saved passages for reflection and does not schedule reviews or record feedback.
Tag edits use the current tag revision; a conflict needs a deliberate reread.

Mutations follow your request. A broad organization request starts with a
preview; deletions and changes to existing organization need clear targets and
authorization. A pending plan may prepare asynchronously. Applying or undoing
an AI organizer plan requires confirmation of the current preview in chat. The
assistant binds the apply or Undo call to that preview's hash and polls the
returned run. For requested automatic organization, it then verifies each saved
rule is enabled at the approved destination. For future-only setup, it explicitly
passes `apply_to_existing: false` and verifies zero existing-page moves. Exact
manual moves change page placement without creating or activating rules.
Website previews are optional; opening one does not authorize changes. Reports
state existing placement, enabled rules and any verified subsequent automatic
save separately, including partial results and conflicts. Enabled rules prove
configuration; an authorized new save through normal ingestion is needed to
verify future-save behavior. Pending or failed proposals remain incomplete.

Comparison and organizer cards are optional read-only views. Their text results
retain source links, status and the human review URL when the client cannot
display a card. Organizer cards show at most 25 representative changes; the
assistant reads and shows the current proposal in chat before approval. The
website review page is optional.

The plugin accesses existing-account features. If an account limit prevents an
operation, it explains the limit without starting a purchase or promoting an
upgrade.

## Package

This directory uses the portable Agent Plugins 1.0 layout: `plugin.json`,
`mcp.json`, `skills/`, and `assets/`. It contains no credentials, app bindings,
local runtime, or dependency installation.

The repository also contains a local marketplace entry at
`.agents/plugins/marketplace.json`. To test an installation in a supported local
client, register the repository marketplace with `codex plugin marketplace add .`
from the repository root, then select WebstashAI from that source and complete
the host's OAuth connection. Creating the files does not install the plugin.
When updating, install the current marketplace package and verify **0.2.2** in
the client's Installed plugins view. Start a fresh chat and verify that the
connected `create_organizer_plan` schema exposes `apply_to_existing` and the
installed organizer skill requires enabled-rule verification. If a client keeps
the previous version, report the installed version before claiming acceptance;
do not edit its installed cache as a replacement for this package.
That marketplace entry uses the production endpoint. Historical local and
staging acceptance used isolated development packages. Their results do not
establish acceptance of this exact production package.

## 0.2.1 changes

- Automatic taxonomy requests use an Organizer proposal, confirmation-bound
  Apply, run polling and persisted enabled-rule verification.
- Future-only setup explicitly uses `apply_to_existing: false` to preserve
  existing assignments and avoid existing-page assessment.
- Completion distinguishes page placement, enabled rules and verified automatic
  assignment of a subsequent save. Manual moves establish placement only.
- Failed or pending rules stay incomplete. Expired plans need a fresh proposal;
  increasing a budget is not presented as a proven fix for a provider failure.

This is a package candidate. The production Worker uses Anthropic for Organizer
collection evaluation and Workers AI for supported ingestion features; TypeSafe
is retired from the current release path. Production Worker deployment alone
does not prove the complete plugin workflow. The support and terms URLs are
declared and verified in production, including privacy and keyboard navigation. Public
submission additionally needs a real demo recording, secure reviewer access,
publisher and domain verification, successful portal scans, and execution of the
review cases against the exact installed package. The demo field stays absent
until a real reviewer-accessible recording exists. Manifest review cases are
expectations, not evidence that they passed.

From the repository root, validate or build the archive:

```sh
node scripts/package-openai-plugin.mjs --check
node scripts/package-openai-plugin.mjs
```

Use the Node version in `.node-version`. The ZIP is written outside this
directory to `.artifacts/plugins/` and includes one `webstashai/` directory.

See [OpenAI's package guide](https://developers.openai.com/plugins/build/plugins),
[plugin guidelines](https://developers.openai.com/plugins/plugin-guidelines), and
[submission guide](https://developers.openai.com/plugins/deploy/submission).
