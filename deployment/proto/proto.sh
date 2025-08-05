#!/usr/bin/env bash

set -e

echo "clone proto from github"

# Remove libs folder if exist
rm -rf proto

git clone https://${GITHUB_TOKEN}:x-oauth-basic@github.com/DiscoveryLoft/pave-microservice-grpc-proto.git proto

cd proto
git checkout ${BRANCH_NAME}
git reset --hard  origin/${BRANCH_NAME}
cd ..

echo "clone proto from github successfully!"
