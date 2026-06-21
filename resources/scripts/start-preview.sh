#!/bin/bash
cd /home/z/my-project
exec node serve-preview.cjs >> /tmp/preview-server.log 2>&1
