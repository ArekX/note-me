package files

import (
	"context"
	"encoding/json"
	"regexp"
	"strconv"

	"noteme/internal/components"
	"noteme/internal/components/audit"
	"noteme/internal/components/repository"
	"noteme/internal/components/storage"
	"noteme/internal/http/rbac"
	"noteme/internal/http/validation"
	"noteme/internal/http/websocket"
	"noteme/internal/http/websocket/messages"
)

const (
	overLimit      = "File size is over the allowable limit."
	quotaExceeded  = "Storage quota exceeded."
	fileNotFound   = "File not found."
	sizeMismatch   = "File size mismatch."
	maxNameSize    = 255
	maxIdentifiers = 100
)

var (
	unsafeNameCharacters = regexp.MustCompile(`[^a-zA-Z0-9_ .-]+`)
	unsafeMimeCharacters = regexp.MustCompile(`[^a-zA-Z0-9+._/-]`)
	unsafeTargetID       = regexp.MustCompile(`[^a-zA-Z0-9-]`)
)

type Namespace struct {
	repo           repository.Repository
	storage        *storage.Storage
	audit          *audit.Log
	maxFileSize    int64
	maxStorageSize int64
}

func New(c *components.Components) *Namespace {
	return &Namespace{
		repo:           c.Repository,
		storage:        c.Storage,
		audit:          c.Audit,
		maxFileSize:    c.Config.MaxFileSize,
		maxStorageSize: c.Config.MaxUserStorageSize,
	}
}

func actor(req *websocket.Request) audit.Actor {
	return audit.Actor{UserID: req.Client.UserID, Username: req.Client.Session().Username, Address: req.Client.IP}
}

// The owner of a file the admin is about to change; nil when the file is
// missing or the admin's own.
func (n *Namespace) foreignOwner(ctx context.Context, req *websocket.Request, identifier string) (*int, error) {
	if !req.Client.Can(rbac.CanManageAllFiles) {
		return nil, nil
	}
	data, err := n.repo.Files().GetFileData(ctx, identifier)
	if err != nil || data == nil || data.UserId == req.Client.UserID {
		return nil, err
	}
	return &data.UserId, nil
}

func (n *Namespace) Register(hub *websocket.Hub) {
	hub.Handle(messages.NamespaceFiles, messages.FilesBegin, n.beginFile)
	hub.Handle(messages.NamespaceFiles, messages.FilesSendData, n.sendFileData)
	hub.Handle(messages.NamespaceFiles, messages.FilesEnd, n.endFile)
	hub.Handle(messages.NamespaceFiles, messages.FilesFind, n.findFiles)
	hub.Handle(messages.NamespaceFiles, messages.FilesDelete, n.deleteFile)
	hub.Handle(messages.NamespaceFiles, messages.FilesUpdate, n.updateFile)
	hub.Handle(messages.NamespaceFiles, messages.FilesGetDetails, n.getFileDetails)
	hub.Handle(messages.NamespaceFiles, messages.FilesUpdateMultiple, n.updateMultipleFiles)
}

// Temp upload files are named <userId>-<target id>, as in the original.
func tempPrefix(userID int) string {
	return strconv.Itoa(userID)
}

// addFileRequestSchema's name rules. The name is already sanitised, so only
// an empty name can fail the format check.
func validateBeginFile(name, mimeType string) validation.Issues {
	var issues validation.Issues
	if name == "" {
		issues.Add("too_small", "name", "Name must be at least 1 character long")
		issues.Add("invalid_format", "name", "Name must only contain letters, numbers, dots, spaces, hyphens, and underscores.")
	}
	issues.MaxLength("name", name, maxNameSize, "Group name must be at most 255 characters long")
	issues.MaxLength("mime_type", mimeType, 255, "MIME type must have at most 255 characters")
	return issues
}

func (n *Namespace) beginFile(ctx context.Context, req *websocket.Request) error {
	var msg messages.BeginFile
	if err := req.Decode(&msg); err != nil {
		return err
	}

	name := unsafeNameCharacters.ReplaceAllString(msg.Name, "-")
	mimeType := unsafeMimeCharacters.ReplaceAllString(msg.MimeType, "")
	if msg.Size > n.maxFileSize {
		return websocket.NewClientError(overLimit)
	}
	if issues := validateBeginFile(name, mimeType); len(issues) > 0 {
		return issues
	}

	userID := req.Client.UserID
	if n.maxStorageSize > 0 {
		used, err := n.repo.Files().GetUserStorageSize(ctx, userID)
		if err != nil {
			return err
		}
		if used+msg.Size > n.maxStorageSize {
			return websocket.NewClientError(quotaExceeded)
		}
	}
	target, err := n.storage.CreateTempFile(tempPrefix(userID))
	if err != nil {
		return err
	}
	err = n.repo.Files().CreateFileRecord(ctx, repository.NewFileRecord{
		Identifier: target,
		Name:       name,
		UserId:     userID,
		MimeType:   mimeType,
		Size:       msg.Size,
	})
	if err != nil {
		n.storage.RemoveTempFile(tempPrefix(userID), target)
		return err
	}

	return req.Respond(ctx, &messages.BeginFileResponse{
		Type:     messages.FilesBeginResponse,
		TargetID: target,
	})
}

