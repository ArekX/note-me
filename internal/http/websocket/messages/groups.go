package messages

const (
	GroupsCreate    = "createGroup"
	GroupsUpdate    = "updateGroup"
	GroupsDelete    = "deleteGroup"
	GroupsGetSingle = "getSingleGroup"

	GroupsCreateResponse    = "createGroupResponse"
	GroupsUpdateResponse    = "updateGroupResponse"
	GroupsDeleteResponse    = "deleteGroupResponse"
	GroupsDeleteProgress    = "deleteGroupProgress"
	GroupsGetSingleResponse = "getSingleGroupResponse"
)

type CreateGroup struct {
	Header
	Data AddGroupRequest `json:"data"`
}

type CreateGroupResponse struct {
	Header
	Record GroupRecord `json:"record"`
}

type UpdateGroup struct {
	Header
	ID   int64              `json:"id"`
	Data UpdateGroupRequest `json:"data"`
}

type UpdateGroupResponse struct {
	Header
	UpdatedID   int64              `json:"updated_id"`
	UpdatedData UpdateGroupRequest `json:"updated_data"`
}

type DeleteGroup struct {
	Header
	ID int64 `json:"id"`
}

type DeleteGroupResponse struct {
	Header
	DeletedID int64 `json:"deleted_id"`
}

type DeleteGroupProgress struct {
	Header
	DeletedID    int64 `json:"deleted_id"`
	DeletedCount int   `json:"deleted_count"`
}

type GetSingleGroup struct {
	Header
	ID int64 `json:"id"`
}

type GetSingleGroupResponse struct {
	Header
	Record *GroupRecord `json:"record"`
}
