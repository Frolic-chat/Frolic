// SPDX-License-Identifier: AGPL-3.0-or-later
/* global process, console */
//process.env.DEBUG = 'electron-windows-installer:main';
import path from 'path';
import * as fs from 'fs';
import * as ChildProcess from 'child_process';
import axios from 'axios';

import packager from '@electron/packager';
import setLanguages from 'electron-packager-languages';
import { createWindowsInstaller } from 'electron-winstaller';

import pkg from './package.json' with { type: 'json' };
//const isBeta = pkg.version.indexOf('beta') !== -1;


// region CL Args
const electronPlat = [ 'linux', 'win32', 'darwin', 'mas' ];
const electronArch = [ 'ia32', 'x64', 'armv7l', 'arm64', 'mips64el', 'universal' ];

const DEFAULT_PLAT = [ process.platform ];
const DEFAULT_ARCH = [ process.arch     ];

const platforms = process.argv.length > 2
               && process.argv.filter(plat => electronPlat.includes(plat)).length
    ? process.argv.filter(plat => electronPlat.includes(plat))
    : DEFAULT_PLAT;

const architectures = process.argv.length > 2
                   && process.argv.filter(arch => electronArch.includes(arch)).length
    ? process.argv.filter(arch => electronArch.includes(arch))
    : DEFAULT_ARCH;

if (!platforms.length || !architectures.length)
    console.warn('Did you forget to provide any platforms and architectures to compile for?');

if (platforms === DEFAULT_PLAT)
    console.info(`Defaulting to platform ${DEFAULT_PLAT}.`);

if (architectures === DEFAULT_ARCH)
    console.info(`Defaulting to architecture ${DEFAULT_ARCH}.`);


// region Secondary Files
const projectDir = path.join(import.meta.dirname, '..');
const appDir  =    path.join(import.meta.dirname, 'app');
const distDir =    path.join(import.meta.dirname, 'dist');
const licenseDir = path.join(appDir, 'licenses');

const modulesDestDir = path.join(appDir, 'node_modules');
[
    'throat',
].forEach(p => {
    const a = Array.isArray(p);
    const from = a ? a[0] : p,
          to   = a ? a[1] : p;

    // I feel like this isn't the right way to change resolve(file) to import.meta.resolve(file) but here we are.
    const canonPath = new URL(import.meta.resolve(from)).pathname;

    fs.mkdirSync(modulesDestDir, { recursive: true });
    fs.copyFileSync(canonPath, path.join(modulesDestDir, to));
});

const buildSrcDir  = path.join(import.meta.dirname, 'build');
[ 'license' ].forEach(p => {
    const a = Array.isArray(p);
    const from = a ? p[0] : p,
          to   = a ? p[1] : p;

    fs.cpSync(path.join(buildSrcDir, from), appDir, { recursive: true });
});

 const licenses = fs.readdirSync(appDir).filter(f => f.endsWith('.LICENSE.txt'));
 if (licenses.length) {
    fs.mkdirSync(licenseDir, { recursive: true });

    licenses.forEach(f => fs.renameSync(path.join(appDir, f), path.join(licenseDir, f)));
}

const copyings = fs.readdirSync(projectDir).filter(f => f.startsWith('COPYING'));
if (copyings.length) {
    fs.mkdirSync(licenseDir, { recursive: true });

    copyings.forEach(f => fs.copyFileSync(path.join(projectDir, f), path.join(licenseDir, f)));
}


// region Packager
const appPaths = await packager({
    dir: path.join(import.meta.dirname, 'app'),
    out: distDir,
    overwrite: true,
    name: 'Frolic',
    icon: path.join(import.meta.dirname, 'build', 'icon'),
    ignore: ['\.map$'],
    osxSign: false,
    prune: true,
    platform: platforms,
    arch: architectures,
    afterCopy: [ setLanguages([ 'en', 'en_US', 'en-US' ]) ],
});

if (process.env.SKIP_INSTALLER)
    process.exit();

// Clean up last run's folders.
electronArch.forEach(arch => {
    if (fs.existsSync(path.join(distDir, arch)))
        fs.rmSync(path.join(distDir, arch), { recursive: true });
});
architectures.forEach(arch => fs.mkdirSync(path.join(distDir, arch), { recursive: true }));

// region Build
const buildScripts = {
    win32: buildWindows,
    linux: buildLinux,
    darwin: buildMac,
};
platforms.forEach(plat => buildScripts[plat]?.(appPaths));


// region Build Scripts
/**
 **** Windows ****
 */
