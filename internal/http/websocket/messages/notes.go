package messages

const (
	NotesCreate              = "createNote"
	NotesUpdate              = "updateNote"
	NotesDelete              = "deleteNote"
	NotesFindHistory         = "findNoteHistory"
	NotesGetHistoryData      = "getNoteHistoryData"
	NotesRevertToHistory     = "revertNoteToHistory"
	NotesDeleteHistoryRecord = "deleteHistoryRecord"
	NotesGet                 = "getNote"
	NotesGetShared           = "getSharedNote"
	NotesGetDetails          = "getNoteDetails"
	NotesGetShareData        = "getNoteShareData"
	NotesCreatePublicShare   = "createPublicShare"
	NotesShareToUsers        = "shareToUsers"
	NotesRemovePublicShare   = "removePublicShare"
	NotesFindShared          = "findSharedNotes"
	NotesSetReminder         = "setReminder"
	NotesRemoveReminder      = "removeReminder"
	NotesFindReminders       = "findNoteReminders"
	NotesGetReminderData     = "getNoteReminderData"
	NotesSearch              = "searchNote"
	NotesGetRecentlyOpened   = "getRecentlyOpenedNotes"
	NotesFindDeleted         = "findDeletedNotes"
	NotesRestoreDeleted      = "restoreDeletedNote"
	NotesFullyDelete         = "fullyDeleteNote"

	NotesCreateResponse              = "createNoteResponse"
	NotesUpdateResponse              = "updateNoteResponse"
	NotesDeleteResponse              = "deleteNoteResponse"
	NotesFindHistoryResponse         = "findNoteHistoryResponse"
	NotesGetHistoryDataResponse      = "getNoteHistoryDataResponse"
	NotesRevertToHistoryResponse     = "revertNoteToHistoryResponse"
	NotesDeleteHistoryRecordResponse = "deleteHistoryRecordResponse"
	NotesGetResponse                 = "getNoteResponse"
	NotesGetSharedResponse           = "getSharedNoteResponse"
	NotesGetDetailsResponse          = "getNoteDetailsResponse"
	NotesGetShareDataResponse        = "getNoteShareDataResponse"
	NotesCreatePublicShareResponse   = "createPublicShareResponse"
	NotesShareToUsersResponse        = "shareToUsersResponse"
	NotesRemovePublicShareResponse   = "removePublicShareResponse"
	NotesFindSharedResponse          = "findSharedNotesResponse"
	NotesSetReminderResponse         = "setReminderResponse"
	NotesRemoveReminderResponse      = "removeReminderResponse"
	NotesFindRemindersResponse       = "findNoteRemindersResponse"
	NotesGetReminderDataResponse     = "getNoteReminderDataResponse"
	NotesSearchResponse              = "searchNoteResponse"
	NotesGetRecentlyOpenedResponse   = "getRecentlyOpenedNotesResponse"
	NotesFindDeletedResponse         = "findDeletedNotesResponse"
	NotesRestoreDeletedResponse      = "restoreDeletedNoteResponse"
	NotesFullyDeleteResponse         = "fullyDeleteNoteResponse"

	NotesNotifyFullyDeleted = "notifyFullyDeletedNote" // backend
)

type CreateNote struct {
	Header
	Data AddNoteRequest `json:"data"`
}

type CreateNoteResponse struct {
	Header
	Record  NoteRecord `json:"record"`
	GroupID *int64     `json:"group_id"`
}

// Not in the original, whose note pages loaded the note on the server.
type GetNote struct {
	Header
	ID         int64 `json:"id"`
	MarkOpened bool  `json:"mark_opened,omitempty"`
}

type GetNoteResponse struct {
	Header
	Record ViewNoteRecord `json:"record"`
}

type GetNoteDetails struct {
	Header
	ID      int64              `json:"id"`
	Options NoteDetailsOptions `json:"options"`
}

type GetNoteDetailsResponse struct {
	Header
	Record NoteDetailsRecord `json:"record"`
}

type UpdateNote struct {
	Header
	ID   int64             `json:"id"`
	Data UpdateNoteRequest `json:"data"`
}

type UpdateNoteResponse struct {
	Header
	UpdatedID   int64             `json:"updated_id"`
	UpdatedData UpdateNoteRequest `json:"updated_data"`
}

type DeleteNote struct {
	Header
	ID int64 `json:"id"`
}

type DeleteNoteResponse struct {
	Header
	DeletedID int64 `json:"deleted_id"`
}

