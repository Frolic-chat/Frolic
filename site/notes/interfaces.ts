type CsrfToken      = string;
type CharacterName  = string;
type CharacterId    = number;
type NoteId         = number;
type ActionId       = number;
type FolderId       = number;
type ConditionId    = number;
type NoteBool       = 1 | 0;

// FList.Notes.xxx
type offset = number;
type amount = number;

type Commands =
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

type RequestData = {
    // getFolders()
    refreshAllCounts:
                    {   notes:      [];         // Fix this
                        folder_id:  FolderId;       };

    send:           {   },

    addFolder:      {   name:       string;
                        csrf_token: CsrfToken;      };

    renameFolder:   {   folder:     string;
                        name:       string;
                        csrf_token: CsrfToken;      };

    deleteFolder:   {   folder:     string;
                        csrf_token: CsrfToken;      };

    emptyTrash:     {   csrf_token: CsrfToken;      };

    // get
    notes:          {   offset: number;
                        amount: number;
                        folder: FolderId;           };

    starred:        {   };
                    // {   notes:      NoteId[];
                    //     state:      null;       // Fix this
                    //     csrf_token: string; };

    unread:         {   offset: number;
                        amount: number;
                        folder: FolderId;           };

    getFolders:     {   };
    searchUser:     {   offset: number;
                        amount: number;
                        name:   CharacterName;      };

    searchContent:  {   offset: number;
                        amount: number;
                        query:  string;             };

    getFilters:     {   };
    setFilters:     {   filters:    Filter[];       // ???
                        csrf_token: CsrfToken;      };

    markNoteRead:   {   notes:      NoteMetadata[];
                        state:      null;            // Fix this
                        folder_id:  FolderId;
                        csrf_token: CsrfToken;      };

    starNote:       {   notes:      NoteMetadata[];
                        state:      null;           // Fix this
                        csrf_token: CsrfToken;      };

    trashNote:      {   notes:      NoteMetadata[];
                        csrf_token: CsrfToken;      };

    undeleteNote:   {   notes:      NoteId[];
                        folder_id:  1;
                        csrf_token: CsrfToken;      };

    report:         {   note_id:    NoteId;
                        reason:     string;
                        csrf_token: CsrfToken;      };

    markSelectedRead:
                    {   notes:      NoteId[];
                        csrf_token: CsrfToken;
                        state:      null;       // Fix this
                        folder_id:  FolderId;       };

    starSelected:   {   };
    trashSelected:  {   notes:      NoteId[];
                        csrf_token: CsrfToken;      };

    undeleteSelected: // just uses moveSelected
                    {   notes:      NoteId[];
                        folder_id:  FolderId;
                        csrf_token: CsrfToken;      };

    moveSelected:   {   notes:      NoteId[];
                        folder_id:  FolderId;
                        csrf_token: CsrfToken;      };
}

const RequestDataStatic: Partial<RequestData> = {

}

type RequestLayout = Record<Commands, { url: string, method?: 'GET' | 'POST', dataType?: 'json' }>;

const RequestStatic: RequestLayout = {
    refreshAllCounts:
                    {   url: 'json/notes-getfolders.json'    },
    emptyTrash:     {   url: 'json/notes-emptytrash.json',   },
    report:         {   url: 'json/notes-report.json',       },

    send:           {   url: 'json/notes-send.json',         },

    addFolder:      {   url: 'json/notes-createfolder.json', },
    renameFolder:   {   url: 'json/notes-renamefolder.json', },
    deleteFolder:   {   url: 'json/notes-deletefolder.json', },

    // get
    notes:          {   url: 'json/notes-get.json',          },
    unread:         {   url: 'json/notes-getunread.json',    },
    starred:        {   url: 'json/notes-getstarred.json',   },
                        // json/notes-getstarred.php

    getFolders:     {   url: 'json/notes-getfolders.json',   },

    searchUser:     {   url: 'json/notes-searchuser.json',   },
    searchContent:  {   url: 'json/notes-searchcontent.json',
                        method: 'GET',                       },
    getFilters:     {   url: 'json/notes-getfilters.json',   },
    setFilters:     {   url: 'json/notes-setfilters.json',   },

    markNoteRead:   {   url: 'json/notes-setread.json',      },
    starNote:       {   url: 'json/notes-setstarred.json',   },
    trashNote:      {   url: 'json/notes-trash.json',        },
    undeleteNote:   {   url: 'json/notes-setfolder',
                        method: 'POST',                      },

    markSelectedRead:
                    {   url: 'json/notes-setread.json',      },
    starSelected:   {   url: 'json/notes-setstarred.json',   },
    trashSelected:  {   url: 'json/notes-trash.json',        },
    undeleteSelected:
                    {   url: 'json/notes-setfolder.json',    },
    moveSelected:   {   url: 'json/notes-setfolder.json',    },
}

type ResponseData = {
//     refreshAllCounts:   {},

//     send:               {},

//     addFolder:          {},
//     renameFolder:       string,
//     deleteFolder:       string,

//     emptyTrash:         string,

//     // get
//     getNotes:       {   notes: NoteMetadata[];
//                         total: number;
//                         error: string;      };

//     getStarred:         string;
//     getUnread:          string;
//     getFolders:     {   folders: Folder[];
//                         error:  string;     };

//     searchUser:         string;
//     searchContent:  {   notes: NoteMetadata[];
//                         total: number;
//                         error: string;      };

//     getFilters:     {   filters: { [key: string]: Filter; },
//                         error:   string;    };

//     setFilters:         string,

//     markNoteRead:       string,
//     starNote:           string,
//     trashNote:          string,
//     undeleteNote:       string,

//     report:             string,

//     markSelectedRead:   string,
//     starSelected:       string,
//     trashSelected:      string,
//     undeleteSelected:   string,
//     moveSelected:       string,
}

/** ApiRequest
 *
 * A base type for all Api requests sent to the note server.
 */
interface ApiReq<T extends Commands> {
    url:        typeof RequestStatic[T]['url'],
    method:     'POST' | 'GET',
    dataType:   'json',
    data:       RequestData[T],
}

function ConstructApiCall<T extends Commands>(key: T, data: RequestData[T]): ApiReq<T> {
    return {
        ...{ method: 'POST', dataType: 'json' }, // defaults
        ...RequestStatic[key],
        data: { ...RequestDataStatic[key], ...data }
    };
}

interface NoteMetadata {
    note_id:             NoteId;
    title:               string;
    source_character_id: CharacterId;
    source_name:         CharacterName;
    dest_name:           CharacterName;
    dest_character_id:   CharacterId;
    datetime_sent:       string;
    folder_id:           FolderId;
    read:                NoteBool;
    starred:             NoteBool;
}

interface Folder {
    name:         string,
    folder_id:    FolderId,
    notecount:    number,
    undreadcount: number,
}

interface Condition {
    condition_id:   ConditionId,
    type:           'to-dest' | string,
    value:          string,
    action_id:      ActionId,
}

interface Filter {
    action_id:  ActionId,
    folder_id:  FolderId,
    read:       NoteBool,
    starred:    NoteBool,
    conditions: Condition[],
}
