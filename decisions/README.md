# Decisions

Every decision about the rewrite, made by the user or by Claude, gets one
file here: `<number>-<slug>.md`, numbered in order (next free number after
the highest one). Items in `TODO.md` cite decisions by number (`0.9.d`).

Each file starts with the title, who decided (user, Claude, or both and which
part) and the date, followed by the decision, the reason when it is not
obvious, and its consequences. A decision that replaces an earlier one says
so in both files; old files are not deleted.

| #   | Decision |
| --- | -------- |
| 0.1 | [Environment variable names](0.1-environment-variable-names.md) |
| 0.2 | [Migration tracking table compatibility](0.2-migration-tracking-table-compatibility.md) |
| 0.3 | [File storage](0.3-file-storage.md) |
| 0.4 | [Session semantics](0.4-session-semantics.md) (amended by 0.75) |
| 0.5 | [Websocket authentication](0.5-websocket-authentication.md) |
| 0.6 | [Push fan-out](0.6-push-fan-out.md) |
| 0.7 | [Websocket error contract](0.7-websocket-error-contract.md) |
| 0.8 | [Validation error format](0.8-validation-error-format.md) |
| 0.9 | [Original bugs to keep or fix](0.9-original-bugs-to-keep-or-fix.md) |
| 0.10 | [Markdown parser for Vue](0.10-markdown-parser-for-vue.md) (details in 0.35) |
| 0.11 | [Frontend libraries](0.11-frontend-libraries.md) |
| 0.12 | [User steps](0.12-user-steps.md) |
| 0.13 | [Transactions in the repository](0.13-transactions-in-the-repository.md) (amended by 0.62) |
| 0.14 | [Note encryption format v2](0.14-note-encryption-format-v2.md) |
| 0.15 | [Encryption upgrade in noteme-upgrade](0.15-encryption-upgrade-in-noteme-upgrade.md) |
| 0.16 | [Validation helper](0.16-validation-helper.md) (amended by 0.33) |
| 0.17 | [Steps endpoint contract](0.17-steps-endpoint-contract.md) |
| 0.18 | [Session payload](0.18-session-payload.md) |
| 0.19 | [Login has no password length rule](0.19-login-has-no-password-length-rule.md) |
| 0.20 | [First-run bootstrap](0.20-first-run-bootstrap.md) |
| 0.21 | [Host timezone](0.21-host-timezone.md) (replaced by 0.24) |
| 0.22 | [Backend is cross-platform](0.22-backend-is-cross-platform.md) |
| 0.23 | [Reset password page](0.23-reset-password-page.md) |
| 0.24 | [Backend always UTC](0.24-backend-always-utc.md) |
| 0.25 | [Backend comments](0.25-backend-comments.md) |
| 0.26 | [Comment file references stay until the end](0.26-comment-file-references-stay-until-the-end.md) |
| 0.27 | [Websocket heartbeat](0.27-websocket-heartbeat.md) |
| 0.28 | [Websocket core](0.28-websocket-core.md) |
| 0.29 | [Frontend comments](0.29-frontend-comments.md) |
| 0.30 | [Tree drag and drop](0.30-tree-drag-and-drop.md) (amended by 0.36) |
| 0.31 | [Tree store](0.31-tree-store.md) (amended by 0.36) |
| 0.32 | [Group and tree handlers](0.32-group-handlers.md) (amended by 0.41) |
| 0.33 | [Optional and nullable fields in validation](0.33-validation-optional-and-nullable.md) |
| 0.34 | [Note and tag handlers](0.34-note-and-tag-handlers.md) |
| 0.35 | [Markdown pipeline](0.35-markdown-pipeline.md) |
| 0.36 | [Note pages and editor](0.36-note-pages-and-editor.md) |
| 0.37 | [Search](0.37-search.md) |
| 0.38 | [Editor tooling and markdown extensions](0.38-editor-tooling-and-extensions.md) |
| 0.39 | [Recycle bin](0.39-recycle-bin.md) (amended by 0.40) |
| 0.40 | [Event bus](0.40-event-bus.md) (amended by 0.41) |
| 0.41 | [One package per websocket namespace](0.41-namespace-packages.md) |
| 0.42 | [Protected notes](0.42-protected-notes.md) |
| 0.43 | [Note history](0.43-note-history.md) |
| 0.44 | [Tags management](0.44-tags-management.md) |
| 0.45 | [Reminders and notifications](0.45-reminders-and-notifications.md) (amended by 0.77) |
| 0.46 | [Sharing](0.46-sharing.md) (amended by 0.77) |
| 0.47 | [Profile](0.47-profile.md) |
| 0.48 | [Files](0.48-files.md) |
| 0.49 | [Passkeys rewrite](0.49-passkeys-rewrite.md) |
| 0.50 | [Passkey security](0.50-passkey-security.md) |
| 0.51 | [Login rate limit](0.51-login-rate-limit.md) (amended by 0.71) |
| 0.52 | [Table changes through new migrations](0.52-new-migrations.md) (superseded by 0.61) |
| 0.53 | [Data export and import](0.53-data-export-and-import.md) |
| 0.54 | [User management](0.54-user-management.md) (revival replaced by 0.72) |
| 0.55 | [Periodic tasks](0.55-periodic-tasks.md) (amended by 0.76, 0.78 and 0.90) |
| 0.56 | [Backups](0.56-backups.md) (amended by 0.73) |
| 0.57 | [Database holds file metadata only](0.57-file-metadata-only.md) |
| 0.58 | [Help and onboarding](0.58-help-and-onboarding.md) |
| 0.59 | [Error pages and layout check](0.59-error-pages.md) |
| 0.60 | [Finish line](0.60-finish-line.md) |
| 0.61 | [One migration with the whole v2 schema](0.61-single-schema-migration.md) |
| 0.62 | [Repository interface and database drivers](0.62-repository-interface-and-drivers.md) |
| 0.63 | [Parity bugs](0.63-parity-bugs.md) |
| 0.64 | [Design lab](0.64-design-lab.md) |
| 0.65 | [Redesign applied: icon rail in Aurora night](0.65-redesign-applied.md) |
| 0.66 | [PWA support](0.66-pwa.md) |
| 0.67 | [No mock mode; the mock backend is test-only](0.67-no-mock-mode.md) |
| 0.68 | [Frontend component refactor](0.68-frontend-component-refactor.md) |
| 0.69 | [PostgreSQL and MySQL support](0.69-postgres-and-mysql.md) |
| 0.70 | [Security review fixes](0.70-security-review-fixes.md) |
| 0.71 | [Argon2id passwords and the password attempt lock](0.71-argon2id-passwords-and-password-lock.md) |
| 0.72 | [Users are deleted for good](0.72-users-are-deleted-for-good.md) |
| 0.73 | [Backup encryption and the local backup root](0.73-backup-encryption-and-local-root.md) |
| 0.74 | [Audit log and server log](0.74-audit-log-and-server-log.md) |
| 0.75 | [Session lifecycle on websockets, shutdown and connection limits](0.75-session-lifecycle-on-websockets.md) |
| 0.76 | [Unique constraints and insert-or-ignore](0.76-unique-constraints.md) |
| 0.77 | [Protected notes are never shared; reminders follow shares](0.77-protected-notes-never-shared.md) |
| 0.78 | [Skeleton loaders, upload dialog and periodic task runs](0.78-skeletons-upload-dialog-task-runs.md) |
| 0.79 | [Admin help topics](0.79-admin-help-topics.md) |
| 0.80 | [Wide or normal width per note](0.80-note-width.md) |
| 0.81 | [Editor toolbar replaces the insert dialog](0.81-editor-toolbar.md) |
| 0.82 | [Audio and video players, file double-click, dialog sizes](0.82-media-players-and-editor-fixes.md) |
| 0.83 | [AI assistant](0.83-ai-assistant.md) (amended by 0.90) |
| 0.84 | [MCP server](0.84-mcp-server.md) |
| 0.85 | [Live updates from every source](0.85-live-updates.md) |
| 0.86 | [Rich note editor](0.86-rich-note-editor.md) |
| 0.87 | [Media alignment](0.87-media-alignment.md) |
| 0.88 | [One file browser with grid and list views](0.88-file-views.md) |
| 0.89 | [Profile picture](0.89-profile-picture.md) |
| 0.90 | [Assistant data export and running a periodic task now](0.90-ai-export-and-run-task-now.md) |
