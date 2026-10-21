package jobprocessor

import (
	"archive/zip"
	"context"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"math"
	"os"
	"path/filepath"
	"regexp"

	"noteme/internal/components"
	"noteme/internal/components/jobs"
	"noteme/internal/components/repository"
	"noteme/internal/components/storage"
	"noteme/internal/encryption"
	"noteme/internal/eventbus"
)

const (
	exportFailedMessage = "Export failed due to an internal error."
	decryptMessage      = "Could not decrypt, wrong password or corrupted data."
	oldFormatMessage    = "Protected notes are stored in an old encryption format. Ask an administrator to run noteme-upgrade."
	unconvertedMessage  = "This note was protected before the encryption upgrade and could not be converted, its content cannot be recovered."
)

var (
	unsafeNameChars = regexp.MustCompile(`[^a-zA-Z0-9]`)
	fileLink        = regexp.MustCompile(`/file/([A-Za-z0-9-]+)`)
)

// Shown to the user as the export failure; anything else is logged and
// replaced with exportFailedMessage.
type exportError struct{ message string }

func (e exportError) Error() string { return e.message }

type dataExport struct {
	repo    repository.Repository
	storage *storage.Storage
	bus     *eventbus.Bus
	log     *slog.Logger
}

func newDataExport(c *components.Components, log *slog.Logger) *dataExport {
	return &dataExport{repo: c.Repository, storage: c.Storage, bus: c.Bus, log: log}
}

// One run writes temp/data-export-<userId>-<exportId>.zip: the user's files
// under file/ (0–50 %), then the note tree under notes/ (50–100 %).
type exportRun struct {
	*dataExport
	ctx      context.Context
	zip      *zip.Writer
	userID   int
	exportID string
	password string
	noteKey  []byte
	fileMap  map[string]string
	notes    int
	done     int
}

func (d *dataExport) run(ctx context.Context, job *jobs.Job) error {
	payload, ok := job.Payload.(jobs.DataExport)
	if !ok {
		return fmt.Errorf("unexpected payload %T", job.Payload)
	}

	err := d.export(ctx, job.UserID, payload)
	// Pushes still go out while the worker is stopping.
	pushCtx := context.WithoutCancel(ctx)
	if ctx.Err() != nil {
		return ctx.Err()
	}
	if err != nil {
		message := exportFailedMessage
		var shown exportError
		if errors.As(err, &shown) {
			message = shown.message
		}
		d.bus.Publish(pushCtx, eventbus.DataExportFailed{UserID: job.UserID, ExportID: payload.ExportID, Message: message})
		return err
	}
	d.bus.Publish(pushCtx, eventbus.DataExportFinished{UserID: job.UserID, ExportID: payload.ExportID})
	return nil
}

func (d *dataExport) export(ctx context.Context, userID int, payload jobs.DataExport) (err error) {
	file, err := d.storage.CreateExportFile(userID, payload.ExportID)
	if err != nil {
		return err
	}
	finished := false
	defer func() {
		if !finished {
			file.Close()
			if removeErr := d.storage.RemoveExportFile(userID, payload.ExportID); removeErr != nil {
				d.log.Error("Could not remove an unfinished export", "error", removeErr)
			}
		}
	}()

	r := &exportRun{
		dataExport: d,
		ctx:        ctx,
		zip:        zip.NewWriter(file),
		userID:     userID,
		exportID:   payload.ExportID,
		password:   payload.Password,
		fileMap:    map[string]string{},
	}

	if err := r.addFiles(); err != nil {
		return err
	}
	if r.notes, err = d.repo.Notes().GetUserNoteCount(ctx, userID); err != nil {
		return err
	}
	if err := r.addGroup(nil, "notes"); err != nil {
		return err
	}

	if err := r.zip.Close(); err != nil {
		return err
	}
	if err := file.Close(); err != nil {
		return err
	}
	if err := d.storage.FinishExportFile(userID, payload.ExportID); err != nil {
		return err
	}
	finished = true
	return nil
}

func (r *exportRun) progress(percentage float64) {
	r.bus.Publish(r.ctx, eventbus.DataExportUpdated{
		UserID:     r.userID,
		ExportID:   r.exportID,
		Percentage: math.Round(percentage*100) / 100,
	})
}

