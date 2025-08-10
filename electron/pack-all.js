/* global process, console */
process.env.DEBUG = 'electron-windows-installer:main';
import path from 'path';
import * as fs from 'fs';
import { spawn, spawnSync } from 'child_process';
import axios from 'axios';

import electronPackager from 'electron-packager';
import { createWindowsInstaller } from 'electron-winstaller';

import pkg from './package.json' with { type: 'json' };

const distDir = path.join(import.meta.dirname, 'dist');
//const isBeta = pkg.version.indexOf('beta') !== -1;
const modules = path.join(import.meta.dirname, 'app', 'node_modules');

const includedPaths = [
    'throat',
    'node-fetch',
    'jquery',
];

includedPaths.forEach(p => {
    let from = p,
        to   = p;

    if (Array.isArray(p)) {
        from = p[0];
        to   = p[1];
    }

    // I feel like this isn't the right way to change resolve(file) to import.meta.resolve(file) but here we are.
    const canonPath = new URL(import.meta.resolve(from)).pathname;

    console.log("TEST: ", canonPath, `\n`, import.meta.resolve(from));

    fs.mkdirSync(path.dirname(path.join(modules, to)), {recursive: true});
    fs.copyFileSync(canonPath, path.join(modules, to));
});

const appPaths = await electronPackager({
    dir: path.join(import.meta.dirname, 'app'),
    out: distDir,
    overwrite: true,
    name: 'Frolic',
    icon: path.join(import.meta.dirname, 'build', 'icon'),
    ignore: ['\.map$'],
    osxSign: process.argv.length > 2 ? {identity: process.argv[2]} : false,
    prune: true,
    platform: ['win32', 'linux'], // darwin
    arch: ['x64', 'arm64'],
})


if (process.env.SKIP_INSTALLER)
    process.exit();

// Clean up last run.
for (const appArch of [ 'x64', 'arm64' ]) {
    const distFinal = path.join(distDir, appArch);

    if (fs.existsSync(distFinal)) fs.rmSync(distFinal, { recursive: true });
    fs.mkdirSync(distFinal, { recursive: true });
}

/**
 **** Windows ****
 */
const icon = path.join(import.meta.dirname, 'build', 'icon.ico');

for (const appPath of appPaths) {
    const pathMatch = appPath.match(/Frolic-win32-([a-zA-Z0-9]+)$/);
    if (!pathMatch)
        continue;

    const appArch = pathMatch[1];
    const distFinal = path.join(distDir, appArch);
    const setupFilename = `Frolic-${pkg.version}-win32-${appArch}.exe`;

    const setupName = path.join(distFinal, setupFilename);
    const nupkgName = path.join(distFinal, `frolic-${pkg.version}-full.nupkg`);
    const deltaName = path.join(distFinal, `frolic-${pkg.version}-delta.nupkg`);

    if (fs.existsSync(setupName)) fs.unlinkSync(setupName);
    if (fs.existsSync(nupkgName)) fs.unlinkSync(nupkgName);
    if (fs.existsSync(deltaName)) fs.unlinkSync(deltaName);

    console.log(`Creating Windows installer for ${appArch} at ${pathMatch[0]}`);
    if (process.argv.length <= 3)
        console.warn('Warning: Creating unsigned installer');

    // region winstaller
    try {
        await createWindowsInstaller({
            appDirectory: appPath,
            outputDirectory: distFinal,
            // Doesn't accept file urls.
            //iconUrl: 'file:///%localappdata%\\fchat\\app.ico',
            setupIcon: icon,
            noMsi: true,
            exe: 'Frolic.exe',
            title: 'Frolic',
            setupExe: setupFilename,
            //loadingGif: ...,
        });
    }
    catch (e) {
        console.error(`Error while creating installer: ${e.message}`);
        throw e;
    }
}

/**
 **** Mac OSX ****
 */
