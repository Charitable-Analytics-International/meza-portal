#!/bin/bash

# Function to kill a tmux session if it exists
kill_tmux_session() {
    local session_name=$1
    if tmux has-session -t ${session_name} 2>/dev/null; then
        tmux kill-session -t ${session_name}
        echo "Killed tmux session: ${session_name}"
    else
        echo "Tmux session ${session_name} does not exist."
    fi
}

# Kill tmux sessions
kill_tmux_session api-authentication
kill_tmux_session api-files
kill_tmux_session api-gatekeeper
kill_tmux_session api-project
kill_tmux_session imageprocessor
kill_tmux_session notebook

# Inform user
tmux ls
