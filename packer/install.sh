set -xe
export DEBIAN_FRONTEND=noninteractive

# gh cli install
VERSION=`curl  "https://api.github.com/repos/cli/cli/releases/latest" | grep '"tag_name"' | sed -E 's/.*"([^"]+)".*/\1/' | cut -c2-` 
mkdir gh-cli && cd gh-cli
url=https://github.com/cli/cli/releases/download/v${VERSION}/gh_${VERSION}_linux_amd64.tar.gz
curl -sSLO $url
tar xvf gh_${VERSION}_linux_amd64.tar.gz
sudo cp gh_${VERSION}_linux_amd64/bin/gh /usr/local/bin/
sudo cp -r gh_${VERSION}_linux_amd64/share/man/man1/* /usr/share/man/man1/

# get and apply MSFT cert for package repo
wget https://packages.microsoft.com/config/ubuntu/22.04/packages-microsoft-prod.deb -O packages-microsoft-prod.deb
sudo dpkg -i packages-microsoft-prod.deb
rm packages-microsoft-prod.deb

# install apt-transport-https and update/upgrade apt-get
sudo apt-get update
sudo apt-get install -y apt-transport-https
sudo apt-get update
sudo apt-get upgrade -y

# update nodejs source repo
sudo apt-get install -y curl
curl -fsSL https://deb.nodesource.com/setup_16.x | sudo -E bash -

# install azure cli from official source
curl -fsSL https://aka.ms/InstallAzureCLIDeb | sudo -E bash -

# install packages
sudo apt-get install -y \
    awscli \
    gitsome \
    net-tools \
    iputils-ping \
    jq \
    wget \
    git \
    uidmap \
    build-essential \
    unzip \
    nodejs \
    python \
    pip \
    ruby \
    golang-go \
    default-jdk \
    maven \
    gradle \
    dotnet-sdk-6.0

# Configure user variables
USER_NAME=ubuntu
USER_ID=$(id -ru $USER_NAME)

# install rootless docker
curl -fsSL https://get.docker.com/rootless | sh

echo export DOCKER_HOST=unix:///run/user/$USER_ID/docker.sock >>/home/$USER_NAME/.profile

# Following three lines are above the docker service steps to allow a single $PATH export
echo export CODEQL_HOME=/usr/local/codeql-home >>/home/$USER_NAME/.profile
CODEQL_HOME=/usr/local/codeql-home
echo export PATH=$CODEQL_HOME/codeql:/home/$USER_NAME/bin:$PATH >>/home/$USER_NAME/.profile

systemctl --user enable docker
sudo loginctl enable-linger $USER_NAME

# Install codeql bundle including precompiled queries
sudo mkdir -p $CODEQL_HOME

wget https://github.com/github/codeql-action/releases/latest/download/codeql-bundle-linux64.tar.gz -O /tmp/codeql-bundle-linux64.tar.gz
sudo tar -xvzf /tmp/codeql-bundle-linux64.tar.gz --directory $CODEQL_HOME
