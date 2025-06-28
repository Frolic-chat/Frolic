export const IncognitoMap = {
    chrome:     '-incognito',
    chromium:   '-incognito',
    edge:       '-inprivate',
    brave:      '-incognito',
    vivaldi:    '-incognito',
    yandex:     '-incognito',

    firefox:    '-private-window',
    librewolf:  '-private-window',
    floorp:     '-private-window',

    seamonkey:  '-private',
    opera:      '-private',
};

export function IncognitoArgFromBrowserPath(path: string): typeof IncognitoMap[keyof typeof IncognitoMap] | undefined {
    return IncognitoMap[Object.keys(IncognitoMap)
            .find(k => path.includes(k)) as keyof typeof IncognitoMap];
}
