// Popup UI logic.
//
// The popup manages the token in storage and drives the "Test connection"
// spike. It NEVER calls the Notion API itself — it asks the service worker to
// do it (see shared/messages.ts and background/service-worker.ts) because only
// privileged extension contexts bypass CORS for api.notion.com.

import type {
  TestConnectionMessage,
  TestConnectionResponse,
} from "../shared/messages.js";
import { getToken, setToken } from "../shared/storage.js";
import type { NotionUser } from "../notion/types.js";

type StatusKind = "info" | "ok" | "err";

function requireElement<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) {
    throw new Error(`Missing element #${id}`);
  }
  return el as T;
}

const tokenInput = requireElement<HTMLInputElement>("token");
const saveButton = requireElement<HTMLButtonElement>("save");
const testButton = requireElement<HTMLButtonElement>("test");
const statusEl = requireElement<HTMLDivElement>("status");

function setStatus(kind: StatusKind, message: string): void {
  statusEl.className = `status status--${kind}`;
  statusEl.textContent = message;
}

/**
 * Derives a friendly label for the connected integration from the bot user.
 */
function describeUser(user: NotionUser): string {
  const workspace = user.bot?.workspace_name?.trim();
  const name = user.name?.trim();
  if (workspace && name) {
    return `Connected as "${name}" in workspace "${workspace}".`;
  }
  if (workspace) {
    return `Connected to workspace "${workspace}".`;
  }
  if (name) {
    return `Connected as "${name}".`;
  }
  return `Connected (bot user ${user.id}).`;
}

async function sendTestConnection(
  token: string | undefined,
): Promise<TestConnectionResponse> {
  const message: TestConnectionMessage = { type: "notion:testConnection" };
  if (token) {
    message.token = token;
  }
  return chrome.runtime.sendMessage<
    TestConnectionMessage,
    TestConnectionResponse
  >(message);
}

async function handleSave(): Promise<void> {
  const value = tokenInput.value.trim();
  await setToken(value);
  if (value.length === 0) {
    setStatus("info", "Token cleared.");
  } else {
    setStatus("info", "Token saved.");
  }
}

async function handleTest(): Promise<void> {
  const typed = tokenInput.value.trim();
  testButton.disabled = true;
  setStatus("info", "Testing connection...");
  try {
    // Prefer the currently-typed token so the user can test before saving.
    const response = await sendTestConnection(typed || undefined);
    if (response.ok) {
      setStatus("ok", describeUser(response.user));
    } else {
      setStatus("err", response.error);
    }
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    setStatus("err", `Could not reach the service worker: ${detail}`);
  } finally {
    testButton.disabled = false;
  }
}

async function init(): Promise<void> {
  const saved = await getToken();
  if (saved) {
    tokenInput.value = saved;
    setStatus("info", "Saved token loaded. Click “Test connection”.");
  } else {
    setStatus("info", "Paste your Notion integration token to begin.");
  }
}

saveButton.addEventListener("click", () => {
  void handleSave();
});
testButton.addEventListener("click", () => {
  void handleTest();
});

void init();