// The original appended before checking the size and never checked that the
// upload was the user's (0.9.j).
func (n *Namespace) sendFileData(ctx context.Context, req *websocket.Request) error {
	var msg messages.SendFileData
	if err := req.Decode(&msg); err != nil {
		return err
	}

	userID := req.Client.UserID
	target := unsafeTargetID.ReplaceAllString(msg.TargetID, "")
	upload, err := n.repo.Files().GetFileUploadForUser(ctx, userID, target)
	if err != nil {
		return err
	}
	if upload == nil || upload.IsReady {
		return websocket.NewClientError(fileNotFound)
	}

	size, err := n.storage.TempFileSize(tempPrefix(userID), target)
	if err != nil {
		return websocket.NewClientError(fileNotFound)
	}
	if size+int64(len(req.BinaryData)) > n.maxFileSize {
		return websocket.NewClientError(overLimit)
	}
	if err := n.storage.AppendTempFile(tempPrefix(userID), target, req.BinaryData); err != nil {
		return err
	}

	return req.Respond(ctx, &messages.SendFileDataResponse{Type: messages.FilesSendDataResponse})
}

// The file is moved into the files folder before it is marked ready, so a
// ready record always has its bytes.
func (n *Namespace) endFile(ctx context.Context, req *websocket.Request) error {
	var msg messages.EndFile
	if err := req.Decode(&msg); err != nil {
		return err
	}

	userID := req.Client.UserID
	prefix := tempPrefix(userID)
	target := unsafeTargetID.ReplaceAllString(msg.TargetID, "")
	upload, err := n.repo.Files().GetFileUploadForUser(ctx, userID, target)
	if err != nil {
		return err
	}
	if upload == nil || upload.IsReady {
		return websocket.NewClientError(fileNotFound)
	}

	size, err := n.storage.TempFileSize(prefix, target)
	if err != nil || size != upload.Size {
		n.storage.RemoveTempFile(prefix, target)
		if _, err := n.repo.Files().DeleteFileByUser(ctx, userID, target); err != nil {
			return err
		}
		return websocket.NewClientError(sizeMismatch)
	}

	if err := n.storage.StoreTempFile(prefix, target, target); err != nil {
		return err
	}
	if err := n.repo.Files().MarkFileReady(ctx, target); err != nil {
		return err
	}

	req.RespondToUser(ctx, &messages.EndFileResponse{Type: messages.FilesEndResponse})
	notifyOthers(ctx, req, nil, target)
	return nil
}

func fileMetaRecords(records []repository.FileMetaRecord) []messages.FileMetaRecord {
	result := make([]messages.FileMetaRecord, 0, len(records))
	for _, record := range records {
		result = append(result, messages.FileMetaRecord{
			Identifier: record.Identifier,
			Name:       record.Name,
			MimeType:   record.MimeType,
			Size:       record.Size,
			IsPublic:   record.IsPublic,
			CreatedAt:  record.CreatedAt,
			CreatedBy:  record.CreatedBy,
		})
	}
	return result
}

func (n *Namespace) findFiles(ctx context.Context, req *websocket.Request) error {
	var msg messages.FindFiles
	if err := req.Decode(&msg); err != nil {
		return err
	}

	page := 1
	if msg.Page != nil {
		page = *msg.Page
	}
	records, err := n.repo.Files().FindFiles(ctx, req.Client.UserID, repository.FileFilters{
		Name:       msg.Filters.Name,
		AllFiles:   msg.Filters.AllFiles && req.Client.Can(rbac.CanManageAllFiles),
		Owner:      msg.Filters.Owner,
		Kind:       repository.FileKind(msg.Filters.Kind),
		Visibility: repository.FileVisibility(msg.Filters.Visibility),
	}, page)
	if err != nil {
		return err
	}

	return req.Respond(ctx, &messages.FindFilesResponse{
		Type: messages.FilesFindResponse,
		Records: messages.Paged[messages.FileMetaRecord]{
			Results: fileMetaRecords(records.Results),
			Total:   records.Total,
			Page:    records.Page,
			PerPage: records.PerPage,
		},
	})
}

