package timezone

import (
	"time"

	// The distroless runtime image and Windows have no zoneinfo database.
	_ "time/tzdata"
)

func IsValid(name string) bool {
	if name == "UTC" {
		return true
	}
	// LoadLocation also accepts "" and "Local", which are not IANA names.
	if name == "" || name == "Local" {
		return false
	}
	_, err := time.LoadLocation(name)
	return err == nil
}