func (r *exportRun) addFiles() error {
	total, err := r.repo.Files().GetUserFileCount(r.ctx, r.userID)
	if err != nil {
		return err
	}

	done := 0
	for page := 1; ; page++ {
		files, err := r.repo.Files().FindFiles(r.ctx, r.userID, repository.FileFilters{}, page)
		if err != nil {
			return err
		}
		if len(files.Results) == 0 {
			return nil
		}
		for _, file := range files.Results {
			if err := r.ctx.Err(); err != nil {
				return err
			}
			name := file.Identifier + filepath.Ext(file.Name)
			if err := r.addFile(file.Identifier, "file/"+name); err != nil {
				return err
			}
			r.fileMap[file.Identifier] = name
			done++
		}
		if total > 0 {
			r.progress(float64(done) / float64(total) * 50)
		}
	}
}

// Files missing on disk are left out, as the original skipped files without
// data.
func (r *exportRun) addFile(identifier, entry string) error {
	source, err := r.storage.OpenFile(identifier)
	if errors.Is(err, os.ErrNotExist) {
		r.log.Warn("File missing on disk, left out of the export", "identifier", identifier)
		return nil
	}
	if err != nil {
		return err
	}
	defer source.Close()

	target, err := r.zip.Create(entry)
	if err != nil {
		return err
	}
	_, err = io.Copy(target, source)
	return err
}

// done is shared across the whole tree; the original counted per group, so
// progress went backwards after a subgroup.
func (r *exportRun) addGroup(groupID *int64, prefix string) error {
	notes, err := r.repo.Tree().GetTreeList(r.ctx, r.userID, groupID, repository.TreeItemNote)
	if err != nil {
		return err
	}
	for _, note := range notes {
		if err := r.ctx.Err(); err != nil {
			return err
		}
		content, err := r.noteContent(note.Id)
		if err != nil {
			return err
		}
		entry, err := r.zip.Create(prefix + "/" + unsafeNameChars.ReplaceAllString(note.Name, "-") + ".md")
		if err != nil {
			return err
		}
		if _, err := io.WriteString(entry, content); err != nil {
			return err
		}
		r.done++
	}
	if r.notes > 0 {
		r.progress(50 + float64(r.done)/float64(r.notes)*50)
	}

	groups, err := r.repo.Tree().GetTreeList(r.ctx, r.userID, groupID, repository.TreeItemGroup)
	if err != nil {
		return err
	}
	for _, group := range groups {
		if err := r.ctx.Err(); err != nil {
			return err
		}
		if err := r.addGroup(&group.Id, prefix+"/"+unsafeNameChars.ReplaceAllString(group.Name, "-")); err != nil {
			return err
		}
	}
	return nil
}

// Links to exported files point at their name inside the zip.
func (r *exportRun) noteContent(noteID int64) (string, error) {
	note, err := r.repo.Notes().GetNote(r.ctx, r.userID, noteID)
	if err != nil || note == nil {
		return "", err
	}

	content := note.Note
	if note.IsEncrypted {
		if content, err = r.decrypt(content); err != nil {
			return "", err
		}
	}

	return fileLink.ReplaceAllStringFunc(content, func(link string) string {
		if name, ok := r.fileMap[link[len("/file/"):]]; ok {
			return "/file/" + name
		}
		return link
	}), nil
}

// The note key is opened once, at the first protected note (Argon2id is
// expensive, decision 0.14).
func (r *exportRun) decrypt(value string) (string, error) {
	if r.noteKey == nil {
		encryptedKey, err := r.repo.Users().GetNoteEncryptionKey(r.ctx, r.userID)
		if err != nil {
			return "", err
		}
		if encryptedKey == "" {
			return "", exportError{"Failed to get decryption key for user"}
		}
		if r.noteKey, err = encryption.OpenNoteKey(encryptedKey, r.password); err != nil {
			return "", encryptionError(err, oldFormatMessage)
		}
	}
	text, err := encryption.DecryptNote(r.noteKey, value)
	if err != nil {
		return "", encryptionError(err, unconvertedMessage)
	}
	return text, nil
}

// unsupportedMessage tells an old key (the whole account needs the upgrade)
// from an old note value under a current key (the upgrade could not convert
// that note).
func encryptionError(err error, unsupportedMessage string) error {
	switch {
	case errors.Is(err, encryption.ErrUnsupportedFormat):
		return exportError{unsupportedMessage}
	case errors.Is(err, encryption.ErrDecrypt):
		return exportError{decryptMessage}
	}
	return err
}