if (process.platform === 'darwin') {
    console.log('Creating Mac DMG');

    let appArch = null;
    const macArch = [];
    for (const appPath of appPaths) {
        if (appPath.endsWith('darwin-x64')) {
            appArch = 'x64';
            macArch[0] = {
                name: 'Intel',
                path: appPath,
            };
        }
        if (appPath.endsWith('darwin-amd64')) {
            appArch = 'x64';
            macArch[1] = {
                name: 'M1',
                path: appPath,
            };
        }
    }

    macArch.forEach(
        (arch) => {
            console.log(arch.name, arch.path);

            const target = path.join(distDir, appArch, `Frolic ${arch.name}.dmg`);
            if (fs.existsSync(target)) fs.unlinkSync(target);

            const appPath = path.join(arch.path, 'Frolic.app');

            if (process.argv.length <= 2)
                console.warn('Warning: Creating unsigned DMG');

            require('appdmg') ({
                basepath: arch.path,
                target,
                specification: {
                    title: 'Frolic',
                    icon: path.join(import.meta.dirname, 'build', 'icon.png'),
                    background: path.join(import.meta.dirname, 'build', 'dmg.png'),
                    contents: [
                        {x: 555, y: 345, type: 'link', path: '/Applications'},
                        {x: 555, y: 105, type: 'file', path: appPath},
                    ],
                    'code-sign': process.argv.length > 2
                        ? { 'signing-identity': process.argv[2] }
                        : undefined,
                },
            })
            .on('error', console.error);

            // We'll need something like this if we move to an outside app builder.
            // const appRunResult = spawnSync(path.join(appImageBase, 'squashfs-root', 'AppRun'), args, {cwd: appImageBase, env: {ARCH: appArchLong }});

            // if (appRunResult.status !== 0) {
            //     console.log('Run failed', 'APPRUN', appArch, {status: appRunResult.status, call: appRunResult.error?.syscall, args: appRunResult.error?.spawnargs, path: appRunResult.error?.path, code: appRunResult.error?.code, stdout: String(appRunResult.stdout), stderr: String(appRunResult.stderr) });
            // }

            const zipName = `Frolic_${pkg.version}_${arch.name}.zip`;
            const zipPath = path.join(distDir, zipName);
            if(fs.existsSync(zipPath)) fs.unlinkSync(zipPath);

            const child = spawn(
                'zip',
                ['-r', '-y', '-9', zipPath, 'Frolic.app'],
                {cwd: arch.path}
            );
            child.stdout.on('data', () => {});
            child.stderr.on('data', (data) => console.error(data.toString()));

            fs.writeFileSync(
                path.join(distDir, 'updates.json'),
                JSON.stringify({
                    releases: [{
                        version: pkg.version, updateTo: {url: 'https://client.f-list.net/darwin/' + zipName},
                    }],
                    currentRelease: pkg.version,
                })
            );
        }
    );
}

/**
 **** Linux AppImage ****
 */
async function downloadAppImageTool(appImageBase) {
    const localArch = process.arch === 'x64' ? 'x86_64' : 'aarch64';

    const url = `https://github.com/AppImage/AppImageKit/releases/download/continuous/appimagetool-${localArch}.AppImage`;
    const res = await axios.get(url, { responseType: 'arraybuffer' });

    console.log('Downloading', url, appImageBase, typeof res.data);

    const appImagePath = path.join(appImageBase, 'appimagetool.AppImage');

    fs.writeFileSync(appImagePath, res.data);
    fs.chmodSync(appImagePath, 0o755);

    const result = spawnSync(
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

console.log('Creating Linux AppImage');

const appImageBase = path.join(distDir, 'downloaded');
fs.mkdirSync(appImageBase, {recursive: true});

await downloadAppImageTool(appImageBase);

for (const appPath of appPaths) {
    const pathMatch = appPath.match(/Frolic-linux-([a-zA-Z0-9]+)$/);
    if (!pathMatch)
        continue;

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

    if (process.argv.length > 2)
        args.push('-s', '--sign-key', process.argv[2]);
    else
        console.warn('Warning: Creating unsigned AppImage');

    if (process.argv.length > 3) {
        args.push(
            '--sign-args',
            '--no-tty',
            '--pinentry-mode loopback',
            '--yes',
            `--passphrase=${process.argv[3]}`,
        );
    }

    const appRunResult = spawnSync(
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
