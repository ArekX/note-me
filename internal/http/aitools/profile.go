package aitools

import "noteme/internal/http/websocket/messages"

type updateProfileArgs struct {
	Name            *string `json:"name,omitempty" desc:"New display name"`
	Timezone        *string `json:"timezone,omitempty" desc:"IANA time zone, for example Europe/Berlin"`
	PreferredEditor *string `json:"preferred_editor,omitempty" enum:"rich,source" desc:"Editor a note opens in: rich (formatted text) or source (markdown)"`
}

type addPasskeyArgs struct {
	Name string `json:"name,omitempty" desc:"Name for the new passkey, for example the device"`
}

type passkeyID struct {
	ID int64 `json:"id" desc:"Passkey id from get_passkeys"`
}

// Never a password: the password fields of updateProfile are left out.
// Adding and removing a passkey run in the browser, which always asks the
// user for their password first (decision 0.83). Exporting data runs the
// Export my data button's dialogs in the browser (decision 0.90).
var profileTools = []Tool{
	define[noArguments](Tool{
		Name:        "get_profile",
		Title:       "Profile",
		Description: "Gets the user's name, username, role, time zone and preferred editor.",
		ReadOnly:    true,
		Browser:     true,
	}, nil),
	define(Tool{
		Name:        "update_profile",
		Title:       "Update profile",
		Description: "Changes the user's display name, time zone or preferred editor.",
	}, func(env Env, args updateProfileArgs) (*Call, error) {
		data := map[string]any{"name": env.Session.Name, "timezone": env.Session.Timezone}
		if args.Name != nil {
			data["name"] = *args.Name
		}
		if args.Timezone != nil {
			data["timezone"] = *args.Timezone
		}
		if args.PreferredEditor != nil {
			data["preferred_editor"] = *args.PreferredEditor
		}
		return message(messages.NamespaceUsers, messages.UsersUpdateProfile, messages.UsersUpdateProfileResponse, map[string]any{"data": data})
	}),
	define(Tool{
		Name:        "get_passkeys",
		Title:       "Passkeys",
		Description: "Lists the user's passkeys with their names and when they were last used.",
		ReadOnly:    true,
	}, func(_ Env, _ noArguments) (*Call, error) {
		return message(messages.NamespaceUsers, messages.UsersGetOwnPasskeys, messages.UsersGetOwnPasskeysResponse, map[string]any{"page": 1})
	}),
	define[addPasskeyArgs](Tool{
		Name:        "add_passkey",
		Title:       "Add passkey",
		Description: "Adds a passkey for signing in on this device. The user confirms with their password and then with the device's passkey prompt.",
		Browser:     true,
	}, nil),
	define[noArguments](Tool{
		Name:        "export_my_data",
		Title:       "Export my data",
		Description: "Starts an export of all of the user's notes and files into a ZIP file, as the Export my data button does. The user confirms, enters their password if protection is locked, and downloads the file from the dialog that opens; it can take minutes.",
		Browser:     true,
	}, nil),
	define[passkeyID](Tool{
		Name:        "delete_passkey",
		Title:       "Remove passkey",
		Description: "Removes one of the user's passkeys after they confirm with their password.",
		Browser:     true,
	}, nil),
}
