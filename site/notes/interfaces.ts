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

type Commands = [
    'refreshAllCounts',
    'emptyTrash',
    'report',

    'send',

    'addFolder',
    'renameFolder',
    'deleteFolder',

    'notes',
    'unread',           'starred',

    'getFolders',

    'searchUser',       'searchContent',

    'getFilters',       'setFilters',

    'markNoteRead',     'starNote',
    'trashNote',        'undeleteNote',

    'markSelectedRead', 'starSelected',
    'trashSelected',    'undeleteSelected',
    'moveSelected',
];

type ReqeuestData = {
    // getFolders()
    refreshAllCounts: { notes:      [];         // Fix this
                        folder_id:  FolderId;   };

    send:               {},

    addFolder:      {   name:       string;
                        csrf_token: string;     };

    renameFolder:   {   folder:     string;
                        name:       string;
                        csrf_token: string;     };

    deleteFolder:   {   folder:     string;
                        csrf_token: string;     };

    emptyTrash:     {   csrf_token: string;     };

    // get
    getNotes:       {   offset: number;
                        amount: number;
                        folder: FolderId;       };

    getStarred:         null;
                    // {   notes:      NoteId[];
                    //     state:      null;       // Fix this
                    //     csrf_token: string; };

    getUnread:      {   offset: number;
                        amount: number;
                        folder: FolderId;       };

    getFolders:         null;
    searchUser:     {   offset: number;
                        amount: number;
                        name:   CharacterName;  };

    searchContent:  {   offset: number;
                        amount: number;
                        query:  string; };

    getFilters:         null;
    setFilters:     {   filters:    Filter[];       // ???
                        csrf_token: string;     };

    markNoteRead:   {   notes:      NoteMetadata[];
                        state:      null;            // Fix this
                        folder_id:  FolderId;
                        csrf_token: string;     };

    starNote:       {   notes:      NoteMetadata[];
                        state:      null;           // Fix this
                        csrf_token: string;     };

    trashNote:      {   notes:      NoteMetadata[];
                        csrf_token: string;     };

    undeleteNote:   {   notes:      NoteId[];
                        folder_id:  1;
                        csrf_token: string;     };

    report:         {   note_id:    NoteId;
                        reason:     string;
                        csrf_token: string;     };

    markSelectedRead: { notes:      NoteId[];
                        csrf_token: string;
                        state:      null;       // Fix this
                        folder_id:  FolderId;   };

    starSelected:       string,
    trashSelected:  {   notes:      NoteId[];
                        csrf_token: string;     };

    // Actually just uses moveSelected :)
    undeleteSelected: { notes:      NoteId[];
                        folder_id:  FolderId;
                        csrf_token: string;     };

    moveSelected:   {   notes:      NoteId[];
                        folder_id:  FolderId;
                        csrf_token: string;     };
}

type ResponseData = {
    refreshAllCounts:   {},

    send:               {},

    addFolder:          {},
    renameFolder:       string,
    deleteFolder:       string,

    emptyTrash:         string,

    // get
    getNotes:       {   notes: NoteMetadata[];
                        total: number;
                        error: string;      };

    getStarred:         string;
    getUnread:          string;
    getFolders:     {   folders: Folder[];
                        error:  string;     };

    searchUser:         string;
    searchContent:  {   notes: NoteMetadata[];
                        total: number;
                        error: string;      };

    getFilters:     {   filters: { [key: string]: Filter; },
                        error:   string;    };

    setFilters:         string,

    markNoteRead:       string,
    starNote:           string,
    trashNote:          string,
    undeleteNote:       string,

    report:             string,

    markSelectedRead:   string,
    starSelected:       string,
    trashSelected:      string,
    undeleteSelected:   string,
    moveSelected:       string,
}

// getSelected()

/** ApiRequest
 * A base type for all Api requests sent to the
 */
interface ApiRequest {
    url:        string,
    type?:      'POST' | 'GET',
    dataType?: 'json',
    data:       object,
    onSuccess?: (...args: any) => void,
    onError?:   (...args: any) => void,
    onEither?:  (...args: any) => void,
}

// class RefreshAllCountsRequest implements ApiRequest {
//     url:        'json/notes-getfolders.json';
//     data:       { notes:     items,
//                   folder_id: number };
// }

class EmptyTrashRequest implements ApiRequest {
    url:        'json/notes-emptytrash.json';
    type:       'POST';
    dataType:   'json';
    data:       { csrf_token: string };
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

interface searchContentResponse {
    notes: NoteMetadata[],
    total: number,
    error: string,
}

interface Response {

}