async function buildWindows(appPaths) {
    // region Windows
    // Delete png icons

    const icon       = path.join(import.meta.dirname, 'build', 'badge.ico');
    const loadingGif = path.join(import.meta.dirname, 'build', 'loading.gif');

    const win_paths = appPaths.filter(p => p.includes('win32'));
    for (const appPath of win_paths) {
        const pathMatch = appPath.match(/Frolic-win32-([a-zA-Z0-9]+)$/);
        if (!pathMatch) {
            console.warn(`Asked to build for windows but the data doesn't exist at ${appPath}`);
            continue;
        }

        const appArch = pathMatch[1];
        const distForArch = path.join(distDir, appArch);
        const setupFilename = `Frolic-${pkg.version}-win32-${appArch}.exe`;

        const old_data = [ // setup, nupkg, and nupkg delta files
            path.join(distForArch, setupFilename),
            path.join(distForArch, `frolic-${pkg.version}-full.nupkg`),
            path.join(distForArch, `frolic-${pkg.version}-delta.nupkg`),
        ]
        old_data.forEach(d => fs.existsSync(d) && fs.unlinkSync(d));

        console.log(`Creating Windows installer for ${appArch} at ${pathMatch[0]}`);

        // region winstaller
        try {
            await createWindowsInstaller({
                appDirectory: appPath,
                outputDirectory: distForArch,
                iconUrl: 'https://github.com/Frolic-chat/Frolic/tree/master/electron/build/blossom.ico',
                setupIcon: icon,
                noMsi: true,
                exe: 'Frolic.exe',
                title: 'Frolic',
                setupExe: setupFilename,
                loadingGif: loadingGif,
            });
        }
        catch (e) {
            console.error(`Error while creating installer: ${e.message}`);
            throw e;
        }
    }
}

/**
 **** Mac OSX ****
 */
function buildMac(appPaths) {
    // it's notoriously difficult to build mac apps if you're not on mac.
    if (process.platform !== 'darwin')
        return;

    // region Mac
    console.log('Creating Mac DMG');

    let appArch = null;
    const macArch = [];
    const mac_paths = appPaths.filter(p => p.includes('darwin'));
    for (const appPath of mac_paths) {
        if (appPath.endsWith('darwin-x64')) {
            appArch = 'x64';
            macArch[0] = {
                name: 'Intel',
                path: appPath,
            };
        }
        // Does this look correct? Is the M1 not an arm device?
        // We've never actually built for mac, so don't trust this to be correct.
        if (appPath.endsWith('darwin-amd64')) {
            appArch = 'x64';
            macArch[1] = {
                name: 'M1',
                path: appPath,
            };
        }
    }

    // macArch.forEach(
    //     (arch) => {
    //         console.log(arch.name, arch.path);

    //         const target = path.join(distDir, appArch, `Frolic ${arch.name}.dmg`);
    //         if (fs.existsSync(target)) fs.unlinkSync(target);

    //         const appPath = path.join(arch.path, 'Frolic.app');

    //         if (process.argv.length <= 2)
    //             console.warn('Warning: Creating unsigned DMG');

    //         require('appdmg') ({
    //             basepath: arch.path,
    //             target,
    //             specification: {
    //                 title: 'Frolic',
    //                 icon: path.join(import.meta.dirname, 'build', 'icon.png'),
    //                 background: path.join(import.meta.dirname, 'build', 'dmg.png'),
    //                 contents: [
    //                     {x: 555, y: 345, type: 'link', path: '/Applications'},
    //                     {x: 555, y: 105, type: 'file', path: appPath},
    //                 ],
    //                 'code-sign': process.argv.length > 2
    //                     ? { 'signing-identity': process.argv[2] }
    //                     : undefined,
    //             },
    //         })
    //         .on('error', console.error);

    //         // We'll need something like this if we move to an outside app builder.
    //         // const appRunResult = ChildProcess.spawnSync(path.join(appImageBase, 'squashfs-root', 'AppRun'), args, {cwd: appImageBase, env: {ARCH: appArchLong }});

    //         // if (appRunResult.status !== 0) {
    //         //     console.log('Run failed', 'APPRUN', appArch, {status: appRunResult.status, call: appRunResult.error?.syscall, args: appRunResult.error?.spawnargs, path: appRunResult.error?.path, code: appRunResult.error?.code, stdout: String(appRunResult.stdout), stderr: String(appRunResult.stderr) });
    //         // }

    //         const zipName = `Frolic_${pkg.version}_${arch.name}.zip`;
    //         const zipPath = path.join(distDir, zipName);
    //         if(fs.existsSync(zipPath)) fs.unlinkSync(zipPath);

    //         const child = ChildProcess.spawn(
    //             'zip',
    //             ['-r', '-y', '-9', zipPath, 'Frolic.app'],
    //             {cwd: arch.path}
    //         );
    //         child.stdout.on('data', () => {});
    //         child.stderr.on('data', (data) => console.error(data.toString()));

    //         fs.writeFileSync(
    //             path.join(distDir, 'updates.json'),
    //             JSON.stringify({
    //                 releases: [{
    //                     version: pkg.version, updateTo: {url: 'https://client.f-list.net/darwin/' + zipName},
    //                 }],
    //                 currentRelease: pkg.version,
    //             })
    //         );
    //     }
    // );
}

