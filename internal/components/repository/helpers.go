package repository

type Paged[T any] struct {
	Results []T
	Total   int
	Page    int
	PerPage int
}
