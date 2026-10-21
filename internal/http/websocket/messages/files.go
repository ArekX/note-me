package messages

const (
	FilesBegin          = "beginFile"
	FilesSendData       = "sendFileData" // binary frame
	FilesEnd            = "endFile"
	FilesFind           = "findFiles"
	FilesDelete         = "deleteFile"
	FilesUpdate         = "updateFile"
	FilesGetDetails     = "getFileDetails"
	FilesUpdateMultiple = "updateMultipleFiles"

	FilesBeginResponse          = "beginFileResponse"
	FilesSendDataResponse       = "sendFileDataResponse"
	FilesEndResponse            = "endFileResponse"
	FilesFindResponse           = "findFilesResponse"
	FilesDeleteResponse         = "deleteFileResponse"
	FilesUpdateResponse         = "updateFileResponse"
	FilesGetDetailsResponse     = "getFileDetailsResponse"
	FilesUpdateMultipleResponse = "updateMultipleFilesResponse"
)

type BeginFile struct {
	Header
	Size     int64  `json:"size"`
	Name     string `json:"name"`
	MimeType string `json:"mime_type"`
}

type BeginFileResponse struct {
	Header
	TargetID string `json:"target_id"`
}

type SendFileData struct {
	Header
	Binary
	TargetID string `json:"target_id"`
}

type SendFileDataResponse struct{ Header }

type EndFile struct {
	Header
	TargetID string `json:"target_id"`
}

type EndFileResponse struct{ Header }

type FindFiles struct {
	Header
	Filters FindFileFilters `json:"filters"`
	Page    *int            `json:"page,omitempty"`
}

type FindFilesResponse struct {
	Header
	Records Paged[FileMetaRecord] `json:"records"`
}

type DeleteFile struct {
	Header
	Identifier string `json:"identifier"`
}

type DeleteFileResponse struct {
	Header
	Identifier string `json:"identifier"`
}

type FileUpdateData struct {
	Identifier string `json:"identifier"`
	IsPublic   bool   `json:"is_public"`
}

type UpdateFile struct {
	Header
	FileUpdateData
}

type UpdateFileResponse struct {
	Header
	Data FileUpdateData `json:"data"`
}

type GetFileDetails struct {
	Header
	Identifiers []string `json:"identifiers"`
}

type GetFileDetailsResponse struct {
	Header
	Records []FileMetaRecord `json:"records"`
}

type UpdateMultipleFiles struct {
	Header
	Data UpdateMultipleFilesRequest `json:"data"`
}

type UpdateMultipleFilesResponse struct {
	Header
	Data UpdateMultipleFilesRequest `json:"data"`
}
