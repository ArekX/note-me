package aitools

type helpTopicArgs struct {
	Topic string `json:"topic" desc:"Topic id from list_help_topics"`
}

type openHelpArgs struct {
	Topic string `json:"topic,omitempty" desc:"Topic id from list_help_topics; omit for the first page"`
}

// The help pages live in the browser, which only offers the topics the help
// window shows this user.
var helpTools = []Tool{
	define[noArguments](Tool{
		Name:        "list_help_topics",
		Title:       "Help topics",
		Description: "Lists the topics of NoteMe's help.",
		ReadOnly:    true,
		Browser:     true,
	}, nil),
	define[helpTopicArgs](Tool{
		Name:        "get_help_topic",
		Title:       "Read help",
		Description: "Reads the text of a help topic.",
		ReadOnly:    true,
		Browser:     true,
	}, nil),
	define[openHelpArgs](Tool{
		Name:        "open_help",
		Title:       "Open help",
		Description: "Opens the help window for the user, on a topic.",
		Browser:     true,
	}, nil),
}
