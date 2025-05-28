import { OptionsWithUrl } from "request-promise";

export type Commands =
  | 'refreshAllCounts'
  | 'emptyTrash'
  | 'report'
  | 'send'

  | 'addFolder'         | 'renameFolder'    | 'deleteFolder'

  | 'notes'             | 'unread'          | 'starred'
  | 'getFolders'

  | 'searchUser'       | 'searchContent'
  | 'getFilters'       | 'setFilters'

  | 'markNoteRead'     | 'starNote'
  | 'trashNote'        | 'undeleteNote'

  | 'markSelectedRead' | 'starSelected'
  | 'trashSelected'    | 'undeleteSelected'
  | 'moveSelected';


/**         REQUEST         */
//region Request
type RequestLayout = Record<Commands, { uri: string, method?: 'GET' | 'POST', data?: RequestData[Commands]}>;

const RequestStatic: RequestLayout = {
    refreshAllCounts:
                    {   uri: 'json/notes-getfolders.json'    },
    emptyTrash:     {   uri: 'json/notes-emptytrash.json',
                        method: 'POST',                      },
    report:         {   uri: 'json/notes-report.json',
                        method: 'POST',                      },

    send:           {   uri: 'json/notes-send.json',
                        method: 'POST',                      },

    addFolder:      {   uri: 'json/notes-createfolder.json',
                        method: 'POST',                      },
    renameFolder:   {   uri: 'json/notes-renamefolder.json',
                        method: 'POST',                      },
    deleteFolder:   {   uri: 'json/notes-deletefolder.json',
                        method: 'POST',                      },

    // get
    notes:          {   uri: 'json/notes-get.json',          },
    unread:         {   uri: 'json/notes-getunread.json',    },
    starred:        {   uri: 'json/notes-getstarred.json',   },
                        // json/notes-getstarred.php ??? ?? ???????
    getFolders:     {   uri: 'json/notes-getfolders.json',   },

    searchUser:     {   uri: 'json/notes-searchuser.json',   },
    searchContent:  {   uri: 'json/notes-searchcontent.json',},
    getFilters:     {   uri: 'json/notes-getfilters.json',   },
    setFilters:     {   uri: 'json/notes-setfilters.json',   },

    markNoteRead:   {   uri: 'json/notes-setread.json',
                        method: 'POST',                      },
    starNote:       {   uri: 'json/notes-setstarred.json',
                        method: 'POST',                      },
    trashNote:      {   uri: 'json/notes-trash.json',
                        method: 'POST',                      },
    undeleteNote:   {   uri: 'json/notes-setfolder.json',
                        method: 'POST',                      },

    markSelectedRead:
                    {   uri: 'json/notes-setread.json',
                        method: 'POST',                      },
    starSelected:   {   uri: 'json/notes-setstarred.json',
                        method: 'POST',                      },
    trashSelected:  {   uri: 'json/notes-trash.json',
                        method: 'POST',                      },
    undeleteSelected:
                    {   uri: 'json/notes-setfolder.json',
                        method: 'POST',                      },
    moveSelected:   {   uri: 'json/notes-setfolder.json',
                        method: 'POST',                      },
}

type RequestData = {
    refreshAllCounts:           // TODO: Uses data from current folder.
                    {   notes:      NoteId[];           // "items"
                        folder_id:  FolderId;       };  // "_folder"
    emptyTrash:     {   csrf_token: CsrfToken;      };
    report:         {   note_id:    NoteId;
                        reason:     string;
                        csrf_token: CsrfToken;      };
    send:           NoteMetadata,

    addFolder:      {   name:       string;
                        csrf_token: CsrfToken;      };
    renameFolder:   {   folder:     FolderId;
                        name:       string;
                        csrf_token: CsrfToken;      };
    deleteFolder:   {   folder:     FolderId;
                        csrf_token: CsrfToken;      };

    // get
    notes:          {   offset: offset;
                        amount: amount;
                        folder: FolderId;           };
    unread:         {   offset: offset;
                        amount: amount;
                        folder: FolderId;           };
    starred:        {   offset: offset;                 // Probably
                        amount: amount;
                        folder: FolderId;           };
    getFolders?:    undefined;

    searchUser:     {   offset: offset;
                        amount: amount;
                        name:   CharacterName;      };
    searchContent:  {   offset: offset;
                        amount: amount;
                        query:  string;             };
    getFilters?:    undefined;
    setFilters:     {   filters:    Filters;
                        csrf_token: CsrfToken;      };

    markNoteRead:   {   notes:      NoteId[];
                        state:      NoteBool;
                        folder_id:  FolderId;
                        csrf_token: CsrfToken;      };
    starNote:       {   notes:      NoteId[];
                        state:      NoteBool;
                        csrf_token: CsrfToken;      };
    trashNote:      {   notes:      NoteId[];
                        csrf_token: CsrfToken;      };
    undeleteNote:   {   notes:      NoteId[];
                        folder_id?:  1;
                        csrf_token: CsrfToken;      };

    markSelectedRead:
                    {   notes:      NoteId[];
                        csrf_token: CsrfToken;
                        state:      NoteBool;
                        folder_id:  FolderId;       }; // Current folder (folder to return to?)
    starSelected:   {   notes:      NoteId[],
                        state:      NoteBool;
                        csrf_token: CsrfToken;      };
    trashSelected:  {   notes:      NoteId[];
                        csrf_token: CsrfToken;      };
    undeleteSelected:
                    {   notes:      NoteId[];
                        folder_id?:  1;
                        csrf_token: CsrfToken;      };
    moveSelected:   {   notes:      NoteId[];
                        folder_id:  FolderId;
                        csrf_token: CsrfToken;      };
}

