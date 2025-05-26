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
type RequestLayout = Record<Commands, { url: string, method?: 'GET' | 'POST', data?: RequestData[Commands]}>;

const RequestStatic: RequestLayout = {
    refreshAllCounts:
                    {   url: 'json/notes-getfolders.json'    },
    emptyTrash:     {   url: 'json/notes-emptytrash.json',
                        method: 'POST',                      },
    report:         {   url: 'json/notes-report.json',
                        method: 'POST',                      },

    send:           {   url: 'json/notes-send.json',
                        method: 'POST',                      },

    addFolder:      {   url: 'json/notes-createfolder.json',
                        method: 'POST',                      },
    renameFolder:   {   url: 'json/notes-renamefolder.json',
                        method: 'POST',                      },
    deleteFolder:   {   url: 'json/notes-deletefolder.json',
                        method: 'POST',                      },

    // get
    notes:          {   url: 'json/notes-get.json',          },
    unread:         {   url: 'json/notes-getunread.json',    },
    starred:        {   url: 'json/notes-getstarred.json',   },
                        // json/notes-getstarred.php ??? ?? ???????
    getFolders:     {   url: 'json/notes-getfolders.json',   },

    searchUser:     {   url: 'json/notes-searchuser.json',   },
    searchContent:  {   url: 'json/notes-searchcontent.json',},
    getFilters:     {   url: 'json/notes-getfilters.json',   },
    setFilters:     {   url: 'json/notes-setfilters.json',   },

    markNoteRead:   {   url: 'json/notes-setread.json',
                        method: 'POST',                      },
    starNote:       {   url: 'json/notes-setstarred.json',
                        method: 'POST',                      },
    trashNote:      {   url: 'json/notes-trash.json',
                        method: 'POST',                      },
    undeleteNote:   {   url: 'json/notes-setfolder.json',
                        method: 'POST',                      },

    markSelectedRead:
                    {   url: 'json/notes-setread.json',
                        method: 'POST',                      },
    starSelected:   {   url: 'json/notes-setstarred.json',
                        method: 'POST',                      },
    trashSelected:  {   url: 'json/notes-trash.json',
                        method: 'POST',                      },
    undeleteSelected:
                    {   url: 'json/notes-setfolder.json',
                        method: 'POST',                      },
    moveSelected:   {   url: 'json/notes-setfolder.json',
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
                        folder_id:  1;
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
                        folder_id:  1;
                        csrf_token: CsrfToken;      };
    moveSelected:   {   notes:      NoteId[];
                        folder_id:  FolderId;
                        csrf_token: CsrfToken;      };
}

type DeepPartial<T>  = { [P in keyof T]?:  DeepPartial<T[P]>;  };
type DeepRequired<T> = { [P in keyof T]-?: DeepRequired<T[P]>; };

const RequestDataStatic: DeepPartial<RequestData> = {
    getFolders:     undefined,
    getFilters:     undefined,
    undeleteNote:   {   folder_id:  1, },
}

/** ApiRequest
 *
 * An Api request to send to the note server.
 */
interface NotesApiRequest<T extends Commands> {
    url:        RequestLayout[T]['url'],    // string
    method:     RequestLayout[T]['method'], // string
    dataType:   'json',                     // string literal
    timeout:    number,                     // 30 seconds
    data:       RequestData[T],             // object | undefined
}


const POST = {
    method: 'POST',
    url: 'https://httpbin.org/post',
    data: {
        item: 'thing',
    },
};

const GET = {
    method: 'GET',
    url: 'https://httpbin.org/post',
    responseType: 'json/application'
};
/**
 * @param call API request call to issue
 * @param data Object containing the data to be sent with the request
 * @returns A fully formatted API Request ready to be issued
 * @example ConstructApiRequest("deleteFolder", { folder: 2, csrf_token: Token.get()})
 */
function ComposeApiRequest<T extends Commands>(call: T, data: RequestData[T]): NotesApiRequest<T> {
    // TODO:
	//don't use `data` in certain Command types.
    //        ConstructApiRequest("refreshAll")
    // This could be done with an overload, then split the functions to understand only certain portions of Commands.

    return {
        ...{ method: 'GET', dataType: 'json', timeout: 30 * 1E3, }, // defaults
        ...RequestStatic[call],                       // defaults for this call
        data: typeof data === 'undefined' ? data : { ...RequestDataStatic[call], ...data },
        //data: RequestDataStatic[call] === undefined ? undefined : { ...RequestDataStatic[call], ...data },
    };
}

ComposeApiRequest("getFilters", undefined) // Shouldn't error, never has.
//ComposeApiRequest("getFilters") // Shouldn't error
//ComposeApiRequest("addFolder")  // Should error


/**         RESPONSE        */
//region Response
type ResponseData = {
    //     refreshAllCounts:   {},  // Need experience.
    //     emptyTrash:         {},
    //     report:             {},
    send:           {   total:  number,         // Inbox? Not always accurate.
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
