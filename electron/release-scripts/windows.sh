#!/bin/bash -ex

if [ -z "${1}" ]
then
  echo "Usage: ${0} RELEASE_VERSION"
  exit 1
fi

export NODE_OPTIONS=--openssl-legacy-provider

RELEASE_VERSION="${1}"
RELEASE_PATH="${HOME}/frolic-dist/${RELEASE_VERSION}"
DIST_PATH="${HOME}/frolic/electron/dist"

cd "${HOME}/frolic"
git checkout master
git pull
yarn

mkdir -p "${RELEASE_PATH}"
rm -rf "${DIST_PATH}"

cd electron
rm -rf app
yarn build:dist
node pack.js

cp "${DIST_PATH}/arm64/Frolic-Setup-win-arm64.exe" "${RELEASE_PATH}/Frolic-win-arm64.exe"
cp "${DIST_PATH}/x64/Frolic-Setup-win-x64.exe" "${RELEASE_PATH}/Frolic-win-x64.exe"
