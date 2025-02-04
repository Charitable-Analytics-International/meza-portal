#!/bin/bash

# load the configuration file
source config.sh

# check
if [ -z ${ABSOLUTE_PATH+x} ]; then ABSOLUTE_PATH="~/meza-portal"; fi

# Launch API: Authentication
tmux new -d -s api-authentication &&
tmux send-keys -t api-authentication "cd ${ABSOLUTE_PATH}/meza-api-authentication && npm start" C-m
tmux detach -s api-authentication

# Launch API: Files
tmux new -d -s api-files &&
tmux send-keys -t api-files "cd ${ABSOLUTE_PATH}/meza-api-files && npm start" C-m
tmux detach -s api-files

# Launch API: Gatekeeper
tmux new -d -s api-gatekeeper &&
tmux send-keys -t api-gatekeeper "cd ${ABSOLUTE_PATH}/meza-api-gatekeeper && npm start" C-m
tmux detach -s api-gatekeeper

# Launch API: Project
tmux new -d -s api-project &&
tmux send-keys -t api-project "cd ${ABSOLUTE_PATH}/meza-api-project && npm start" C-m
tmux detach -s api-project

# Launch Image Processors
tmux new -d -s imageprocessor &&
tmux send-keys -t imageprocessor "cd ${ABSOLUTE_PATH}/meza-imageprocessor && npm start" C-m
tmux detach -s imageprocessor

# Launch Notebook
tmux new -d -s notebook &&
tmux send-keys -t notebook "cd ${ABSOLUTE_PATH}/meza-notebook && ./run.sh" C-m
tmux detach -s notebook
