// Claude Code sub-agents run inside their parent's process, so herdr-core has no terminal
// for them. These pure helpers turn Claude's own sub-agent records into child entries
// shaped like terminals(), so the agents tree draws them unchanged.

export const SUBAGENTS_LABEL = "claude_subagents";
export const STALE_MINUTES = 30;

const SUBAGENT_ADDRESS_PREFIX = "claude-sub:";
const TRANSCRIPT_NAME = /(?:^|\/)agent-([^/.]+)\.jsonl$/;

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

function subagentName(meta) {
  const label = meta.description || meta.agentType;
  return meta.model ? `${label} · ${meta.model}` : label;
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
