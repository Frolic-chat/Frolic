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

// type DeepestKeys<T> = T extends string ? never : {
//     [K in keyof T & string]: T[K] extends string ? K : DeepestKeys<T[K]>;
// }[keyof T & string];
// type ForbiddenKeys = DeepestKeys<typeof Forbidden>;
// type DeepestValues<T> = T extends object
//     ? { [K in keyof T]: DeepestValues<T[K]> }[keyof T]
//     : T;
// type ForbiddenVAlues = DeepestValues<typeof Forbidden>;
