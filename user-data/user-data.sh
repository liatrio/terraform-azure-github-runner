#!/bin/bash -x
exec > >(tee /var/log/user-data.log | logger -t user-data -s 2>/dev/console) 2>&1

# retain variable setup for later dependent step(s)
USER_NAME=ubuntu
USER_ID=$(id -ru $USER_NAME)

# Install runner
# Create a folder
cd /opt
mkdir actions-runner && cd actions-runner
# Download the latest runner package
curl -o actions-runner-linux-x64-2.294.0.tar.gz -L https://github.com/actions/runner/releases/download/v2.294.0/actions-runner-linux-x64-2.294.0.tar.gz
# Optional: Validate the hash
echo "a19a09f4eda5716e5d48ba86b6b78fc014880c5619b9dba4a059eaf65e131780  actions-runner-linux-x64-2.294.0.tar.gz" | shasum -a 256 -c
# Extract the installer
tar xzf ./actions-runner-linux-x64-2.294.0.tar.gz

# config runner for rootless docker
cd /opt/actions-runner/
echo DOCKER_HOST=unix:///run/user/$USER_ID/docker.sock >>.env
echo PATH=/home/$USER_NAME/bin:$PATH >>.env

export GITHUB_TOKEN=${registration_pat}

echo $GITHUB_TOKEN | gh auth login --with-token

export REGISTRATION_TOKEN=$(gh api https://api.github.com/orgs/${org}/actions/runners/registration-token --method POST | jq -r .token)

cd /opt && sudo chown -R ${USER_NAME}:${USER_NAME} ./actions-runner && cd actions-runner

sudo -b -i -u ${USER_NAME} --preserve-env=REGISTRATION_TOKEN <<EOF
cd /opt/actions-runner

./config.sh \
  --unattended \
  --ephemeral \
  --replace \
  --labels ${runner_labels} \
  --url https://github.com/${org} \
  --token $REGISTRATION_TOKEN

./run.sh
EOF
