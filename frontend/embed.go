package frontend

import (
	"embed"
	"io/fs"
)

// all: keeps the committed dist/.gitkeep so the package compiles before the
// first frontend build (make build-frontend).
//
//go:embed all:dist
var dist embed.FS

func Dist() (fs.FS, error) {
	return fs.Sub(dist, "dist")
}
