#!/bin/bash -ex

if [ -z "${1}" ]
then
  echo "Usage: ${0} RELEASE_VERSION"
  exit 1
fi

RELEASE_VERSION="${1}"
RELEASE_PATH="${HOME}/frolic-dist/${RELEASE_VERSION}"
DIST_PATH="${HOME}/frolic/electron/dist/downloaded"

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

cp "${DIST_PATH}/fchat.arm64.AppImage" "${RELEASE_PATH}/Frolic-linux-arm64.AppImage"
cp "${DIST_PATH}/fchat.arm64.AppImage.zsync" "${RELEASE_PATH}/Frolic-linux-arm64.AppImage.zsync"

cp "${DIST_PATH}/fchat.x64.AppImage" "${RELEASE_PATH}/Frolic-linux-x64.AppImage"
cp "${DIST_PATH}/fchat.x64.AppImage.zsync" "${RELEASE_PATH}/Frolic-linux-x64.AppImage.zsync"
