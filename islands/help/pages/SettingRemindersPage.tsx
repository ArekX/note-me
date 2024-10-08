export default function SettingRemindersPage() {
    return (
        <div>
            <h1>Setting Reminders</h1>

            <p>
                You can set reminders for notes by clicking on the reminders
                either in the sidebar menu or in the top right menu of the note.
                Reminders can be set on your own notes and notes shared with
                you.
            </p>

            <p>
                There are two types of reminders: one-time reminders and
                recurring reminders. One-time reminders will send you a
                notification at the specified time. Recurring reminders will
                send you notifications at specified intervals for a set amount
                of times.
            </p>

            <p>
                You can also choose to set a one-time reminder from a predefined
                set of options like "In 5 minutes", "In 1 hour", "Tomorrow",
                etc.
            </p>

            <p>
                You can see your set reminders in the sideber by clicking on the
                "Notes" section and choosing "Reminders" from the dropdown. This
                view will show all your currently set reminders.
            </p>

            <p>
                Reminders which are passed are shown in notifications and in the
                home page of NoteMe in "Passed reminders" section.
            </p>
        </div>
    );
}
