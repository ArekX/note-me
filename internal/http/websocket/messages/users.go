package messages

import "encoding/json"

const (
	UsersCreate                    = "createUser"
	UsersUpdate                    = "updateUser"
	UsersDelete                    = "deleteUser"
	UsersFind                      = "findUsers"
	UsersUpdateProfile             = "updateProfile"
	UsersFindPick                  = "findPickUsers"
	UsersUpdateOnboarding          = "updateOnboarding"
	UsersUpdateProfilePicture      = "updateProfilePicture"
	UsersVerifyOwnPassword         = "verifyOwnPassword"
	UsersEncryptText               = "encryptText"
	UsersDecryptText               = "decryptText"
	UsersExportOwnData             = "exportOwnData"
	UsersCancelExportOwnData       = "cancelExportOwnData"
	UsersGetPasskeyRegistration    = "getPasskeyRegistrationOptions"
	UsersVerifyPasskeyRegistration = "verifyPasskeyRegistration"
	UsersGetOwnPasskeys            = "getOwnPasskeys"
	UsersDeleteOwnPasskey          = "deleteOwnPasskey"
	UsersUpdateOwnPasskey          = "updateOwnPasskey"
	UsersGetMcpClients             = "getMcpClients"
	UsersCreateMcpClient           = "createMcpClient"
	UsersUpdateMcpClient           = "updateMcpClient"
	UsersDeleteMcpClient           = "deleteMcpClient"
	UsersRegenerateMcpClientSecret = "regenerateMcpClientSecret"

	UsersCreateResponse                    = "createUserResponse"
	UsersUpdateResponse                    = "updateUserResponse"
	UsersDeleteResponse                    = "deleteUserResponse"
	UsersFindResponse                      = "findUsersResponse"
	UsersUpdateProfileResponse             = "updateProfileResponse"
	UsersFindPickResponse                  = "findPickUsersResponse"
	UsersUpdateOnboardingResponse          = "updateOnboardingResponse"
	UsersUpdateProfilePictureResponse      = "updateProfilePictureResponse"
	UsersVerifyOwnPasswordResponse         = "verifyOwnPasswordResponse"
	UsersEncryptTextResponse               = "encryptTextResponse"
	UsersDecryptTextResponse               = "decryptTextResponse"
	UsersForceLogoutResponse               = "forceLogoutResponse"
	UsersExportOwnDataResponse             = "exportOwnDataResponse"
	UsersExportOwnDataPercentage           = "exportOwnDataPercentage"
	UsersExportOwnDataFinished             = "exportOwnDataFinished"
	UsersExportOwnDataFailed               = "exportOwnDataFailed"
	UsersCancelExportOwnDataResponse       = "cancelExportOwnDataResponse"
	UsersGetPasskeyRegistrationResponse    = "getPasskeyRegistrationOptionsResponse"
	UsersVerifyPasskeyRegistrationResponse = "verifyPasskeyRegistrationResponse"
	UsersGetOwnPasskeysResponse            = "getOwnPasskeysResponse"
	UsersDeleteOwnPasskeyResponse          = "deleteOwnPasskeyResponse"
	UsersUpdateOwnPasskeyResponse          = "updateOwnPasskeyResponse"
	UsersGetMcpClientsResponse             = "getMcpClientsResponse"
	UsersCreateMcpClientResponse           = "createMcpClientResponse"
	UsersUpdateMcpClientResponse           = "updateMcpClientResponse"
	UsersDeleteMcpClientResponse           = "deleteMcpClientResponse"
	UsersRegenerateMcpClientSecretResponse = "regenerateMcpClientSecretResponse"
	UsersSessionUpdated                    = "sessionUpdated"

	// backend
	UsersNotifyExportUpdated  = "notifyUserExportUpdated"
	UsersNotifyExportFinished = "notifyUserExportFinished"
	UsersNotifyExportFailed   = "notifyUserExportFailed"
)

type CreateUser struct {
	Header
	Data AddUserRequest `json:"data"`
}

type CreateUserResponse struct {
	Header
	Data UserID `json:"data"`
}

type UpdateUser struct {
	Header
	ID   int64             `json:"id"`
	Data UpdateUserRequest `json:"data"`
}

type UpdateUserResponse struct {
	Header
	UpdatedID   int64             `json:"updated_id"`
	UpdatedData UpdateUserRequest `json:"updated_data"`
}

type DeleteUser struct {
	Header
	ID int64 `json:"id"`
}

type DeleteUserResponse struct {
	Header
	DeletedID int64 `json:"deleted_id"`
}

type FindUsers struct {
	Header
	Filters FindUserFilters `json:"filters"`
	Page    int             `json:"page"`
}

type FindUsersResponse struct {
	Header
	Records Paged[UserRecord] `json:"records"`
}

type UpdateProfile struct {
	Header
	Data EditUserProfile `json:"data"`
}

type UpdateProfileResponse struct {
	Header
	Data EditUserProfile `json:"data"`
}

// Not in the original app; null removes the picture.
type UpdateProfilePicture struct {
	Header
	Identifier *string `json:"identifier"`
}

type UpdateProfilePictureResponse struct {
	Header
	Identifier *string `json:"identifier"`
}

type FindPickUsers struct {
	Header
	Filters FindPickUserFilters `json:"filters"`
	Page    int                 `json:"page"`
}

type FindPickUsersResponse struct {
	Header
	Records Paged[PickUserRecord] `json:"records"`
}

type UpdateOnboardingState struct {
	Header
	OnboardingState UserOnboardingState `json:"onboarding_state"`
}

