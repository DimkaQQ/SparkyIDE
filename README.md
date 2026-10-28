# Sparky IDE

An AI coding agent that runs in the browser: a Claude Code / Freebuff-style workspace with a
streaming agent loop, real file editing, GitHub integration, and **any** AI provider connected
through an API key.

![status](https://img.shields.io/badge/build-vite-blue)

## What it does

- **Any model, any provider.** Anthropic, OpenAI, Google Gemini, OpenRouter, Groq, DeepSeek,
  Mistral, xAI, Together, Fireworks, Cerebras, Ollama, LM Studio, vLLM or any OpenAI-compatible
  endpoint. Three API dialects are implemented natively:
  - OpenAI-compatible (`/chat/completions`, SSE)
  - Anthropic Messages (`/messages`, SSE)
  - Google Gemini (`:streamGenerateContent`, SSE)
- **Automatic model discovery.** Sparky queries each provider's model list with your key
  (`GET /models`, or Gemini's `models` list) and shows only models your key can actually use.
  Detection runs on save, on demand, and silently at startup for providers that already have a key.
- **A real agent loop.** The model streams an answer, requests tools, Sparky executes them,
  feeds the results back, and repeats (up to 10 steps). You can stop it at any time.
- **Workspace tools.** `list_files`, `read_file`, `write_file`, `edit_file`, `delete_file`,
  `search_files` operate on a local workspace persisted in the browser. Edits are visible in the
  file tree and in the Monaco editor immediately.
- **GitHub tools + UI.** `github_list_repos`, `github_list_tree`, `github_read_file`,
  `github_list_commits`, `github_list_branches`, `github_commit_files`, `github_create_pr`.
  The GitHub panel lets you browse repos, switch branches, preview files, import a repository into
  the workspace, commit the workspace back, and open pull requests.
- **Markdown + tool cards.** Streamed markdown with sanitised HTML, copy buttons on code blocks,
  collapsible tool cards with inputs/results, image attachments, and a model picker grouped by
  provider.
- **Dark and light themes**, keyboard-first composer (`Enter` to send, `Shift+Enter` for newline),
  persisted chats, and per-session titles.

## Quick start

```bash
npm ci
npm run dev      # http://localhost:3000
```

Other scripts:

```bash
npm run typecheck
npm run build
```

## Connecting a provider

1. Open **Settings → AI providers**.
2. Pick a provider (or **Add AI provider** for a preset/custom endpoint).
3. Paste the API key, adjust the base URL/format if needed, then press **Detect models**.
4. Choose a model in the composer's model picker.

Because API keys are used directly from the browser, providers must allow CORS. Anthropic is
called with the `anthropic-dangerous-direct-browser-access` header, Gemini passes the key as a
query parameter, and local runtimes (Ollama/LM Studio/vLLM) are reached over `http://localhost`.

## Connecting GitHub

Create a token with `repo` scope at
[github.com/settings/tokens](https://github.com/settings/tokens/new?scopes=repo&description=Sparky%20IDE)
and paste it in **Settings → GitHub** or in the GitHub panel. The token is verified against
`/user` and stored only in this browser.

## Architecture

```
src/
  providers.ts        provider presets, SSE streaming for 3 dialects, model discovery
  github.ts           Octokit-backed repo/branch/tree/file/commit/PR operations
  state.tsx           persisted store: providers, chats, workspace, GitHub session
  types.ts            shared domain types
  agent/
    tools.ts          tool schemas + executor (workspace and GitHub)
    runner.ts         streaming agent loop and system prompt
    labels.ts         human-readable tool descriptions
  components/         rail, sessions, file tree, chat, tool cards, model picker,
                      editor, GitHub view, settings
  lib/markdown.ts     marked renderer with an allow-list HTML sanitiser
```

## Notes on security and storage

- Chats, workspace files, provider keys and the GitHub token live in `localStorage` under
  `sparky-ide:state:v1`. Nothing is sent anywhere except to the providers and GitHub endpoints you
  configure.
- Model output is rendered through an allow-list sanitiser, so scripts, event handlers and
  `javascript:` URLs are stripped before it reaches the DOM.
- Workspace tools are sandboxed to relative paths inside the workspace; `..` is rejected.
- Use **Settings → General → Reset data** to wipe everything stored locally.
