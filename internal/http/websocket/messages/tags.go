package messages

const (
	TagsCreate = "createTag"
	TagsUpdate = "updateTag"
	TagsDelete = "deleteTag"
	TagsFind   = "findTags"

	TagsCreateResponse = "createTagResponse"
	TagsUpdateResponse = "updateTagResponse"
	TagsDeleteResponse = "deleteTagResponse"
	TagsFindResponse   = "findTagsResponse"
)

type CreateTag struct {
	Header
	Data TagRequest `json:"data"`
}

type CreateTagResponse struct {
	Header
	Record TagRecord `json:"record"`
}

type UpdateTag struct {
	Header
	ID   int64            `json:"id"`
	Data UpdateTagRequest `json:"data"`
}

type UpdateTagResponse struct {
	Header
	UpdatedID   int64            `json:"updated_id"`
	UpdatedData UpdateTagRequest `json:"updated_data"`
}

type DeleteTag struct {
	Header
	ID int64 `json:"id"`
}

type DeleteTagResponse struct {
	Header
	DeletedID int64 `json:"deleted_id"`
}

type FindTags struct {
	Header
	Filters FindTagFilters `json:"filters"`
	Page    int            `json:"page"`
}

type FindTagsResponse struct {
	Header
	Records Paged[TagRecord] `json:"records"`
}
