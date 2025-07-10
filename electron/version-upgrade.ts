//import * as semver from 'semver';
const semver = require('semver');

import Logger from "electron-log";
const log = Logger.scope('election/version-upgrade');

/**
 * Run all upgrade tasks starting from the provided version number.
 */
export default function (start: string, end: string): string {
    const upgrades = Object.keys(routines)
            .filter(e => semver.gt(e, start) && semver.lte(e, end))
            .sort((a, b) => semver.compare(a, b));

    // This should be rewritten with error handling using the routine returns.
    upgrades.forEach(v => routines[v]());

    log.debug('default.versionStart', { from: start, to: end, count: upgrades.length });
    return end;
}

/**
 * List of all coroutines to run with the target version as the name. They
 * should not have to be in order, but for human sake, write them in order.
 *
 * Upgrade paths should return `true` if it was able to verify all relevant
 * upgrades were applied. Otherwise, return `false`.
 */
const routines: { [key: string]: () => boolean } = {
    '0.7.8': () => {
        log.debug('routines.0.7.8');
        return true;
    },
}
