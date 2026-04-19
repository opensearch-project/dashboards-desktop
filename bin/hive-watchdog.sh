#!/bin/bash
# Hive Watchdog — pings idle agents every N minutes to check inbox and pick up tasks
# Usage: ./bin/hive-watchdog.sh [interval_minutes]
#   default interval: 20 minutes

INTERVAL_MIN=${1:-20}
INTERVAL_SEC=$((INTERVAL_MIN * 60))
SESSION="${KIRO_HIVE_SESSION:-desktop}"
AGENTS=("sde" "fee" "devops" "test")
PANES=("%0" "%1" "%2" "%3")
LOG="/tmp/kiro-hive-watchdog.log"

echo "[watchdog] Started at $(date -Iseconds), interval=${INTERVAL_MIN}m, session=${SESSION}" | tee -a "$LOG"

while true; do
  TIMESTAMP=$(date -Iseconds)
  echo "[$TIMESTAMP] [watchdog] Ping cycle starting" | tee -a "$LOG"

  for i in "${!AGENTS[@]}"; do
    agent="${AGENTS[$i]}"
    pane="${PANES[$i]}"

    # Check if pane is idle (sitting at input prompt)
    last_line=$(tmux capture-pane -t "$pane" -p 2>/dev/null | grep -v '^$' | tail -1)

    if echo "$last_line" | grep -q "ask a question"; then
      echo "[$TIMESTAMP] [watchdog] $agent is IDLE — poking" | tee -a "$LOG"
      tmux send-keys -t "$pane" C-u 2>/dev/null
      sleep 0.3
      tmux send-keys -t "$pane" "Check your inbox: any pending messages from pm or other agents? If you have a pending task (like reviewing the RFC), please do it now. Read ~/wss/dashboards-desktop/RFC-2026-DESKTOP-AGENT.md if you haven't yet. Send feedback to pm via: kiro-hive tell pm \"your feedback\"" Enter
    else
      echo "[$TIMESTAMP] [watchdog] $agent is BUSY — skipping" | tee -a "$LOG"
    fi
  done

  echo "[$TIMESTAMP] [watchdog] Ping cycle done. Sleeping ${INTERVAL_MIN}m" | tee -a "$LOG"
  sleep "$INTERVAL_SEC"
done