type UpdateOnboardingStateResponse struct {
	Header
	OnboardingState UserOnboardingState `json:"onboarding_state"`
}

type VerifyOwnPassword struct {
	Header
	Password string `json:"password"`
}

type VerifyOwnPasswordResponse struct {
	Header
	Verified bool `json:"verified"`
}

type EncryptText struct {
	Header
	Text     string `json:"text"`
	Password string `json:"password"`
}

type EncryptTextResponse struct {
	Header
	Encrypted string `json:"encrypted"`
}

type DecryptText struct {
	Header
	Encrypted string `json:"encrypted"`
	Password  string `json:"password"`
}

type DecryptTextResponse struct {
	Header
	Text string `json:"text"`
}

type ExportOwnData struct {
	Header
	UserPassword string `json:"user_password"`
}

type ExportOwnDataResponse struct {
	Header
	ExportID string `json:"export_id"`
	JobID    string `json:"job_id"`
}

type ExportOwnDataPercentageUpdate struct {
	Header
	ExportID   string  `json:"export_id"`
	Percentage float64 `json:"percentage"`
}

type ExportOwnDataFinished struct {
	Header
	ExportID string `json:"export_id"`
}

type ExportOwnDataFailed struct {
	Header
	ExportID string `json:"export_id"`
	Message  string `json:"message"`
}

type CancelExportOwnData struct {
	Header
	JobID string `json:"job_id"`
}

type CancelExportOwnDataResponse struct {
	Header
	JobID string `json:"job_id"`
}

type ForceLogoutResponse struct{ Header }

// Not in the original app: carries the /api/session payload (decision 0.4).
type SessionUpdated struct {
	Header
	User          UserLoginRecord `json:"user"`
	Permissions   []string        `json:"permissions"`
	RequiredSteps []string        `json:"required_steps"`
}

// Password is needed once per session every five minutes (decision 0.50).
type GetPasskeyRegistration struct {
	Header
	Password *string `json:"password,omitempty"`
}

// Options is a WebAuthn PublicKeyCredentialCreationOptionsJSON, left out
// when the password has to be entered first.
type GetPasskeyRegistrationResponse struct {
	Header
	PasswordRequired bool            `json:"password_required"`
	Options          json.RawMessage `json:"options,omitempty"`
}

// Response is a WebAuthn RegistrationResponseJSON.
type VerifyPasskeyRegistration struct {
	Header
	Response json.RawMessage `json:"response"`
}

type VerifyPasskeyRegistrationResponse struct {
	Header
	RegistrationResult
}

type GetOwnPasskeys struct {
	Header
	Page int `json:"page"`
}

type GetOwnPasskeysResponse struct {
	Header
	Records Paged[UserPasskeyRecord] `json:"records"`
}

type DeleteOwnPasskey struct {
	Header
	ID int64 `json:"id"`
}

type DeleteOwnPasskeyResponse struct {
	Header
	ID int64 `json:"id"`
}

type UpdateOwnPasskey struct {
	Header
	ID   int64  `json:"id"`
	Name string `json:"name"`
}

type UpdateOwnPasskeyResponse struct {
	Header
	ID   int64  `json:"id"`
	Name string `json:"name"`
}

type McpClientRecord struct {
	ID           int64    `json:"id"`
	Name         string   `json:"name"`
	Kind         string   `json:"kind"`
	ClientID     *string  `json:"client_id"`
	TokenPrefix  *string  `json:"token_prefix"`
	RedirectURIs []string `json:"redirect_uris"`
	IsReadOnly   bool     `json:"is_read_only"`
	CreatedAt    int64    `json:"created_at"`
	LastUsedAt   *int64   `json:"last_used_at"`
}

type McpClientData struct {
	Name         string   `json:"name"`
	IsReadOnly   bool     `json:"is_read_only"`
	RedirectURIs []string `json:"redirect_uris"`
}

type NewMcpClientData struct {
	McpClientData
	Kind string `json:"kind"`
}

type GetMcpClients struct{ Header }

type GetMcpClientsResponse struct {
	Header
	Clients []McpClientRecord `json:"clients"`
}

type CreateMcpClient struct {
	Header
	Data NewMcpClientData `json:"data"`
}

// Secret is the personal token or the OAuth client secret, sent only here
// and on regeneration; the server keeps a hash.
type CreateMcpClientResponse struct {
	Header
	Client McpClientRecord `json:"client"`
	Secret string          `json:"secret,omitempty"`
}

type UpdateMcpClient struct {
	Header
	ID   int64         `json:"id"`
	Data McpClientData `json:"data"`
}

type UpdateMcpClientResponse struct {
	Header
	Client McpClientRecord `json:"client"`
}

type DeleteMcpClient struct {
	Header
	ID int64 `json:"id"`
}

type DeleteMcpClientResponse struct {
	Header
	ID int64 `json:"id"`
}

type RegenerateMcpClientSecret struct {
	Header
	ID int64 `json:"id"`
}

type RegenerateMcpClientSecretResponse struct {
	Header
	Client McpClientRecord `json:"client"`
	Secret string          `json:"secret,omitempty"`
}

type NotifyUserExportUpdated struct {
	Header
	ExportID   string  `json:"export_id"`
	UserID     int64   `json:"user_id"`
	Percentage float64 `json:"percentage"`
}

type NotifyUserExportFinished struct {
	Header
	ExportID string `json:"export_id"`
	UserID   int64  `json:"user_id"`
}

type NotifyUserExportFailed struct {
	Header
	ExportID string `json:"export_id"`
	Message  string `json:"message"`
	UserID   int64  `json:"user_id"`
}
