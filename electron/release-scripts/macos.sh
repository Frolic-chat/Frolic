#!/bin/bash -ex

if [ -z "${1}" ]
then
  echo "Usage: ${0} RELEASE_VERSION"
  exit 1
fi

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

cp "${DIST_PATH}/Frolic Intel.dmg" "${RELEASE_PATH}/Frolic-macos-intel.dmg"
rm -f "${RELEASE_PATH}/Frolic-macos-intel.zip"
zip --junk-paths "${RELEASE_PATH}/Frolic-macos-intel.zip" "${DIST_PATH}/Frolic Intel.dmg"

cp "${DIST_PATH}/Frolic M1.dmg" "${RELEASE_PATH}/Frolic-macos-m1.dmg"
rm -f "${RELEASE_PATH}/Frolic-macos-m1.zip"
zip --junk-paths "${RELEASE_PATH}/Frolic-macos-m1.zip" "${DIST_PATH}/Frolic M1.dmg"
