#!/usr/bin/env bash

set -Eeuo pipefail

# Configuration
SSH_HOST="dhamaka"
SSH_KEY="$HOME/.ssh/dhamaka"
REMOTE_DIR="/home/abhi/app"
JAR_NAME="random-games-1.0.0-SNAPSHOT.jar"
SERVICE_NAME="random-games"

# SSH options
SSH_OPTS=(
    -i "$SSH_KEY"
    -o IdentitiesOnly=yes
)

# Validate SSH key
if [[ ! -f "$SSH_KEY" ]]; then
    echo "ERROR: SSH key not found: $SSH_KEY"
    exit 1
fi

# Build application
echo "==> Building application..."
/usr/bin/mvn clean package -DskipTests

# Locate JAR
JAR_PATH="target/${JAR_NAME}"

if [[ ! -f "$JAR_PATH" ]]; then
    echo "ERROR: JAR not found: $JAR_PATH"
    echo "Check JAR_NAME or update JAR_PATH."
    exit 1
fi

# Upload JAR
echo "==> Uploading ${JAR_NAME} to ${SSH_HOST}..."
scp "${SSH_OPTS[@]}" \
    "$JAR_PATH" \
    "${SSH_HOST}:${REMOTE_DIR}/${JAR_NAME}"

# Restart systemd service
echo "==> Restarting ${SERVICE_NAME}..."
ssh "${SSH_OPTS[@]}" "$SSH_HOST" \
    "sudo -n /usr/bin/systemctl restart '${SERVICE_NAME}.service' &&
     sudo -n /usr/bin/systemctl is-active '${SERVICE_NAME}.service'"

echo "==> Deployment successful!"