/**
 **** Linux AppImage ****
 */
async function buildLinux(appPaths) {
    async function downloadAppImageTool(appImageBase) {
        const myArch = process.arch === 'x64' ? 'x86_64' : 'aarch64';
        const url = `https://github.com/AppImage/AppImageKit/releases/download/continuous/appimagetool-${myArch}.AppImage`;
        const res = await axios.get(url, { responseType: 'arraybuffer' });

        console.log('Downloading', url, appImageBase, typeof res.data);

        const appImagePath = path.join(appImageBase, 'appimagetool.AppImage');

        fs.writeFileSync(appImagePath, res.data);
        fs.chmodSync(appImagePath, 0o755);

        const result = ChildProcess.spawnSync(
            appImagePath,
            ['--appimage-extract'],
            {cwd: appImageBase}
        );

        if (result.status !== 0) {
            console.log(
                'Run failed',
                'APPIMAGE EXTRACT',
                {
                    status: result.status,
                    call: result.error?.syscall,
                    args: result.error?.spawnargs,
                    path: result.error?.path,
                    code: result.error?.code,
                    stdout: String(result.stdout),
                    stderr: String(result.stderr),
                }
            );
        }

        return appImagePath;
    }

    // region Linux
    // Delete ICOs

    console.log('Creating Linux AppImage');

    const appImageBase = path.join(distDir, 'downloaded');
    fs.mkdirSync(appImageBase, {recursive: true});

    await downloadAppImageTool(appImageBase);

    const linux_paths = appPaths.filter(p => p.includes('linux'));
    for (const appPath of linux_paths) {
        const pathMatch = appPath.match(/Frolic-linux-([a-zA-Z0-9]+)$/);
        if (!pathMatch) {
            console.warn(`Asked to build for linux but the data doesn't exist at ${appPath}`);
            continue;
        }

        const appArch = pathMatch[1];
        const appArchLong = appArch === 'x64' ? 'x86_64' : 'aarch64';
        const buildPath = path.join(import.meta.dirname, 'build');
        const distFinal = path.join(distDir, appArch);

        console.log(`Creating AppImage for ${appArch} at ${pathMatch[0]}`);

        fs.renameSync(path.join(appPath, 'Frolic'), path.join(appPath, 'AppRun'));
        fs.copyFileSync(path.join(buildPath, 'icon.png'), path.join(appPath, 'icon.png'));

        const libSource = path.join(buildPath, 'linux-libs', appArchLong),
            libDir = path.join(appPath, 'usr', 'lib');

        fs.mkdirSync(libDir, {recursive: true});

        for (const file of fs.readdirSync(libSource))
            fs.copyFileSync(path.join(libSource, file), path.join(libDir, file));

        fs.symlinkSync(path.join(appPath, 'icon.png'), path.join(appPath, '.DirIcon'));

        fs.writeFileSync(
            path.join(appPath, 'frolic.desktop'),
            '[Desktop Entry]\nName=Frolic\nExec=AppRun\nIcon=icon\nType=Application\nCategories=GTK;GNOME;Utility;'
        );

        const args = [
            appPath,
            path.join(distFinal, `Frolic-${pkg.version}-linux-${appArch}.AppImage`),
            '-u',
            `gh-releases-zsync|frolic-chat|frolic|latest|Frolic-${pkg.version}-linux-${appArch}.AppImage.zsync`,
        ];

        // if (process.argv.length > 3) {
        //     args.push(
        //         '--sign-args',
        //         '--no-tty',
        //         '--pinentry-mode loopback',
        //         '--yes',
        //         `--passphrase=${process.argv[3]}`,
        //     );
        // }

        const appRunResult = ChildProcess.spawnSync(
            path.join(appImageBase, 'squashfs-root', 'AppRun'),
            args,
            {
                cwd: appImageBase,
                env: {ARCH: appArchLong },
            }
        );

        if (appRunResult.status !== 0) {
            console.log(
                'Run failed',
                'APPRUN',
                appArch,
                {
                    status: appRunResult.status,
                    call: appRunResult.error?.syscall,
                    args: appRunResult.error?.spawnargs,
                    path: appRunResult.error?.path,
                    code: appRunResult.error?.code,
                    stdout: String(appRunResult.stdout),
                    stderr: String(appRunResult.stderr),
                }
            );
        }

        // move finished appimages.
    }
}
