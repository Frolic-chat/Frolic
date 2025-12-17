import { ipcMain } from 'electron';
const semver = require('semver');
import Axios from 'axios';

import Logger from 'electron-log/main';
const log = Logger.scope('updater');

type ReleaseInfo = {
    html_url: string;
    tag_name: string;
    prerelease: boolean | undefined;
    body: string;
};

interface VersionInfo {
    version:   string;
    changelog: string;
}

interface CurrentVersionInfo extends VersionInfo {
    known: boolean;
}

export interface UpdateState {
    current:  CurrentVersionInfo,
    latest?:  VersionInfo,
    updateCount: number,
}
// version -> changelog mapping
const versions: UpdateState = {
    current: { version: '', changelog: '', known: false },
    updateCount: 0,
};

export function registerReleaseInfoIpc() {
    ipcMain.handle('get-release-info', () => versions.current.version ? versions : null);
}

export async function checkForGitRelease(currentSemver: string, url: string, beta: boolean = false): Promise<boolean> {
    try {
        const releases = (await Axios.get<ReleaseInfo[]>(url)).data;
        const modern_versions: ReleaseInfo[] = [];

        releases.forEach(r => {
            if (r.prerelease && !beta)
                return;

            if (semver.gte(r.tag_name, currentSemver))
                modern_versions.push(r);
        });

        modern_versions.sort((a, b) => semver.compare(a.tag_name, b.tag_name));

        const our_index = modern_versions.findIndex(r => semver.eq(r.tag_name, currentSemver));
        const last = modern_versions.length - 1;
        versions.updateCount = last;

        if (our_index === -1) { // Didn't find ourselves
            log.info(`Using unknown Frolic version: ${currentSemver}`);

            versions.current = {
                version:   currentSemver,
                changelog: '',
                known: false,
            };

            if (modern_versions.length) {
                versions.latest = {
                    version:   modern_versions[last].tag_name,
                    changelog: modern_versions[last].body,
                };
            }

            return false;
        }
        else if (our_index === last) { // implies length of one
            versions.current = {
                version:   modern_versions[last].tag_name,
                changelog: modern_versions[last].body,
                known:     true,
            };

            log.verbose(`Using latest Frolic version: ${currentSemver}`);
            return false;
        }
        else { // All situations where we're not last in the list.
            versions.current = {
                version:   modern_versions[our_index].tag_name,
                changelog: modern_versions[our_index].body,
                known:     true,
            };

            versions.latest = {
                version:   modern_versions[last].tag_name,
                changelog: modern_versions[last].body,
            };

            log.info(`Update available: ${currentSemver} -> ${versions.latest.version}`);
            return true;
        }
    }
    catch (e) {
        log.error('Error checking for update: ', e);
        return false;
    }
}
