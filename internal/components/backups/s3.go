package backups

import (
	"context"
	"errors"
	"fmt"
	"io"
	"os"
	"strings"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/feature/s3/manager"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/aws/aws-sdk-go-v2/service/s3/types"
)

const (
	s3PartSize    = 5 * 1024 * 1024
	s3Concurrency = 4
)

type s3Target struct {
	settings S3Settings
}

// "iam_role" uses the default credential chain (instance or task role,
// environment); "access_key" uses the stored keys.
func (t *s3Target) client(ctx context.Context) (*s3.Client, error) {
	options := []func(*config.LoadOptions) error{config.WithRegion(t.settings.Region)}
	if t.settings.Credentials.Type == "access_key" {
		options = append(options, config.WithCredentialsProvider(credentials.NewStaticCredentialsProvider(
			t.settings.Credentials.AccessKeyID, t.settings.Credentials.SecretAccessKey, "")))
	}
	cfg, err := config.LoadDefaultConfig(ctx, options...)
	if err != nil {
		return nil, fmt.Errorf("load s3 configuration: %w", err)
	}
	return s3.NewFromConfig(cfg), nil
}

// New backups go under the trimmed prefix. The original wrote
// "<prefix as entered>/<identifier>" ("/<id>" without a prefix,
// "<prefix>//<id>" with a trailing slash), so that folder is read too.
func (t *s3Target) folders() []string {
	folder := strings.Trim(t.settings.Prefix, "/")
	if folder != "" {
		folder += "/"
	}
	if original := t.settings.Prefix + "/"; original != folder {
		return []string{folder, original}
	}
	return []string{folder}
}

func (t *s3Target) keys(identifier string) []string {
	keys := []string{}
	for _, folder := range t.folders() {
		keys = append(keys, folder+identifier)
	}
	return keys
}

func (t *s3Target) Setup(context.Context) error {
	return nil
}

func (t *s3Target) Save(ctx context.Context, identifier, source string) (Item, error) {
	if !ValidIdentifier(identifier) {
		return Item{}, ErrNotFound
	}
	client, err := t.client(ctx)
	if err != nil {
		return Item{}, fmt.Errorf("%w: %w", ErrSave, err)
	}
	file, err := os.Open(source)
	if err != nil {
		return Item{}, fmt.Errorf("%w: %w", ErrSave, err)
	}
	defer file.Close()
	info, err := file.Stat()
	if err != nil {
		return Item{}, fmt.Errorf("%w: %w", ErrSave, err)
	}

	uploader := manager.NewUploader(client, func(u *manager.Uploader) {
		u.PartSize = s3PartSize
		u.Concurrency = s3Concurrency
	})
	if _, err := uploader.Upload(ctx, &s3.PutObjectInput{
		Bucket: aws.String(t.settings.Bucket),
		Key:    aws.String(t.keys(identifier)[0]),
		Body:   file,
	}); err != nil {
		return Item{}, fmt.Errorf("%w: upload: %w", ErrSave, err)
	}

	return Item{Identifier: identifier, Name: identifier, CreatedAt: time.Now().Unix(), Size: info.Size()}, nil
}

func (t *s3Target) Delete(ctx context.Context, identifier string) error {
	if !ValidIdentifier(identifier) {
		return ErrNotFound
	}
	client, err := t.client(ctx)
	if err != nil {
		return fmt.Errorf("%w: %w", ErrDelete, err)
	}
	for _, key := range t.keys(identifier) {
		if _, err := client.DeleteObject(ctx, &s3.DeleteObjectInput{
			Bucket: aws.String(t.settings.Bucket),
			Key:    aws.String(key),
		}); err != nil {
			return fmt.Errorf("%w: %w", ErrDelete, err)
		}
	}
	return nil
}

func (t *s3Target) Open(ctx context.Context, identifier string) (io.ReadCloser, int64, error) {
	if !ValidIdentifier(identifier) {
		return nil, 0, ErrNotFound
	}
	client, err := t.client(ctx)
	if err != nil {
		return nil, 0, fmt.Errorf("%w: %w", ErrOpen, err)
	}
	for _, key := range t.keys(identifier) {
		output, err := client.GetObject(ctx, &s3.GetObjectInput{
			Bucket: aws.String(t.settings.Bucket),
			Key:    aws.String(key),
		})
		var noSuchKey *types.NoSuchKey
		if errors.As(err, &noSuchKey) {
			continue
		}
		if err != nil {
			return nil, 0, fmt.Errorf("%w: download: %w", ErrOpen, err)
		}
		return output.Body, aws.ToInt64(output.ContentLength), nil
	}
	return nil, 0, ErrNotFound
}

// Lists every page (the original stopped at 1000 keys) and only objects
// directly under the prefix.
func (t *s3Target) List(ctx context.Context) ([]Item, error) {
	client, err := t.client(ctx)
	if err != nil {
		return nil, fmt.Errorf("%w: %w", ErrList, err)
	}

	items := []Item{}
	seen := map[string]bool{}
	for _, folder := range t.folders() {
		paginator := s3.NewListObjectsV2Paginator(client, &s3.ListObjectsV2Input{
			Bucket: aws.String(t.settings.Bucket),
			Prefix: aws.String(folder),
		})
		for paginator.HasMorePages() {
			page, err := paginator.NextPage(ctx)
			if err != nil {
				return nil, fmt.Errorf("%w: %w", ErrList, err)
			}
			for _, object := range page.Contents {
				name := strings.TrimPrefix(aws.ToString(object.Key), folder)
				if name == "" || strings.Contains(name, "/") || seen[name] {
					continue
				}
				seen[name] = true
				item := Item{Identifier: name, Name: name, Size: aws.ToInt64(object.Size)}
				if object.LastModified != nil {
					item.CreatedAt = object.LastModified.Unix()
				}
				items = append(items, item)
			}
		}
	}
	sortNewestFirst(items)
	return items, nil
}
