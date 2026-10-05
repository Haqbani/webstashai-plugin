<p align="center">
  <img src="plugins/webstashai/assets/logo.png" alt="WebstashAI logo" width="96" height="96">
</p>

<h1 align="center">WebstashAI</h1>

<p align="center">Save links, research your saved pages, and organize your library with AI.</p>

<p align="center">
  <a href="https://webstashai.com">Open WebstashAI</a> ·
  <a href="https://github.com/Haqbani/webstashai-plugin/releases/download/v0.2.0/webstashai-0.2.0.zip">Download plugin ZIP</a> ·
  <a href="https://github.com/Haqbani/webstashai-plugin/releases/tag/v0.2.0">Release notes</a>
</p>

Use your own WebstashAI account to save links, find saved sources, work with notes and highlights, and review library organization proposals. You can connect the MCP server directly or install the plugin for additional guided workflows. No OpenAI store listing is required for these installation methods.

**Early access:** version 0.2.0. The package is checked for its structure, included files, and production connection settings. Complete workflows have not been verified in every supported client.

## Installation

### ChatGPT on the web

You do not need to download the ZIP to connect ChatGPT to WebstashAI.

1. Sign in to [WebstashAI](https://webstashai.com), or create an account.
2. In ChatGPT, open **Settings → Security and login** and enable **Developer mode**.
3. Open **Plugins**, select **+**, and create an MCP connection named **WebstashAI**.
4. Enter this server URL:

   ```text
   https://api.webstashai.com/mcp
   ```

5. Choose **OAuth** authentication. Complete the browser sign-in and approve the requested WebstashAI permissions.
6. Start a new chat and select **WebstashAI** from the developer-mode tools menu.

Developer mode is listed for ChatGPT web on Plus, Pro, Business, Enterprise, and Edu accounts. Availability and allowed actions depend on your account and workspace permissions. See [OpenAI's current setup guide](https://developers.openai.com/api/docs/guides/developer-mode).

This connects WebstashAI's tools. To install the packaged skills as well, use a supported local client as described below.

### Codex plugin

With a current version of the [Codex CLI](https://developers.openai.com/codex/cli) installed, run:

```sh
codex plugin marketplace add Haqbani/webstashai-plugin --ref main
codex plugin add webstashai@webstashai
```

Complete the WebstashAI account connection when prompted. If you need to sign in from the CLI, run `codex mcp list`, find the WebstashAI server's name, and run `codex mcp login SERVER_NAME` using that exact name. In a desktop client, use the installed plugin's **Connect** option. Start a new chat with the plugin enabled.

The plugin includes workflows for saving links, researching your library, creating project briefs, reviewing highlights, and organizing collections. See [OpenAI's plugin installation guidance](https://developers.openai.com/plugins/build/plugins).

### Download the plugin ZIP

1. [Download webstashai-0.2.0.zip](https://github.com/Haqbani/webstashai-plugin/releases/download/v0.2.0/webstashai-0.2.0.zip).
2. Use your client's plugin import or upload option, if available, and select the ZIP.
3. Connect your own WebstashAI account through OAuth.

ChatGPT archive upload depends on your account and workspace permissions. Imported plugins that declare MCP servers are currently **desktop-only in ChatGPT**, including this package. For ChatGPT web, use the direct connection instructions above. See [OpenAI's import restrictions](https://learn.chatgpt.com/docs/enterprise/plugin-management#desktop-only-plugins).

Download the release asset named `webstashai-0.2.0.zip`; GitHub's **Source code (zip)** contains the whole distribution repository and is not the installable plugin archive.

### Other MCP clients

In a client that supports remote HTTP MCP and OAuth, add:

| Setting | Value |
| --- | --- |
| Name | WebstashAI |
| Server URL | `https://api.webstashai.com/mcp` |
| Transport | Streamable HTTP |
| Authentication | OAuth |

Follow the client's account connection flow and sign in to your own WebstashAI account. This connects the tools; plugin skills and visual cards depend on your client's support.

## Try it

- `Save https://example.com to my WebstashAI library.`
- “Find my saved pages about product design and summarize them with source links.”
- “Build a project brief from my saved sources and show disagreements and gaps.”
- “Review a few of my saved highlights.”
- “Prepare an organization preview for my library before making changes.”

A newly saved page may need time to finish processing. Organization changes require confirmation of the current preview. Available tools and limits depend on your WebstashAI account and the connected server.

## Updating

For a Codex marketplace installation:

```sh
codex plugin marketplace upgrade webstashai
codex plugin add webstashai@webstashai
```

Start a new chat after updating. For ZIP installations, use your client's update option with the newer release ZIP. If ChatGPT shows an old tool list, open the WebstashAI connection settings and select **Refresh tools**.

## Help

- **Cannot find Developer mode or an upload option?** Check your ChatGPT plan and workspace permissions. The ZIP does not bypass those requirements.
- **Not connected?** Complete OAuth in your client's WebstashAI connection settings. Each person connects their own account.
- **A tool or preview is unavailable?** Check the tools exposed by your client. Visual cards have text fallbacks where supported by the server.

For account help, visit [WebstashAI support](https://webstashai.com/support). For plugin installation problems, [open an issue](https://github.com/Haqbani/webstashai-plugin/issues).

Passwords, API keys, and access tokens are not included in this repository and should not be pasted into chat or GitHub issues. Read the [privacy policy](https://webstashai.com/privacy.html) and [terms](https://webstashai.com/terms).

## For maintainers

This repository contains the portable plugin package, its marketplace entry, and a dependency-free packaging script. It contains no WebstashAI application or server source.

Use Node.js 22.23.2, then run:

```sh
node scripts/package-plugin.mjs --check
node scripts/package-plugin.mjs
```

The archive is written to `.artifacts/plugins/`. Release ZIPs contain a single `webstashai/` directory with the manifest, MCP connection, skills, README, and logo. A SHA-256 checksum file accompanies each release.
