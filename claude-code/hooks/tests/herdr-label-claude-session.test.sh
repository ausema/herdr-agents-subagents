#!/usr/bin/env bash
# Runs the hook against a fake herdr-core placed first on PATH.
set -u
HOOK="${HOOK:-$(cd "$(dirname "$0")/.." && pwd)/herdr-label-claude-session}"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT
CALLS="$WORK/calls"
failures=0

# The fake answers `get` with the given foreground pid and records every `label` call.
fake_herdr_core() {
  local exit_code="$1" foreground_pid="${2:-$$}"
  mkdir -p "$WORK/bin"
  printf '#!/usr/bin/env bash\nif [ "$1" = get ]; then echo "{\\"foreground\\":{\\"pid\\":%s}}"; exit 0; fi\necho "$*" >> "%s"\nexit %s\n' "$foreground_pid" "$CALLS" "$exit_code" > "$WORK/bin/herdr-core"
  chmod +x "$WORK/bin/herdr-core"
  rm -f "$CALLS"
}

check() {
  local name="$1" expected_calls="$2" actual_exit="$3"
  local actual_calls=""
  [ -f "$CALLS" ] && actual_calls="$(cat "$CALLS")"
  if [ "$actual_exit" = "0" ] && [ "$actual_calls" = "$expected_calls" ]; then
    echo "PASS $name"
  else
    echo "FAIL $name: exit=$actual_exit calls='$actual_calls' expected='$expected_calls'"
    failures=$((failures + 1))
  fi
}

fake_herdr_core 0
echo '{"transcript_path":"/p/abc.jsonl","source":"startup"}' | HC_TERMINAL_ID=t9 PATH="$WORK/bin:$PATH" "$HOOK" >/dev/null 2>&1
check should_label_terminal_when_inside_herdr "label t9 claude_subagents=/p/abc/subagents" "$?"

fake_herdr_core 0
echo '{"transcript_path":"/p/abc.jsonl","source":"startup"}' | env -u HC_TERMINAL_ID PATH="$WORK/bin:$PATH" "$HOOK" >/dev/null 2>&1
check should_do_nothing_when_outside_herdr "" "$?"

fake_herdr_core 0
echo '{}' | HC_TERMINAL_ID=t9 PATH="$WORK/bin:$PATH" "$HOOK" >/dev/null 2>&1
check should_do_nothing_when_input_has_no_transcript "" "$?"

fake_herdr_core 1
echo '{"transcript_path":"/p/abc.jsonl"}' | HC_TERMINAL_ID=t9 PATH="$WORK/bin:$PATH" "$HOOK" >/dev/null 2>&1
check should_exit_zero_when_herdr_core_fails "label t9 claude_subagents=/p/abc/subagents" "$?"

fake_herdr_core 0 1
echo '{"transcript_path":"/p/child.jsonl"}' | HC_TERMINAL_ID=t9 PATH="$WORK/bin:$PATH" "$HOOK" >/dev/null 2>&1
check should_not_relabel_when_claude_is_not_the_terminal_program "" "$?"

exit "$failures"
