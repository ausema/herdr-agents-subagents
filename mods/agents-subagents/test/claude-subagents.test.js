import { test } from "node:test";
import assert from "node:assert/strict";
import { parseMeta, subagentIdFromTranscript, subagentTerminals } from "../claude-subagents.js";

const CLAUDE_PROGRAM = { key: "claude", name: "Claude Code", icon: "icons/claude.svg", tint: false, tile: null, color: null, shell: false, agent: true };
const PARENT = { address: "t1h", program: CLAUDE_PROGRAM };
const RUNNING_META = {
  agentType: "general-purpose",
  isBuiltIn: true,
  description: "Esperar 30 segundos y responder ok",
  toolUseId: "toolu_01YQ8jCdDN95ALsPKsr98um1",
  spawnDepth: 1,
  requestShape: "background",
  model: "haiku",
};

test("shouldBuildWorkingChildWhenSubagentIsRunning", () => {
  const metaById = new Map([["ae8c0ae8781bd73f8", RUNNING_META]]);

  const children = subagentTerminals(PARENT, metaById);

  assert.deepEqual(children, [{
    address: "claude-sub:ae8c0ae8781bd73f8",
    parent: "t1h",
    state: "live",
    status: "working",
    name: "Esperar 30 segundos y responder ok · haiku",
    program: CLAUDE_PROGRAM,
    virtual: true,
  }]);
});

test("shouldSkipSubagentWhenFinished", () => {
  const metaById = new Map([["ae8c0ae8781bd73f8", { ...RUNNING_META, finished: true }]]);

  assert.deepEqual(subagentTerminals(PARENT, metaById), []);
});

test("shouldSkipSubagentWhenMetaIsCorrupt", () => {
  const corrupt = parseMeta('{"desc');

  assert.equal(corrupt, null);
  assert.deepEqual(subagentTerminals(PARENT, new Map([["a1", corrupt]])), []);
});

test("shouldNameSubagentByTypeWhenItHasNoDescriptionNorModel", () => {
  const metaById = new Map([["a1", { agentType: "Explore" }]]);

  assert.equal(subagentTerminals(PARENT, metaById)[0].name, "Explore");
});

test("shouldExtractIdFromTranscriptName", () => {
  assert.equal(subagentIdFromTranscript("/x/subagents/agent-ae8c0ae8781bd73f8.jsonl"), "ae8c0ae8781bd73f8");
});

test("shouldReturnNullForOtherFiles", () => {
  assert.equal(subagentIdFromTranscript("/x/subagents/agent-ae8c0ae8781bd73f8.meta.json"), null);
});
