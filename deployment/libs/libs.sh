#!/usr/bin/env bash

set -e

echo "clone libs from github"

# Remove libs folder if exist
rm -rf libs

git clone https://${GITHUB_TOKEN}:x-oauth-basic@github.com/DiscoveryLoft/pave-microservice-libs.git libs

cd libs
git checkout ${BRANCH_NAME}
git reset --hard  origin/${BRANCH_NAME}
cd ..

echo "clone libs from github successfully!"

echo "build all libs..."

/bin/bash libs/build.sh

echo "build all nest packages successfully!"

