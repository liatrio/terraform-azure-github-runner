#!/bin/bash -x
exec > >(tee /var/log/user-data.log | logger -t user-data -s 2>/dev/console) 2>&1

# Script needs three input variables, expected as environment variables at this time
# RUNNER_VERSION  e.g. "2.295.0"
# RUNNER_LABELS   e.g. "azure, vm"
# GH_ORG          e.g. "liatrio-enterprise"

# retain variable setup for later dependent step(s)
USER_NAME=ubuntu
USER_ID=$(id -ru $USER_NAME)

# Install runner
# Create a folder
cd /opt
mkdir actions-runner && cd actions-runner
# Download the latest runner package
url=https://github.com/actions/runner/releases/download/v${RUNNER_VERSION}/actions-runner-linux-x64-${RUNNER_VERSION}.tar.gz
curl -LO $url
# Optional: Validate the hash
# echo "${RUNNER_SHA}  actions-runner-linux-x64-${RUNNER_VERSION}.tar.gz" | shasum -a 256 -c
# Extract the installer
tar xzf ./actions-runner-linux-x64-2.294.0.tar.gz

# config runner for rootless docker
cd /opt/actions-runner/
echo DOCKER_HOST=unix:///run/user/$USER_ID/docker.sock >>.env
echo PATH=/home/$USER_NAME/bin:$PATH >>.env

# retrieve gh registration token from azure key vault
az login --identity --allow-no-subscription
export REGISTRATION_TOKEN=`az keyvault secret show -n $(hostname) --vault-name kv-github-runner | jq -r '.value'`

cd /opt && sudo chown -R ${USER_NAME}:${USER_NAME} ./actions-runner && cd actions-runner

sudo -b -i -u ${USER_NAME} --preserve-env=REGISTRATION_TOKEN <<EOF
cd /opt/actions-runner

./config.sh \
  --unattended \
  --ephemeral \
  --replace \
  --labels ${RUNNER_LABELS} \
  --url https://github.com/${GH_ORG} \
  --token $REGISTRATION_TOKEN

./run.sh
EOF
