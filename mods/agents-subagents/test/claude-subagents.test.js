import { test } from "node:test";
import assert from "node:assert/strict";
import { parseMeta, subagentIdFromTranscript, subagentTerminals, shortModel, sessionIdFromRecord, subagentsDirOfTranscript, needsSessionLookup } from "../claude-subagents.js";

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

test("shouldShortenFullModelIdToItsFamily", () => {
  assert.equal(shortModel("claude-opus-5-5"), "opus");
});

test("shouldShortenDatedModelIdWithVersionFirst", () => {
  assert.equal(shortModel("claude-3-5-sonnet-20241022"), "sonnet");
});

test("shouldKeepModelAliasAsIs", () => {
  assert.equal(shortModel("haiku"), "haiku");
});

test("shouldNameSubagentWithShortModel", () => {
  const metaById = new Map([["a1", { ...RUNNING_META, model: "claude-opus-5-5" }]]);

  assert.equal(subagentTerminals(PARENT, metaById)[0].name, "Esperar 30 segundos y responder ok · opus");
});

test("shouldReadSessionIdFromProcessRecord", () => {
  const record = '{"pid":60847,"sessionId":"e22eaa2c-12b6-4505-9f3d-434b96a5c67a","cwd":"/Users/ana/work"}';

  assert.equal(sessionIdFromRecord(record), "e22eaa2c-12b6-4505-9f3d-434b96a5c67a");
});

test("shouldReturnNullWhenProcessRecordIsMissingOrCorrupt", () => {
  assert.equal(sessionIdFromRecord(null), null);
  assert.equal(sessionIdFromRecord('{"pid":1'), null);
  assert.equal(sessionIdFromRecord('{"pid":1}'), null);
});

test("shouldRejectSessionIdThatIsNotAPlainName", () => {
  assert.equal(sessionIdFromRecord('{"sessionId":"../../etc"}'), null);
});

test("shouldPlaceSubagentsNextToTranscript", () => {
  const transcript = "/Users/ana/.claude/projects/-Users-ana-work/e22eaa2c.jsonl\n";

  assert.equal(subagentsDirOfTranscript(transcript), "/Users/ana/.claude/projects/-Users-ana-work/e22eaa2c/subagents");
});

test("shouldFindNoSubagentsDirWhenTranscriptIsNotFound", () => {
  assert.equal(subagentsDirOfTranscript(""), null);
});

const UNLABELLED_CLAUDE = { address: "t1v", state: "live", labels: {}, program: CLAUDE_PROGRAM, foreground: { argv: ["claude"], pid: 60847 } };

test("shouldLookUpSessionOfUnlabelledLocalClaude", () => {
  assert.equal(needsSessionLookup(UNLABELLED_CLAUDE), true);
});

test("shouldNotLookUpSessionWhenHookAlreadyLabelledIt", () => {
  const labelled = { ...UNLABELLED_CLAUDE, labels: { claude_subagents: "/x/subagents" } };

  assert.equal(needsSessionLookup(labelled), false);
});

test("shouldNotLookUpSessionOfOtherPrograms", () => {
  const shell = { ...UNLABELLED_CLAUDE, program: { ...CLAUDE_PROGRAM, key: "zsh" } };

  assert.equal(needsSessionLookup(shell), false);
});

test("shouldNotLookUpSessionOnAnotherMachine", () => {
  assert.equal(needsSessionLookup({ ...UNLABELLED_CLAUDE, address: "vps/t7" }), false);
});

test("shouldNotLookUpSessionWithoutForegroundPid", () => {
  assert.equal(needsSessionLookup({ ...UNLABELLED_CLAUDE, foreground: null }), false);
});
