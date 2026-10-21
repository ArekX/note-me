import { day, type MockNote } from "./state";

export const mockNotes = (t: number): MockNote[] => {
    return [
        {
            id: 1,
            title: "NoteMe Go rewrite plan",
            note: `# NoteMe Go rewrite plan

- [x] Scaffold backend and frontend
- [ ] Port websocket API
- [ ] Port note editor

\`\`\`go
func main() {
    fmt.Println("hello")
}
\`\`\`

See {:note-link|2} for the meeting notes.[^1]

[^1]: Mock data only.`,
            is_encrypted: false,
            user_id: 1,
            group_id: 2,
            tags: ["todo", "go", "vue"],
            created_at: t - 20 * day,
            updated_at: t - 3600,
            last_open_at: t - 600,
            is_deleted: false,
            deleted_at: null,
        },
        {
            id: 2,
            title: "Weekly sync 2026-10-06",
            note: `## Agenda

1. Migration status
2. Websocket mock
3. Open questions

| Item | Owner | Status |
| --- | --- | --- |
| Backend scaffold | Aleksandar | done |
| Frontend mock | Aleksandar | in progress |`,
            is_encrypted: false,
            user_id: 1,
            group_id: 3,
            tags: ["todo"],
            created_at: t - 4 * day,
            updated_at: t - 2 * day,
            last_open_at: t - 2 * day,
            is_deleted: false,
            deleted_at: null,
        },
        {
            id: 3,
            title: "Book list",
            note: `- The Go Programming Language
- Designing Data-Intensive Applications
- A Philosophy of Software Design`,
            is_encrypted: false,
            user_id: 1,
            group_id: 4,
            tags: ["reading", "idea"],
            created_at: t - 40 * day,
            updated_at: t - 15 * day,
            last_open_at: t - 5 * day,
            is_deleted: false,
            deleted_at: null,
        },
        {
            id: 4,
            title: "Bank details",
            // Mock encryption of the text; unlock with the mock password.
            note: "mock:IyBCYW5rIGRldGFpbHMKCklCQU46IERFMDAgMDAwMCAwMDAwIDAwMDAgMDAwMCAwMApQSU4gaGludDogYmlydGhkYXkgb2YgdGhlIGNhdA==",
            is_encrypted: true,
            user_id: 1,
            group_id: 4,
            tags: [],
            created_at: t - 30 * day,
            updated_at: t - 30 * day,
            last_open_at: null,
            is_deleted: false,
            deleted_at: null,
        },
        {
            id: 5,
            title: "Old shopping list",
            note: "- milk\n- eggs",
            is_encrypted: false,
            user_id: 1,
            group_id: null,
            tags: [],
            created_at: t - 25 * day,
            updated_at: t - 25 * day,
            last_open_at: null,
            is_deleted: true,
            deleted_at: t - 3 * day,
        },
        {
            id: 6,
            title: "Unsorted thoughts",
            note: "Things I want to look into:\n\n- SQLite WAL tuning\n- Tailwind 4 container queries",
            is_encrypted: false,
            user_id: 1,
            group_id: null,
            tags: ["idea"],
            created_at: t - 2 * day,
            updated_at: t - day,
            last_open_at: t - day,
            is_deleted: false,
            deleted_at: null,
        },
        {
            id: 7,
            title: "Jane's deployment checklist",
            note: "1. Build image\n2. Run migrations\n3. Smoke test",
            is_encrypted: false,
            user_id: 2,
            group_id: null,
            tags: ["todo"],
            created_at: t - 6 * day,
            updated_at: t - 5 * day,
            last_open_at: null,
            is_deleted: false,
            deleted_at: null,
        },
    ];
};
