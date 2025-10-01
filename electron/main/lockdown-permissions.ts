import * as Electron from 'electron';

export default function (session: Electron.Session) {
    session.setPermissionRequestHandler((_w, _p, callback) => {
        // console.warn('Permission request denied:', _p);
        callback(false);
    });

    session.setPermissionCheckHandler((_w, _p) => {
        // console.warn('Permission check blocked:', _p);
        return false;
    });
}
