package messages

import "encoding/json"

type UserRecord struct {
	ID                      int64  `json:"id"`
	Name                    string `json:"name"`
	Username                string `json:"username"`
	Timezone                string `json:"timezone"`
	Role                    string `json:"role"`
	IsPasswordResetRequired bool   `json:"is_password_reset_required"`
	CreatedAt               int64  `json:"created_at"`
	UpdatedAt               int64  `json:"updated_at"`
}

type UserOnboardingState struct {
	IntroductionDismissed          *bool `json:"introduction_dismissed,omitempty"`
	ViewNoteIntroductionDismissed  *bool `json:"view_note_introduction_dismissed,omitempty"`
	EditNoteIntroductionDismissed  *bool `json:"edit_note_introduction_dismissed,omitempty"`
	BackupManagementIntroDismissed *bool `json:"backup_management_intro_dismissed,omitempty"`
}

type UserLoginRecord struct {
	UserRecord
	OnboardingState UserOnboardingState `json:"onboarding_state"`
	PreferredEditor string              `json:"preferred_editor"`
	ProfilePicture  *string             `json:"profile_picture"`
}

type UserID struct {
	ID int64 `json:"id"`
}

type FindUserFilters struct {
	Name     string `json:"name,omitempty"`
	Username string `json:"username,omitempty"`
	Role     string `json:"role,omitempty"`
}

type FindPickUserFilters struct {
	Name           string  `json:"name,omitempty"`
	Username       string  `json:"username,omitempty"`
	UserIDs        []int64 `json:"user_ids,omitempty"`
	ExcludeUserIDs []int64 `json:"exclude_user_ids,omitempty"`
}

type PickUserRecord struct {
	ID       int64  `json:"id"`
	Name     string `json:"name"`
	Username string `json:"username"`
}

type UserPasskeyRecord struct {
	ID         int64  `json:"id"`
	Name       string `json:"name"`
	LastUsedAt int64  `json:"last_used_at"`
	CreatedAt  int64  `json:"created_at"`
	Transports string `json:"transports"`
}

type RegistrationResult struct {
	Success    bool   `json:"success"`
	FailReason string `json:"fail_reason,omitempty"`
}

type AddUserRequest struct {
	Name     string `json:"name"`
	Username string `json:"username"`
	Password string `json:"password"`
	Role     string `json:"role"`
	Timezone string `json:"timezone"`
}

type UpdateUserRequest struct {
	Name        string  `json:"name"`
	NewPassword *string `json:"new_password,omitempty"`
	Role        string  `json:"role"`
	Timezone    string  `json:"timezone"`
}

// PreferredEditor is not in the original; an absent key keeps the current one.
type EditUserProfile struct {
	Name            string  `json:"name"`
	Timezone        string  `json:"timezone"`
	PreferredEditor string  `json:"preferred_editor,omitempty"`
	OldPassword     *string `json:"old_password,omitempty"`
	NewPassword     *string `json:"new_password,omitempty"`
	ConfirmPassword *string `json:"confirm_password,omitempty"`
}

type NoteRecord struct {
	ID          int64  `json:"id"`
	Title       string `json:"title"`
	Note        string `json:"note"`
	IsEncrypted bool   `json:"is_encrypted"`
	IsWide      bool   `json:"is_wide"`
	UserID      int64  `json:"user_id"`
	CreatedAt   int64  `json:"created_at"`
	UpdatedAt   int64  `json:"updated_at"`
	LastOpenAt  *int64 `json:"last_open_at"`
	IsDeleted   bool   `json:"is_deleted,omitempty"`
	DeletedAt   *int64 `json:"deleted_at,omitempty"`
}

type ViewNoteRecord struct {
	ID          int64    `json:"id"`
	Title       string   `json:"title"`
	Note        string   `json:"note"`
	IsEncrypted bool     `json:"is_encrypted"`
	IsWide      bool     `json:"is_wide"`
	GroupID     *int64   `json:"group_id"`
	GroupName   *string  `json:"group_name"`
	Tags        []string `json:"tags"`
	UpdatedAt   int64    `json:"updated_at"`
}

