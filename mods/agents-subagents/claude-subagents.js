// Claude Code sub-agents run inside their parent's process, so herdr-core has no terminal
// for them. These pure helpers turn Claude's own sub-agent records into child entries
// shaped like terminals(), so the agents tree draws them unchanged.

export const SUBAGENTS_LABEL = "claude_subagents";
export const STALE_MINUTES = 30;

const SUBAGENT_ADDRESS_PREFIX = "claude-sub:";
const TRANSCRIPT_NAME = /(?:^|\/)agent-([^/.]+)\.jsonl$/;
const CLAUDE_PROGRAM_KEY = "claude";
// Machine-prefixed addresses ("vps/t7") are terminals on another computer: their ~/.claude isn't ours.
const REMOTE_ADDRESS = /\//;
const SESSION_ID = /^[A-Za-z0-9-]+$/;
// "claude-opus-5-5" -> "opus", "claude-3-5-sonnet-20241022" -> "sonnet"; aliases ("haiku") don't match.
const MODEL_FAMILY = /^claude-(?:\d+-)*([a-z]+)/;
const TRANSCRIPT_SUFFIX = ".jsonl";

export function subagentIdFromTranscript(path) {
  return TRANSCRIPT_NAME.exec(path)?.[1] ?? null;
}

export function parseMeta(text) {
  if (text == null) {
    return null;
  }
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export function shortModel(model) {
  return MODEL_FAMILY.exec(model)?.[1] ?? model;
}

function subagentName(meta) {
  const label = meta.description || meta.agentType;
  return meta.model ? `${label} · ${shortModel(meta.model)}` : label;
}

// A Claude terminal the SessionStart hook never labelled (it was running before the hook
// was installed, or there is no hook): its session is found from its process record.
export function needsSessionLookup(terminal) {
  return terminal.state === "live"
    && !terminal.labels?.[SUBAGENTS_LABEL]
    && terminal.program?.key === CLAUDE_PROGRAM_KEY
    && Boolean(terminal.foreground?.pid)
    && !REMOTE_ADDRESS.test(terminal.address);
}

// ~/.claude/sessions/<pid>.json, which Claude Code keeps for each running process.
export function sessionIdFromRecord(text) {
  const sessionId = parseMeta(text)?.sessionId;
  return typeof sessionId === "string" && SESSION_ID.test(sessionId) ? sessionId : null;
}

// Same folder the hook derives from transcript_path: <session>.jsonl -> <session>/subagents.
export function subagentsDirOfTranscript(findOutput) {
  const transcript = findOutput.split("\n").find((line) => line.endsWith(TRANSCRIPT_SUFFIX));
  return transcript ? `${transcript.slice(0, -TRANSCRIPT_SUFFIX.length)}/subagents` : null;
}

export function subagentTerminals(parent, metaById) {
  return [...metaById]
    .filter(([, meta]) => meta && !meta.finished)
    .map(([id, meta]) => ({
      address: `${SUBAGENT_ADDRESS_PREFIX}${id}`,
      parent: parent.address,
      state: "live",
      status: "working",
      name: subagentName(meta),
      program: parent.program,
      virtual: true,
    }));
}