type DeepPartial<T>  = { [P in keyof T]?:  DeepPartial<T[P]>;  };
type DeepRequired<T> = { [P in keyof T]-?: DeepRequired<T[P]>; };

const RequestDataStatic: DeepPartial<RequestData> = {
    getFolders:         undefined,
    getFilters:         undefined,
    undeleteNote:       {   folder_id:  1, },
    undeleteSelected:   {   folder_id:  1, },
}

/**
 * An Api request to send to the note server.
 */
// interface Axios_NotesApiRequest<T extends Commands> {
//     uri:        RequestLayout[T]['uri'],    // string
//     method:     RequestLayout[T]['method'], // string
//     dataType:   'json',                     // string literal
//     timeout:    number,                     // 30 seconds
//     data:       RequestData[T],             // object | undefined
// }

// exclude where RequestStatic[T] = undefined???
//type HasNoRequestStatic = Commands
// type DataWithoutStatic<T, U> = {
//     [K in keyof T as Exclude<K, keyof U>]: T[K];
// };

//type Static = keyof typeof RequestDataStatic;
//type OmitStatic<T extends Commands> = Omit<RequestData[T], Static>;

//Exclude<RequestData<T>, typeof RequestDataStatic[T]>
//ComposeApiRequest("undeleteNote", { notes: [ 1, 2, 3 ], csrf_token: "adsrasd" })

/** ApiRequest
 * From the original `f-list.js` implementation,
 * timeout still needs to be reimplemented.
 *
 * This version is designed to be sent to request-promise
 */
export type NotesApiRequest<T extends Commands> = {
    uri:        RequestLayout[T]['uri'],    // string
    method:     RequestLayout[T]['method'], // string
    json:       true,                       // bool
    body:       RequestData[T],             // object | undefined
}

/**
 * @param call API request call to issue
 * @param data Object containing the data to be sent with the request
 * @returns A fully formatted API Request ready to be issued
 * @example ConstructApiRequest("deleteFolder", { folder: 2, csrf_token: Token.get()})
 */
export function ComposeApiRequest<T extends 'getFolders' | 'getFilters'>(call: T, data?: undefined): NotesApiRequest<T>;
export function ComposeApiRequest<T extends Exclude<Commands, 'getFolders' | 'getFilters'>>(call: T, data: RequestData[T]): NotesApiRequest<T>;

export function ComposeApiRequest<T extends Commands>(call: T, data: RequestData[T]): NotesApiRequest<T> {
    return {
        ...{ method: 'GET', json: true }, // defaults
        ...RequestStatic[call], // call defaults
        body: { ...data, ...RequestDataStatic[call] },
    };
}

//ComposeApiRequest('getFolders', undefined) // Might error
//ComposeApiRequest("getFilters") // Shouldn't error
//ComposeApiRequest('addFolder')  // Should error

// function NoteRequest<T extends Commands>(call: T, data: RequestData[T]): OptionsWithUrl {
//     return {
//         uri: RequestStatic[call].uri,
//         method: RequestStatic[call].method,
//         resolveWithFullResponse: true,
//         body: { ...data, ...RequestDataStatic[call] },
//         json: true
//     }
// }
// const POST = {
//     method: 'POST',
//     uri: 'https://httpbin.org/post',
//     form: {
//         item: 'thing',
//     },
//     headers: {
//         'content-type': 'application/x-www-form-urlencoded'
//     }
// };

// const JSON = {
//     method: 'POST',
//     uri: 'https://httpbin.org/post',
//     body: {
//         item: 'thing',
//     },
//     json: true, // auto-stringify
// };