func (n *Namespace) deleteFile(ctx context.Context, req *websocket.Request) error {
	var msg messages.DeleteFile
	if err := req.Decode(&msg); err != nil {
		return err
	}

	owner, err := n.foreignOwner(ctx, req, msg.Identifier)
	if err != nil {
		return err
	}
	var deleted, pictureCleared bool
	err = n.repo.RunInTransaction(ctx, func(tx repository.Repository) error {
		var err error
		if req.Client.Can(rbac.CanManageAllFiles) {
			deleted, err = tx.Files().DeleteFileRecord(ctx, msg.Identifier)
		} else {
			deleted, err = tx.Files().DeleteFileByUser(ctx, req.Client.UserID, msg.Identifier)
		}
		if err != nil || !deleted {
			return err
		}
		pictureCleared, err = tx.Users().ClearProfilePicture(ctx, msg.Identifier)
		return err
	})
	if err != nil {
		return err
	}
	if deleted {
		if err := n.storage.RemoveFile(msg.Identifier); err != nil {
			return err
		}
		if owner != nil {
			n.audit.Record(ctx, audit.FileDeletedByAdmin, actor(req), map[string]any{"identifier": msg.Identifier, "owner": *owner})
		}
	}
	// Only the owner can have set the file as their picture.
	if pictureCleared {
		ownerID := req.Client.UserID
		if owner != nil {
			ownerID = *owner
		}
		if _, err := req.Hub.RefreshUserSession(ctx, ownerID); err != nil {
			return err
		}
	}

	req.RespondToUser(ctx, &messages.DeleteFileResponse{
		Type:       messages.FilesDeleteResponse,
		Identifier: msg.Identifier,
	})
	if deleted {
		notifyOthers(ctx, req, owner, msg.Identifier)
	}
	return nil
}

func (n *Namespace) updateFile(ctx context.Context, req *websocket.Request) error {
	var msg messages.UpdateFile
	if err := req.Decode(&msg); err != nil {
		return err
	}

	owner, err := n.foreignOwner(ctx, req, msg.Identifier)
	if err != nil {
		return err
	}
	var scope *int
	if !req.Client.Can(rbac.CanManageAllFiles) {
		scope = &req.Client.UserID
	}
	if err := n.repo.Files().UpdateFileRecord(ctx, msg.Identifier, msg.IsPublic, scope); err != nil {
		return err
	}
	if owner != nil {
		n.audit.Record(ctx, audit.FileVisibilityChangedBy, actor(req), map[string]any{"identifier": msg.Identifier, "owner": *owner, "is_public": msg.IsPublic})
	}

	req.RespondToUser(ctx, &messages.UpdateFileResponse{
		Type: messages.FilesUpdateResponse,
		Data: msg.FileUpdateData,
	})
	notifyOthers(ctx, req, owner, msg.Identifier)
	return nil
}

func (n *Namespace) getFileDetails(ctx context.Context, req *websocket.Request) error {
	var msg messages.GetFileDetails
	if err := req.Decode(&msg); err != nil {
		return err
	}
	var issues validation.Issues
	if issues.MaxItems("identifiers", len(msg.Identifiers), maxIdentifiers, ""); len(issues) > 0 {
		return issues
	}

	records, err := n.repo.Files().GetFileDetailsForUser(ctx, req.Client.UserID, msg.Identifiers)
	if err != nil {
		return err
	}

	return req.Respond(ctx, &messages.GetFileDetailsResponse{
		Type:    messages.FilesGetDetailsResponse,
		Records: fileMetaRecords(records),
	})
}

// updateMultipleFilesSchema is strict on both levels; issues of the nested
// object carry the "data" path, as in zod.
func decodeUpdateMultiple(raw json.RawMessage) (messages.UpdateMultipleFilesRequest, validation.Issues) {
	var request messages.UpdateMultipleFilesRequest
	var outer struct {
		Identifiers []string        `json:"identifiers"`
		Data        json.RawMessage `json:"data" error:"Invalid input: expected object, received undefined"`
	}
	if issues := validation.Decode(raw, &outer); len(issues) > 0 {
		return request, issues
	}

	issues := validation.Decode(outer.Data, &request.Data)
	for index := range issues {
		issues[index].Path = append([]any{"data"}, issues[index].Path...)
	}
	issues.MaxItems("identifiers", len(outer.Identifiers), maxIdentifiers, "")
	request.Identifiers = outer.Identifiers
	return request, issues
}

func (n *Namespace) updateMultipleFiles(ctx context.Context, req *websocket.Request) error {
	var msg struct {
		Data json.RawMessage `json:"data"`
	}
	if err := req.Decode(&msg); err != nil {
		return err
	}

	data, issues := decodeUpdateMultiple(msg.Data)
	if len(issues) > 0 {
		return issues
	}
	if err := n.repo.Files().UpdateMultipleFiles(ctx, req.Client.UserID, data.Identifiers, data.Data.IsPublic); err != nil {
		return err
	}

	req.RespondToUser(ctx, &messages.UpdateMultipleFilesResponse{
		Type: messages.FilesUpdateMultipleResponse,
		Data: data,
	})
	notifyOthers(ctx, req, nil, data.Identifiers...)
	return nil
}

// The owner of a file an admin changed, and the other admins' lists of all
// files.
func notifyOthers(ctx context.Context, req *websocket.Request, owner *int, identifiers ...string) {
	changed := messages.NewDataChanged(messages.EntityFile, identifiers...)
	if owner != nil {
		req.Hub.SendToUsers(ctx, []int{*owner}, changed)
	}
	req.Hub.SendToPermission(ctx, rbac.CanManageAllFiles, req.Client.UserID, changed)
}
