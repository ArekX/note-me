package settings

import (
	"encoding/json"

	"noteme/internal/components/backups"
	"noteme/internal/components/repository"
	"noteme/internal/http/validation"
)

const (
	maxTargetNameLength = 255
	locationMessage     = "Location must be a folder name inside the backup root, not an absolute path."
)

var invalidTarget = validation.Issues{{Code: "invalid_union", Path: []any{}, Message: "Invalid input"}}

// backupTargetSchema of the original is a zod union of two strict objects.
// zod reports the issues of the one branch whose fields have the right
// types; when no branch has them it reports a single invalid_union issue.
func parseBackupTarget(raw json.RawMessage) (repository.BackupTargetData, validation.Issues) {
	var request struct {
		Name     string          `json:"name"`
		Type     string          `json:"type"`
		Settings json.RawMessage `json:"settings"`
	}
	topIssues := validation.Decode(raw, &request)
	if hasTypeIssue(topIssues) {
		return repository.BackupTargetData{}, invalidTarget
	}

	var settings any
	var issues validation.Issues
	minLength(&issues, request.Name, "Name must be at least 1 character", "name")
	issues.MaxLength("name", request.Name, maxTargetNameLength, "Name must be at most 255 characters")

	switch request.Type {
	case backups.TypeLocal:
		var local backups.LocalSettings
		settingsIssues := validation.Decode(request.Settings, &local)
		if hasTypeIssue(settingsIssues) {
			return repository.BackupTargetData{}, invalidTarget
		}
		minLength(&issues, local.Location, "Location must be set.", "settings", "location")
		if local.Location != "" && !backups.ValidLocalLocation(local.Location) {
			issues = append(issues, validation.Issue{Code: "invalid_format", Path: []any{"settings", "location"}, Message: locationMessage})
		}
		issues = append(issues, prefixed(settingsIssues, "settings")...)
		settings = local
	case backups.TypeS3:
		s3, s3Issues, ok := parseS3Settings(request.Settings)
		if !ok {
			return repository.BackupTargetData{}, invalidTarget
		}
		issues = append(issues, s3Issues...)
		settings = s3
	default:
		return repository.BackupTargetData{}, invalidTarget
	}

	issues = append(issues, topIssues...)
	if len(issues) > 0 {
		return repository.BackupTargetData{}, issues
	}

	encoded, err := json.Marshal(settings)
	if err != nil {
		return repository.BackupTargetData{}, invalidTarget
	}
	return repository.BackupTargetData{Name: request.Name, Type: request.Type, Settings: string(encoded)}, nil
}

func parseS3Settings(raw json.RawMessage) (backups.S3Settings, validation.Issues, bool) {
	var request struct {
		Bucket      string          `json:"bucket"`
		Region      string          `json:"region"`
		Prefix      string          `json:"prefix"`
		Credentials json.RawMessage `json:"credentials"`
	}
	settingsIssues := validation.Decode(raw, &request)
	if hasTypeIssue(settingsIssues) {
		return backups.S3Settings{}, nil, false
	}

	settings := backups.S3Settings{Bucket: request.Bucket, Region: request.Region, Prefix: request.Prefix}
	var issues validation.Issues
	minLength(&issues, request.Bucket, "Bucket name must be at least 1 character", "settings", "bucket")
	minLength(&issues, request.Region, "Region must be at least 1 character", "settings", "region")

	// Both credential objects are non-strict, so extra keys are dropped.
	var credentials map[string]json.RawMessage
	if json.Unmarshal(request.Credentials, &credentials) != nil {
		return backups.S3Settings{}, nil, false
	}
	var credentialType string
	json.Unmarshal(credentials["type"], &credentialType)
	switch credentialType {
	case "iam_role":
		settings.Credentials = backups.S3Credentials{Type: credentialType}
	case "access_key":
		var keyID, secret string
		if json.Unmarshal(credentials["access_key_id"], &keyID) != nil || json.Unmarshal(credentials["secret_access_key"], &secret) != nil {
			return backups.S3Settings{}, nil, false
		}
		minLength(&issues, keyID, "Access key ID must be at least 1 character", "settings", "credentials", "access_key_id")
		minLength(&issues, secret, "Secret access key must be at least 1 character", "settings", "credentials", "secret_access_key")
		settings.Credentials = backups.S3Credentials{Type: credentialType, AccessKeyID: keyID, SecretAccessKey: secret}
	default:
		return backups.S3Settings{}, nil, false
	}

	return settings, append(issues, prefixed(settingsIssues, "settings")...), true
}

func hasTypeIssue(issues validation.Issues) bool {
	for _, issue := range issues {
		if issue.Code == "invalid_type" {
			return true
		}
	}
	return false
}

func minLength(issues *validation.Issues, value, message string, path ...any) {
	if validation.Length(value) < 1 {
		*issues = append(*issues, validation.Issue{Code: "too_small", Path: path, Message: message})
	}
}

func prefixed(issues validation.Issues, key string) validation.Issues {
	result := make(validation.Issues, 0, len(issues))
	for _, issue := range issues {
		issue.Path = append([]any{key}, issue.Path...)
		result = append(result, issue)
	}
	return result
}

// Not in the original, which sent S3 secrets back to the browser: responses
// leave the secret out, and an update that leaves it empty keeps the stored
// one.
func maskedSettings(targetType, settings string) json.RawMessage {
	if targetType != backups.TypeS3 {
		return json.RawMessage(settings)
	}
	var s3 backups.S3Settings
	if json.Unmarshal([]byte(settings), &s3) != nil {
		return json.RawMessage(settings)
	}
	if s3.Credentials.Type == "access_key" {
		s3.Credentials.SecretAccessKey = ""
		// secret_access_key is omitempty in the stored form; the form expects
		// the key.
		masked, _ := json.Marshal(map[string]any{
			"bucket": s3.Bucket, "region": s3.Region, "prefix": s3.Prefix,
			"credentials": map[string]string{"type": "access_key", "access_key_id": s3.Credentials.AccessKeyID, "secret_access_key": ""},
		})
		return masked
	}
	masked, _ := json.Marshal(s3)
	return masked
}

func keepStoredSecret(raw json.RawMessage, existing repository.BackupTarget) json.RawMessage {
	if existing.Type != backups.TypeS3 {
		return raw
	}
	var stored backups.S3Settings
	if json.Unmarshal([]byte(existing.Settings), &stored) != nil || stored.Credentials.Type != "access_key" {
		return raw
	}

	var target map[string]json.RawMessage
	var settings map[string]json.RawMessage
	var credentials map[string]json.RawMessage
	if json.Unmarshal(raw, &target) != nil || json.Unmarshal(target["settings"], &settings) != nil || json.Unmarshal(settings["credentials"], &credentials) != nil {
		return raw
	}
	var targetType, credentialType, secret string
	json.Unmarshal(target["type"], &targetType)
	json.Unmarshal(credentials["type"], &credentialType)
	if targetType != backups.TypeS3 || credentialType != "access_key" || json.Unmarshal(credentials["secret_access_key"], &secret) != nil || secret != "" {
		return raw
	}

	credentials["secret_access_key"], _ = json.Marshal(stored.Credentials.SecretAccessKey)
	settings["credentials"], _ = json.Marshal(credentials)
	target["settings"], _ = json.Marshal(settings)
	merged, err := json.Marshal(target)
	if err != nil {
		return raw
	}
	return merged
}
