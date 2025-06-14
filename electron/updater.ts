import Axios from 'axios';

import Logger from 'electron-log/main';
const log = Logger.scope('updater');

type ReleaseInfo = {
    html_url: string;
    tag_name: string;
    prerelease: boolean | undefined;
};

export default async function checkForGitRelease(semVer: string, url: string, beta: boolean): Promise<boolean> {
    try {
        const releases = (await Axios.get<ReleaseInfo[]>(url)).data;

        //The releases we get from the GitHub API are in in descending order from their release date.
        for (const release of releases) {
            if (release.prerelease && !beta)
                continue;

            if (release.tag_name == semVer) {
                log.info(`Using latest Frolic version: ${semVer}`);
                return false;
            }
            else if (release.tag_name >= semVer) {
                log.info(`Update available: ${semVer} -> ${release.tag_name}`);
                return true;
            }
        }

        log.info(`Using unknown Frolic version: ${semVer}`);
        return false;
    }
    catch (e) {
        log.error('Error checking for update: ', e);
        return false;
    }
}