/**         RESPONSE        */
//region Response
type ResponseData = {
    //     refreshAllCounts:   {},  // Need experience.
    //     emptyTrash:         {},
    //     report:             {},
    send:           {   total:  number,         // Inbox? Not accurate if sending to yourself.
                        unread: number,
                        error:  string,                 };

    addFolder:      {   folder_id:  FolderId,
                        name:       string,
                        error:      string,             };
    renameFolder:   {   name:  string,
                        error: string,                  };
    deleteFolder:   {   total:  number,         // Inbox
                        unread: number,
                        error:  string,                 };

    notes:          {   notes: NoteMetadata[],
                        total: number,
                        error: string,                  };
    unread:         {   notes: NoteMetadata[],
                        total: number,
                        error: string,                  };
    starred:         {  notes: NoteMetadata[],
                        total: number,
                        error: string,                  };
    getFolders:     {   folders: Folder[],
                        error:   string,                };

    //     searchUser:         string;
    //     searchContent:  {   notes: NoteMetadata[];
    //                         total: number;
    //                         error: string;      };
    //     getFilters:     {   filters: { [key: string]: Filter; },
    //                         error:   string;    };
    //     setFilters:         string,

    markNoteRead:   {   total:  number,
                        unread: number,
                        error:  string,                 };
    starNote:       {   error:  string,                 };
    trashNote:      {   counts: {   folder: number,
                                    total:  number,
                                    unread: number, }[],
                        error:  string,                 };
    undeleteNote:   {   counts: {   folder: number,
                                    total:  number,
                                    unread: number, }[],
                        error:  string,                 };

    markSelectedRead:
                    {   total:  number,
                        unread: number,
                        error:  string,                 };
    starSelected:   {   error:  string,                 };
    trashSelected:  {   counts: {   folder: number,
                                    total:  number,
                                    unread: number, }[],
                        error:  string,                 };
    undeleteSelected:
                    {   counts: {   folder: number,
                                    total:  number,
                                    unread: number, }[],
                        error:  string,                 };
    moveSelected:   {   counts: {   folder: number,
                                    total:  number,
                                    unread: number, }[],
                        error:  string,                 };
}

/**         TYPES           */
//region Types
/** CsrfToken is an authentican token from F-List'
 *
 * It is created in site-session (?)
 * On the website it's gotten like this:
 * @example
 * FList.csrf_token = function() {
 *     return $("#flcsrf-token").attr("content")
 * }
 */
type CsrfToken      = string;
/** Character name is a string.
 *
 * It should probably have validation, but doesn't.
 */
type CharacterName  = string;
/** CharacterId is a number.
 *
 * It may be the site-wide ID of the user, but needs further research.
 */
type CharacterId    = number;
/** NoteId is a per-character(?) unique id
 *
 * In FList.js it's gotten by chopping the first 9 characters off the id of the span surrounding the checkbox.
 * It can also be gotten from the name of the checkbox input.
 *
 * It can be used for all note-related tasks, including navigating to the page of the note.
 * @example
 * .../view_note.php?note_id=953
 * span class="CheckNote panel list-highlight" id="CheckNote953"
 * input type="checkbox" name="Note_953"
 */
type NoteId         = number;
type ActionId       = number;
/** A numerical id - sometimes received as a string for no apparent reason.
 *
 * 1 - Inbox
 *
 * 2 - Outbox
 *
 * 3 - Trash
 */
type FolderId       = number | string;
type ConditionId    = number;
type NoteBool       = 1 | 0;

// FList.Notes.xxx
type offset = number;
type amount = number;

interface NoteMetadata {
    note_id:             NoteId,
    title:               string,
    source_character_id: CharacterId,
    source_name:         CharacterName,
    dest_name:           CharacterName,
    dest_character_id:   CharacterId,
    /** A relative time string.
     * @example "1 mo, 5d ago"
     */
    datetime_sent:       string,
    folder_id:           FolderId,
    read:                NoteBool,
    starred:             NoteBool,
}

interface Note {
    title:      string,
    message:    string,
    dest:       CharacterName,
    source:     CharacterId,
    csrf_token: CsrfToken,
}

interface Folder {
    name:         string,
    folder_id:    FolderId,
    notecount:    number,
    undreadcount: number,
}

interface Condition {
    condition_id?:  ConditionId,        // not used in storefilters
    type:           'to-dest' | string,
    value:          string,
    action_id?:     ActionId,           // not used in storefilters
}
type Conditions = Condition[];

interface Filter {
    action_id?: ActionId,   // not used in storefilters
    folder_id:  FolderId,
    read:       NoteBool,
    starred:    NoteBool,
    conditions: Conditions,
}
type Filters = StringifiedJSON;
type StringifiedJSON = string;
