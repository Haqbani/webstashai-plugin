#!/usr/bin/env node
// Focused public-package checks for the WebstashAI Agent Plugins 1.0 bundle.
// The portable schemas leave OpenAI listing and submission rules to the client.
import { execFileSync } from "node:child_process";
import {
  copyFileSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync,
  renameSync, rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, extname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PLUGIN_SCHEMA = "https://agent-plugins.org/schemas/1.0.0/plugin.schema.json";
const MCP_SCHEMA = "https://agent-plugins.org/schemas/1.0.0/mcp.schema.json";
const MCP_URL = "https://api.webstashai.com/mcp";
const NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SEMVER = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/;
const SECRET_FILE = /(?:^|\/)(?:\.env(?:\..*)?|\.dev\.vars(?:\..*)?|credentials?(?:[._-].*)?|id_(?:rsa|ed25519)|[^/]+\.(?:pem|key|p12|pfx))$/i;
const SECRET_CONTENT = /(?:wsk_[A-Za-z0-9_-]{12,}|sk-(?:proj-)?[A-Za-z0-9_-]{20,}|Bearer\s+[A-Za-z0-9._~+/-]{16,}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|["'](?:api[_-]?key|access[_-]?token|client[_-]?secret|password|private[_-]?key)["']\s*:\s*["'][^"'\s]{8,}["'])/i;

function requireCondition(condition, message) {
  if (!condition) throw new Error(message);
}

function object(value, label) {
  requireCondition(value !== null && typeof value === "object" && !Array.isArray(value), `${label} must be an object`);
  return value;
}

function properties(value, allowed, label) {
  object(value, label);
  for (const key of Object.keys(value)) {
    requireCondition(allowed.includes(key), `${label}: unsupported property ${key}`);
  }
}

function nonblank(value, label, max = Infinity) {
  requireCondition(typeof value === "string" && value.trim().length > 0, `${label} must be a nonblank string`);
  requireCondition([...value].length <= max, `${label} exceeds ${max} characters`);
}

function httpsUrl(value, label) {
  nonblank(value, label, 1024);
  let url;
  try { url = new URL(value); } catch { throw new Error(`${label} must be an absolute HTTPS URL`); }
  requireCondition(url.protocol === "https:" && !url.username && !url.password, `${label} must use HTTPS without credentials`);
  requireCondition(!/(?:^|\.)(?:example\.(?:com|org|net)|invalid|localhost)$/.test(url.hostname), `${label} cannot use a placeholder host`);
}

function readJson(path, label) {
  try { return JSON.parse(readFileSync(path, "utf8")); }
  catch { throw new Error(`${label} is missing or is not valid JSON`); }
}

function noApps(value, label) {
  if (value === null || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value)) {
    requireCondition(key !== "apps" || child === null, `${label}: apps declarations are forbidden in public uploads`);
    noApps(child, label);
  }
}

function inventory(sourceDir) {
  const files = [];
  requireCondition(lstatSync(sourceDir).isDirectory() && !lstatSync(sourceDir).isSymbolicLink(), "Plugin source must be a real directory, not a symlink");
  function walk(directory) {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const absolute = join(directory, entry.name);
      const path = relative(sourceDir, absolute).split(sep).join("/");
      requireCondition(!/[\\\r\n\0]/.test(path), `Unsupported package path: ${path}`);
      requireCondition(!entry.isSymbolicLink(), `Symlinks are forbidden: ${path}`);
      requireCondition(!SECRET_FILE.test(path), `Credential files are forbidden: ${path}`);
      requireCondition(!path.split("/").some((part) => part === "node_modules" || part === "vendor" || part === ".git"), `Dependency or repository directories are forbidden: ${path}`);
      requireCondition(!path.split("/").some((part) => part.startsWith(".")), `Hidden files and compatibility overlays are forbidden in this public package: ${path}`);
      const root = path.split("/")[0];
      requireCondition(["plugin.json", "mcp.json", "README.md", "assets", "skills"].includes(root), `Unrelated package file or directory: ${path}`);
      if (entry.isDirectory()) {
        requireCondition(root === "assets" || root === "skills", `Unexpected package directory: ${path}`);
        walk(absolute);
      } else {
        requireCondition(entry.isFile(), `Only regular files are allowed: ${path}`);
        if (root === "assets") requireCondition(extname(path).toLowerCase() === ".png", `Public icons must be PNG files: ${path}`);
        if (root === "skills") requireCondition([".md", ".yaml", ".yml", ".json", ".txt"].includes(extname(path).toLowerCase()), `Unsupported skill file: ${path}`);
        if (root !== "assets") {
          const text = readFileSync(absolute, "utf8");
          requireCondition(!SECRET_CONTENT.test(text), `Credential-like content is forbidden: ${path}`);
          if (extname(path) === ".json") noApps(readJson(absolute, path), path);
        }
        files.push(path);
      }
    }
  }
  walk(sourceDir);
  return files.sort();
}

function containedFile(sourceDir, path, label, files, baseDir = sourceDir) {
  nonblank(path, label);
  requireCondition(!isAbsolute(path) && !/[\\\r\n\0]/.test(path), `${label} must reference a contained relative file`);
  const absolute = resolve(baseDir, path);
  const rel = relative(sourceDir, absolute).split(sep).join("/");
  requireCondition(rel !== ".." && !rel.startsWith("../") && !isAbsolute(rel), `${label} escapes the plugin directory`);
  requireCondition(files.includes(rel), `${label} references a missing package file: ${path}`);
  return absolute;
}

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngDimensions(path, label) {
  const bytes = readFileSync(path);
  requireCondition(bytes.length <= 5 * 1024 * 1024, `${label} exceeds 5 MiB`);
  requireCondition(bytes.length >= 45 && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])), `${label} must be an actual PNG file`);
  let offset = 8;
  let dimensions;
  let imageData = false;
  let ended = false;
  while (offset + 12 <= bytes.length) {
    const length = bytes.readUInt32BE(offset);
    const type = bytes.toString("ascii", offset + 4, offset + 8);
    const end = offset + 12 + length;
    requireCondition(end <= bytes.length, `${label} has a truncated PNG chunk`);
    requireCondition(crc32(bytes.subarray(offset + 4, end - 4)) === bytes.readUInt32BE(end - 4), `${label} has an invalid PNG checksum`);
    if (!dimensions) {
      requireCondition(type === "IHDR" && length === 13, `${label} is missing its PNG header`);
      dimensions = { width: bytes.readUInt32BE(offset + 8), height: bytes.readUInt32BE(offset + 12) };
    }
    if (type === "IDAT" && length > 0) imageData = true;
    offset = end;
    if (type === "IEND") { ended = length === 0 && offset === bytes.length; break; }
  }
  requireCondition(dimensions && imageData && ended, `${label} must be a complete PNG image`);
  return dimensions;
}

