#!/bin/bash
# Fully detached launcher for the preview watchdog.
# Uses setsid + nohup + disowned to survive shell exits.
cd /home/z/my-project
exec setsid nohup bash /home/z/my-project/.zscripts/dev.sh </dev/null >/tmp/axia-preview.log 2>&1