type NoteDetailsRecord struct {
	GroupID     *int64  `json:"group_id"`
	GroupName   *string `json:"group_name"`
	CreatedAt   int64   `json:"created_at"`
	UpdatedAt   int64   `json:"updated_at"`
	UserName    string  `json:"user_name"`
	IsEncrypted bool    `json:"is_encrypted"`
	Note        string  `json:"note"`
	Title       string  `json:"title"`
	IsDeleted   bool    `json:"is_deleted"`
}

type NoteDetailsOptions struct {
	IncludeGroup     bool `json:"include_group,omitempty"`
	IncludeTimestamp bool `json:"include_timestamp,omitempty"`
	IncludeUser      bool `json:"include_user,omitempty"`
	IncludeTitle     bool `json:"include_title,omitempty"`
	IncludeNote      bool `json:"include_note,omitempty"`
	// Not in the original: the owner's deleted notes too, marked is_deleted.
	IncludeDeleted bool `json:"include_deleted,omitempty"`
}

type RecentNoteRecord struct {
	ID          int64   `json:"id"`
	Title       string  `json:"title"`
	GroupID     *int64  `json:"group_id"`
	GroupName   *string `json:"group_name"`
	UpdatedAt   int64   `json:"updated_at"`
	LastOpenAt  *int64  `json:"last_open_at"`
	IsEncrypted bool    `json:"is_encrypted"`
}

type DeletedNoteRecord struct {
	ID          int64  `json:"id"`
	Title       string `json:"title"`
	IsEncrypted bool   `json:"is_encrypted"`
	DeletedAt   *int64 `json:"deleted_at,omitempty"`
}

type DeletedNotesFilter struct {
	FromID *int64 `json:"fromId,omitempty"`
}

// IsWide is not in the original; an absent key means normal width.
type AddNoteRequest struct {
	Title       string   `json:"title"`
	Text        string   `json:"text"`
	IsEncrypted bool     `json:"is_encrypted"`
	IsWide      *bool    `json:"is_wide,omitempty"`
	Tags        []string `json:"tags"`
	GroupID     *int64   `json:"group_id" zod:"nullable"`
}

// Tags is a pointer so an empty list (clear the tags) differs from no key.
type UpdateNoteRequest struct {
	Title       *string         `json:"title,omitempty"`
	IsEncrypted *bool           `json:"is_encrypted,omitempty"`
	IsWide      *bool           `json:"is_wide,omitempty"`
	Text        *string         `json:"text,omitempty"`
	Tags        *[]string       `json:"tags,omitempty"`
	GroupID     Optional[int64] `json:"group_id,omitzero" zod:"nullable"`
}

type NoteHistoryMetaRecord struct {
	ID          int64  `json:"id"`
	Version     string `json:"version"`
	CreatedAt   int64  `json:"created_at"`
	IsEncrypted bool   `json:"is_encrypted"`
}

type NoteHistoryDataRecord struct {
	Version     string `json:"version"`
	Note        string `json:"note"`
	Title       string `json:"title"`
	IsEncrypted bool   `json:"is_encrypted"`
	Tags        string `json:"tags"`
}

// Reminder is the "once" | "repeat" union of SetReminderRequest.
type Reminder struct {
	Type        string `json:"type"`
	NextAt      int64  `json:"next_at,omitempty"`
	Interval    int64  `json:"interval,omitempty"`
	UnitValue   int64  `json:"unit_value,omitempty"`
	RepeatCount int64  `json:"repeat_count,omitempty"`
}

type SetReminderResult struct {
	NextAt      int64  `json:"next_at"`
	Interval    *int64 `json:"interval"`
	UnitValue   *int64 `json:"unit_value"`
	RepeatCount int64  `json:"repeat_count"`
}

type ReminderNoteRecord struct {
	ID          int64  `json:"id"`
	NoteID      int64  `json:"note_id"`
	DoneCount   int64  `json:"done_count"`
	Interval    *int64 `json:"interval"`
	UnitValue   *int64 `json:"unit_value"`
	RepeatCount int64  `json:"repeat_count"`
	NextAt      int64  `json:"next_at"`
	Title       string `json:"title"`
	IsEncrypted bool   `json:"is_encrypted"`
	AuthorID    int64  `json:"author_id"`
	AuthorName  string `json:"author_name"`
	Type        string `json:"type"`
}