type FindNoteHistory struct {
	Header
	NoteID int64 `json:"note_id"`
	Page   int   `json:"page"`
}

type FindNoteHistoryResponse struct {
	Header
	Records Paged[NoteHistoryMetaRecord] `json:"records"`
}

type GetNoteHistoryData struct {
	Header
	ID int64 `json:"id"`
}

type GetNoteHistoryDataResponse struct {
	Header
	Data NoteHistoryDataRecord `json:"data"`
}

type RevertNoteToHistory struct {
	Header
	NoteID      int64 `json:"note_id"`
	ToHistoryID int64 `json:"to_history_id"`
}

type RevertNoteToHistoryResponse struct {
	Header
	NoteID      int64    `json:"note_id"`
	IsEncrypted bool     `json:"is_encrypted"`
	Title       string   `json:"title"`
	Note        string   `json:"note"`
	Tags        []string `json:"tags"`
}

type DeleteHistoryRecord struct {
	Header
	ID     int64 `json:"id"`
	NoteID int64 `json:"note_id"`
}

type DeleteHistoryRecordResponse struct {
	Header
	ID int64 `json:"id"`
}

// Not in the original, whose shared note page loaded the note on the server.
type GetSharedNote struct {
	Header
	ID int64 `json:"id"`
}

type GetSharedNoteResponse struct {
	Header
	Record PublicSharedNote `json:"record"`
}

type GetNoteShareData struct {
	Header
	NoteID int64 `json:"note_id"`
}

type GetNoteShareDataResponse struct {
	Header
	NoteShareData
}

type CreatePublicShare struct {
	Header
	NoteID    int64  `json:"note_id"`
	ExpiresAt *int64 `json:"expires_at"`
}

type CreatePublicShareResponse struct {
	Header
	Record PublicNoteShareRecord `json:"record"`
}

type RemovePublicShare struct {
	Header
	NoteID int64 `json:"note_id"`
	ID     int64 `json:"id"`
}

type RemovePublicShareResponse struct {
	Header
	RemovedID int64 `json:"removed_id"`
}

type ShareToUsers struct {
	Header
	NoteID  int64   `json:"note_id"`
	UserIDs []int64 `json:"user_ids"`
}

type ShareToUsersResponse struct{ Header }

type FindSharedNotes struct {
	Header
	Filters FindUserSharedNotesFilters `json:"filters"`
}

type FindSharedNotesResponse struct {
	Header
	Records []UserSharedNoteMeta `json:"records"`
}

type SetReminder struct {
	Header
	NoteID   int64    `json:"note_id"`
	Reminder Reminder `json:"reminder"`
}

type SetReminderResponse struct {
	Header
	NoteID int64             `json:"note_id"`
	Data   SetReminderResult `json:"data"`
}

type RemoveReminder struct {
	Header
	NoteID int64 `json:"note_id"`
}

type RemoveReminderResponse struct {
	Header
	NoteID int64 `json:"note_id"`
}

type FindNoteReminders struct {
	Header
	Filters UserReminderNotesFilters `json:"filters"`
}

type FindNoteRemindersResponse struct {
	Header
	Records []ReminderNoteRecord `json:"records"`
}

type GetNoteReminderData struct {
	Header
	NoteID int64 `json:"note_id"`
}

type GetNoteReminderDataResponse struct {
	Header
	Data *NoteReminderData `json:"data"`
}

type SearchNote struct {
	Header
	Filters SearchNoteFilters `json:"filters"`
}

type SearchNoteResponse struct {
	Header
	Results []NoteSearchResult `json:"results"`
}

type GetRecentlyOpenedNotes struct{ Header }

type GetRecentlyOpenedNotesResponse struct {
	Header
	Records []RecentNoteRecord `json:"records"`
}

type FindDeletedNotes struct {
	Header
	Filters DeletedNotesFilter `json:"filters"`
}

type FindDeletedNotesResponse struct {
	Header
	Records []DeletedNoteRecord `json:"records"`
}

type RestoreDeletedNote struct {
	Header
	ID int64 `json:"id"`
}

type RestoreDeletedNoteResponse struct {
	Header
	RestoredNote *ViewNoteRecord `json:"restored_note"`
}

type FullyDeleteNote struct {
	Header
	ID int64 `json:"id"`
}

type FullyDeleteNoteResponse struct {
	Header
	DeletedID int64 `json:"deleted_id"`
}

type NotifyFullyDeletedNote struct {
	Header
	UserID int64 `json:"user_id"`
	NoteID int64 `json:"note_id"`
}
