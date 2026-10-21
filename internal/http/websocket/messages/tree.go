package messages

const (
	TreeGet         = "getTree"
	TreeGetResponse = "getTreeResponse"
)

type GetTree struct {
	Header
	ParentID *int64 `json:"parent_id,omitempty"`
	ItemType string `json:"item_type,omitempty"` // note | group
}

type GetTreeResponse struct {
	Header
	Records  []TreeRecord `json:"records"`
	ParentID *int64       `json:"parent_id,omitempty"`
}