function icon(sourceDir, path, label, minimum, files) {
  const absolute = containedFile(sourceDir, path, label, files);
  requireCondition(relative(sourceDir, absolute).split(sep).join("/").startsWith("assets/"), `${label} must be inside assets/`);
  const { width, height } = pngDimensions(absolute, label);
  requireCondition(width === height && width >= minimum && width <= 4096, `${label} must be square and ${minimum}–4096 pixels`);
}

function yamlValue(frontmatter, key) {
  const match = frontmatter.match(new RegExp(`^${key}:\\s*(.*)$`, "m"));
  if (!match) return "";
  const value = match[1].trim();
  if (/^[>|][+-]?$/.test(value)) {
    const rest = frontmatter.slice(match.index + match[0].length).split("\n");
    const lines = [];
    for (const line of rest) {
      if (!line.trim()) continue;
      if (!/^\s+/.test(line)) break;
      lines.push(line.trim());
    }
    return lines.join(" ");
  }
  return value.replace(/^(["'])(.*)\1$/, "$2");
}

function skills(sourceDir, files) {
  const skillFiles = files.filter((path) => /^skills\/[^/]+\/SKILL\.md$/.test(path));
  requireCondition(skillFiles.length > 0, "At least one skills/<name>/SKILL.md is required");
  const folders = new Set(files.filter((path) => path.startsWith("skills/")).map((path) => path.split("/")[1]));
  for (const folder of folders) {
    requireCondition(NAME.test(folder) && folder.length <= 64, `Invalid skill folder name: ${folder}`);
    requireCondition(skillFiles.includes(`skills/${folder}/SKILL.md`), `Skill ${folder} is missing SKILL.md`);
  }
  for (const path of skillFiles) {
    const text = readFileSync(join(sourceDir, path), "utf8").replace(/\r\n/g, "\n");
    const frontmatter = text.match(/^---\n([\s\S]*?)\n---(?:\n|$)/)?.[1];
    requireCondition(frontmatter !== undefined, `${path} needs YAML frontmatter`);
    requireCondition(yamlValue(frontmatter, "name") === path.split("/")[1], `${path}: frontmatter name must match its folder`);
    nonblank(yamlValue(frontmatter, "description"), `${path}: description`);
  }
  for (const path of files.filter((path) => path.endsWith(".md"))) {
    const text = readFileSync(join(sourceDir, path), "utf8");
    const links = [...text.matchAll(/\]\(([^)\r\n]+)\)/g)].map((match) => match[1].match(/^<([^>]+)>|^(\S+)/)?.slice(1).find(Boolean));
    const references = [...text.matchAll(/`((?:\.\/)?references\/[^`\s]+)`/g)].map((match) => match[1]);
    for (const link of [...links, ...references].filter(Boolean)) {
      if (/^(?:https?:|mailto:|#)/i.test(link)) continue;
      const target = link.split(/[?#]/)[0];
      containedFile(sourceDir, target, `${path}: reference`, files, dirname(join(sourceDir, path)));
    }
  }
}

function reviewCase(value, label, positive) {
  properties(value, ["description", "prompt", "tools_triggered", "expected_behavior", "file_attachment_urls", "expected_output_url"], label);
  nonblank(value.description, `${label}.description`);
  nonblank(value.prompt, `${label}.prompt`);
  if (positive) {
    nonblank(value.tools_triggered, `${label}.tools_triggered`);
    nonblank(value.expected_behavior, `${label}.expected_behavior`);
  } else {
    requireCondition(value.tools_triggered === undefined && value.expected_behavior === undefined, `${label}: negative expectations belong in description`);
  }
  if (value.file_attachment_urls !== undefined) {
    requireCondition(Array.isArray(value.file_attachment_urls), `${label}.file_attachment_urls must be an array`);
    value.file_attachment_urls.forEach((url) => httpsUrl(url, `${label}.file_attachment_urls`));
  }
  if (value.expected_output_url !== undefined) httpsUrl(value.expected_output_url, `${label}.expected_output_url`);
}

export function validatePlugin({ sourceDir = join(REPO_ROOT, "plugins", "webstashai"), requireSubmission = false } = {}) {
  sourceDir = resolve(sourceDir);
  const files = inventory(sourceDir);
  const manifest = readJson(join(sourceDir, "plugin.json"), "plugin.json");
  properties(manifest, ["$schema", "name", "version", "description", "author", "homepage", "repository", "license", "keywords", "extensions"], "plugin.json");
  requireCondition(manifest.$schema === PLUGIN_SCHEMA, "plugin.json must use the Agent Plugins 1.0 schema identifier");
  requireCondition(typeof manifest.name === "string" && NAME.test(manifest.name) && manifest.name.length <= 64, "plugin.json.name must be lowercase kebab-case, at most 64 characters");
  requireCondition(manifest.name === basename(sourceDir), "plugin.json.name must match its package directory");
  requireCondition(typeof manifest.version === "string" && SEMVER.test(manifest.version), "plugin.json.version must be strict semantic versioning");
  nonblank(manifest.description, "plugin.json.description");
  properties(manifest.author, ["name", "email", "url"], "plugin.json.author");
  nonblank(manifest.author.name, "plugin.json.author.name");
  for (const key of ["email", "url"]) if (manifest.author[key] !== undefined) nonblank(manifest.author[key], `plugin.json.author.${key}`);
  for (const key of ["homepage", "repository", "license"]) if (manifest[key] !== undefined) nonblank(manifest[key], `plugin.json.${key}`);
  if (manifest.keywords !== undefined) {
    requireCondition(Array.isArray(manifest.keywords), "plugin.json.keywords must be an array");
    manifest.keywords.forEach((keyword) => nonblank(keyword, "plugin.json.keywords"));
  }
  const extensions = object(manifest.extensions, "plugin.json.extensions");
  Object.entries(extensions).forEach(([key, value]) => object(value, `plugin.json.extensions.${key}`));
  const openai = object(extensions["com.openai"], "extensions.com.openai");
  properties(openai, ["interface", "review", "publication"], "extensions.com.openai");
  const listing = openai.interface;
  properties(listing, ["displayName", "shortDescription", "longDescription", "developerName", "category", "capabilities", "defaultPrompt", "websiteURL", "supportURL", "privacyPolicyURL", "termsOfServiceURL", "logo", "composerIcon", "logoDark", "composerIconDark", "brandColor", "brandColorDark"], "interface");
  for (const [key, max] of [["displayName", 30], ["shortDescription", 30], ["longDescription", 4000], ["developerName", 80]]) nonblank(listing[key], `interface.${key}`, max);
  requireCondition(listing.developerName === manifest.author.name, "interface.developerName must match author.name");
  nonblank(listing.category, "interface.category");
  if (listing.capabilities !== undefined) {
    requireCondition(Array.isArray(listing.capabilities), "interface.capabilities must be an array");
    listing.capabilities.forEach((capability) => nonblank(capability, "interface.capabilities"));
  }
  const prompts = typeof listing.defaultPrompt === "string" ? [listing.defaultPrompt] : listing.defaultPrompt;
  requireCondition(Array.isArray(prompts) && prompts.length >= 1 && prompts.length <= 3, "interface.defaultPrompt needs one to three prompts");
  const normalized = new Set();
  prompts.forEach((prompt) => {
    nonblank(prompt, "interface.defaultPrompt", 128);
    requireCondition(!/[\r\n]/.test(prompt) && !/@/.test(prompt), "Default prompts must be single-line and contain no app @mentions");
    const key = prompt.trim().replace(/\s+/g, " ");
    requireCondition(!normalized.has(key), "Default prompts must be unique after whitespace normalization");
    normalized.add(key);
  });
  const submissionGaps = [];
  for (const key of ["websiteURL", "supportURL", "privacyPolicyURL", "termsOfServiceURL"]) {
    if (listing[key] === undefined) submissionGaps.push(`interface.${key}`);
    else httpsUrl(listing[key], `interface.${key}`);
  }
  for (const [key, minimum] of [["logo", 256], ["composerIcon", 48], ["logoDark", 256], ["composerIconDark", 48]]) {
    if (key === "logo" || key === "composerIcon" || listing[key] !== undefined) icon(sourceDir, listing[key], `interface.${key}`, minimum, files);
  }
  for (const key of ["brandColor", "brandColorDark"]) {
    if (listing[key] !== undefined) requireCondition(/^#[\da-fA-F]{6}$/.test(listing[key]), `interface.${key} must be a six-digit hex color`);
  }
  const review = openai.review;
  properties(review, ["test_cases", "commerce", "commerce_description", "demo_recording_url"], "review");
  requireCondition(review.commerce === false, "review.commerce must be false for existing-account-only access");
  if (review.commerce_description !== undefined) nonblank(review.commerce_description, "review.commerce_description");
  properties(review.test_cases, ["positive", "negative"], "review.test_cases");
  for (const [kind, count] of [["positive", 5], ["negative", 3]]) {
    const cases = review.test_cases[kind];
    requireCondition(Array.isArray(cases) && cases.length === count, `review.test_cases.${kind} needs exactly ${count} cases`);
    cases.forEach((value, index) => reviewCase(value, `review.test_cases.${kind}[${index}]`, kind === "positive"));
  }
  if (review.demo_recording_url === undefined) submissionGaps.push("review.demo_recording_url");
  else httpsUrl(review.demo_recording_url, "review.demo_recording_url");
  const publication = openai.publication;
  properties(publication, ["release_notes", "countries", "translations"], "publication");
  nonblank(publication.release_notes, "publication.release_notes");
  requireCondition(Array.isArray(publication.countries) && publication.countries.length === 0, "publication.countries must be [] for all supported countries");
  if (publication.translations !== undefined) object(publication.translations, "publication.translations");
  const mcp = readJson(join(sourceDir, "mcp.json"), "mcp.json");
  properties(mcp, ["$schema", "mcpServers"], "mcp.json");
  requireCondition(mcp.$schema === MCP_SCHEMA, "mcp.json must use the Agent Plugins 1.0 MCP schema identifier");
  const servers = Object.entries(object(mcp.mcpServers, "mcp.json.mcpServers"));
  requireCondition(servers.length === 1 && servers[0][0] === manifest.name, "mcp.json must contain exactly one server matching the package name");
  const server = servers[0][1];
  properties(server, ["type", "url"], "MCP server (credentials and headers are forbidden)");
  requireCondition(server.type === "streamable-http" && server.url === MCP_URL, `MCP server must use streamable-http at the verified production endpoint ${MCP_URL}`);
  skills(sourceDir, files);
  requireCondition(!requireSubmission || submissionGaps.length === 0, `Public submission fields are missing: ${submissionGaps.join(", ")}`);
  return { name: manifest.name, version: manifest.version, files, submissionGaps };
}

export function packagePlugin({ sourceDir = join(REPO_ROOT, "plugins", "webstashai"), outputDir = join(REPO_ROOT, ".artifacts", "plugins"), requireSubmission = false } = {}) {
  sourceDir = resolve(sourceDir);
  const report = validatePlugin({ sourceDir, requireSubmission });
  const stagingDir = mkdtempSync(join(tmpdir(), "webstashai-openai-plugin-"));
  try {
    const stagedPlugin = join(stagingDir, report.name);
    mkdirSync(stagedPlugin);
    for (const path of report.files) {
      const target = join(stagedPlugin, path);
      mkdirSync(dirname(target), { recursive: true });
      copyFileSync(join(sourceDir, path), target);
    }
    // Validate the copied snapshot too, so any change while copying fails closed.
    validatePlugin({ sourceDir: stagedPlugin, requireSubmission });
    const archive = join(stagingDir, `${report.name}-${report.version}.zip`);
    const expected = [`${report.name}/`, ...report.files.map((path) => `${report.name}/${path}`)];
    execFileSync("zip", ["-q", "-X", archive, ...expected], { cwd: stagingDir, stdio: "pipe" });
    const archivedFiles = execFileSync("unzip", ["-Z", "-1", archive], { encoding: "utf8" }).trim().split("\n");
    requireCondition(JSON.stringify(archivedFiles.sort()) === JSON.stringify([...expected].sort()), "ZIP inventory does not match the validated source files");
    for (const path of report.files) {
      const bytes = execFileSync("unzip", ["-p", archive, `${report.name}/${path}`], { maxBuffer: 6 * 1024 * 1024 });
      requireCondition(bytes.equals(readFileSync(join(stagedPlugin, path))), `ZIP file differs from the validated source: ${path}`);
    }
    mkdirSync(outputDir, { recursive: true });
    const destination = join(resolve(outputDir), basename(archive));
    renameSync(archive, destination);
    return { ...report, archive: destination };
  } finally {
    rmSync(stagingDir, { recursive: true, force: true });
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const args = process.argv.slice(2);
    requireCondition(args.every((arg) => ["--check", "--require-submission"].includes(arg)), "Usage: node scripts/package-openai-plugin.mjs [--check] [--require-submission]");
    const options = { requireSubmission: args.includes("--require-submission") };
    const report = args.includes("--check") ? validatePlugin(options) : packagePlugin(options);
    console.log(JSON.stringify(report, null, 2));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
