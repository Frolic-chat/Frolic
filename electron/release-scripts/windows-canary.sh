#!/bin/bash -ex

DIST_PATH="${HOME}/frolic/electron/dist"

export NODE_OPTIONS=--openssl-legacy-provider

cd "${HOME}/frolic"
git checkout canary
git pull
yarn

rm -rf "${DIST_PATH}"

cd electron
rm -rf app
yarn build
node pack.js