type UserReminderNotesFilters struct {
	FromNextAt *int64 `json:"fromNextAt,omitempty"`
	FromID     *int64 `json:"fromId,omitempty"`
	Limit      *int   `json:"limit,omitempty"`
}

type NoteReminderData struct {
	ID          int64  `json:"id"`
	NextAt      int64  `json:"next_at"`
	Interval    *int64 `json:"interval"`
	UnitValue   *int64 `json:"unit_value"`
	RepeatCount int64  `json:"repeat_count"`
	DoneCount   int64  `json:"done_count"`
}

type SearchNoteFilters struct {
	FromID  *int64   `json:"from_id,omitempty"`
	Query   string   `json:"query"`
	GroupID *int64   `json:"group_id,omitempty"`
	Tags    []string `json:"tags,omitempty"`
	Type    string   `json:"type"` // general | shared | reminders | recycleBin
}

type NoteSearchRecord struct {
	ID          int64   `json:"id"`
	Title       string  `json:"title"`
	Note        string  `json:"note"`
	GroupName   *string `json:"group_name"`
	IsEncrypted bool    `json:"is_encrypted"`
	UpdatedAt   int64   `json:"updated_at"`
	UserName    string  `json:"user_name"`
}

type NoteSearchResult = any // record type depends on the search type

type PublicNoteShareRecord struct {
	ID         int64  `json:"id"`
	NoteID     int64  `json:"note_id"`
	Identifier string `json:"identifier"`
	CreatedAt  int64  `json:"created_at"`
	ExpiresAt  *int64 `json:"expires_at"`
}

type NoteShareData struct {
	Users []PickUserRecord        `json:"users"`
	Links []PublicNoteShareRecord `json:"links"`
}

type PublicSharedNote struct {
	ID          int64    `json:"id"`
	Title       string   `json:"title"`
	Note        string   `json:"note"`
	IsEncrypted bool     `json:"is_encrypted"`
	IsWide      bool     `json:"is_wide"`
	Tags        []string `json:"tags"`
	UpdatedAt   int64    `json:"updated_at"`
	UserName    string   `json:"user_name"`
}

type UserSharedNoteMeta struct {
	ID          int64  `json:"id"`
	ShareID     int64  `json:"share_id"`
	Title       string `json:"title"`
	IsEncrypted bool   `json:"is_encrypted"`
	UserName    string `json:"user_name"`
	CreatedAt   int64  `json:"created_at"`
}

type FindUserSharedNotesFilters struct {
	FromCreatedAt *int64 `json:"fromCreatedAt,omitempty"`
	FromShareID   *int64 `json:"fromShareId,omitempty"`
	Limit         *int   `json:"limit,omitempty"`
}

type TagRecord struct {
	ID   int64  `json:"id"`
	Name string `json:"name"`
}

type FindTagFilters struct {
	Name string `json:"name"`
}

type TagRequest struct {
	Name string `json:"name"`
}

type UpdateTagRequest struct {
	Name *string `json:"name,omitempty"`
}

type GroupRecord struct {
	ID           int64  `json:"id"`
	Name         string `json:"name"`
	ParentID     *int64 `json:"parent_id"`
	CreatedAt    int64  `json:"created_at"`
	HasSubgroups *int   `json:"has_subgroups"`
	HasNotes     *int   `json:"has_notes"`
}

type AddGroupRequest struct {
	Name     string `json:"name" error:"Name is required"`
	ParentID *int64 `json:"parent_id" zod:"nullable" error:"Parent ID is required"`
}

type UpdateGroupRequest struct {
	Name     *string         `json:"name,omitempty" error:"Name is required"`
	ParentID Optional[int64] `json:"parent_id,omitzero" zod:"nullable" error:"Parent ID is required"`
}

type TreeRecord struct {
	Type        string `json:"type"` // note | group
	ID          int64  `json:"id"`
	Name        string `json:"name"`
	IsEncrypted int    `json:"is_encrypted"`
	HasChildren int    `json:"has_children"`
}

type FileMetaRecord struct {
	Identifier string `json:"identifier"`
	Name       string `json:"name"`
	MimeType   string `json:"mime_type"`
	Size       int64  `json:"size"`
	IsPublic   bool   `json:"is_public"`
	CreatedAt  int64  `json:"created_at"`
	CreatedBy  string `json:"created_by"`
}

