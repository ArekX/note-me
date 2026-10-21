package version

// Overridden at link time: -X noteme/internal/version.<Name>=<value>.
var (
	Version = "dev"
	BuildID = "dev"
	GitSHA  = "unknown"
)

func String() string {
	return Version + " (build " + BuildID + ", " + GitSHA + ")"
}