type FindFileFilters struct {
	Name       string `json:"name,omitempty"`
	AllFiles   bool   `json:"allFiles,omitempty"`
	Owner      string `json:"owner,omitempty"`
	Kind       string `json:"kind,omitempty"`
	Visibility string `json:"visibility,omitempty"`
}

type UpdateMultipleFilesRequest struct {
	Identifiers []string `json:"identifiers"`
	Data        struct {
		IsPublic *bool `json:"is_public,omitempty"`
	} `json:"data"`
}

type NotificationRecord struct {
	ID        int64            `json:"id"`
	Data      NotificationData `json:"data"`
	CreatedAt int64            `json:"created_at"`
	IsRead    bool             `json:"is_read"`
	UserID    int64            `json:"user_id"`
}

// NotificationData.Payload is NotificationNoteReminderData for
// "reminder-received" and NoteSharedData for "note-shared".
type NotificationData struct {
	Type    string          `json:"type"`
	Payload json.RawMessage `json:"payload"`
}

type NotificationNoteReminderData struct {
	ID          int64  `json:"id"`
	ReminderID  int64  `json:"reminder_id"`
	Title       string `json:"title"`
	IsEncrypted bool   `json:"is_encrypted"`
	UserID      int64  `json:"user_id"`
	UserName    string `json:"user_name"`
	Type        string `json:"type"` // own | shared
}

type NoteSharedData struct {
	ID       int64  `json:"id"`
	Title    string `json:"title"`
	UserName string `json:"user_name"`
}

type PeriodicTaskRecord struct {
	TaskIdentifier      string  `json:"task_identifier"`
	NextRunAt           int64   `json:"next_run_at"`
	LastSuccessfulRunAt *int64  `json:"last_successful_run_at"`
	LastFailReason      *string `json:"last_fail_reason"`
	LastFailRunAt       *int64  `json:"last_fail_run_at"`
	IsLastRunSuccessful *bool   `json:"is_last_run_successful"`
}

type PeriodicTaskRunRecord struct {
	ID             int64   `json:"id"`
	TaskIdentifier string  `json:"task_identifier"`
	RanAt          int64   `json:"ran_at"`
	DurationMs     int64   `json:"duration_ms"`
	IsSuccessful   bool    `json:"is_successful"`
	FailReason     *string `json:"fail_reason"`
}

type BackupTargetRecord struct {
	ID           int64           `json:"id"`
	Name         string          `json:"name"`
	Type         string          `json:"type"` // local | s3
	Settings     json.RawMessage `json:"settings"`
	CreatedAt    int64           `json:"created_at"`
	UpdatedAt    int64           `json:"updated_at"`
	LastBackupAt *int64          `json:"last_backup_at"`
}

type BackupTargetRequest struct {
	Name     string          `json:"name"`
	Type     string          `json:"type"`
	Settings json.RawMessage `json:"settings"`
}

type LocalBackupSettings struct {
	Location string `json:"location"`
}

type S3Credentials struct {
	Type            string `json:"type"` // iam_role | access_key
	AccessKeyID     string `json:"access_key_id,omitempty"`
	SecretAccessKey string `json:"secret_access_key,omitempty"`
}

type S3BackupSettings struct {
	Bucket      string        `json:"bucket"`
	Region      string        `json:"region"`
	Prefix      string        `json:"prefix"`
	Credentials S3Credentials `json:"credentials"`
}

type AuditLogFilters struct {
	Event    string `json:"event,omitempty"`
	Username string `json:"username,omitempty"`
	From     int64  `json:"from,omitempty"`
	To       int64  `json:"to,omitempty"`
}

// Details is the JSON object stored with the event.
type AuditLogRecord struct {
	ID        int64           `json:"id"`
	CreatedAt int64           `json:"created_at"`
	Event     string          `json:"event"`
	UserID    *int64          `json:"user_id"`
	Username  *string         `json:"username"`
	Address   *string         `json:"address"`
	Details   json.RawMessage `json:"details"`
}

type BackupItem struct {
	Identifier string `json:"identifier"`
	Name       string `json:"name"`
	CreatedAt  int64  `json:"created_at"`
	Size       int64  `json:"size"`
}
