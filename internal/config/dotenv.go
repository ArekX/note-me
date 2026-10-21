package config

import (
	"errors"
	"os"

	"github.com/joho/godotenv"
)

// godotenv never overrides a set variable, so the process environment wins
// over .env, which wins over .env.defaults.
func LoadEnvironment() error {
	if os.Getenv("SKIP_ENV") == "1" {
		return nil
	}

	for _, file := range []string{".env", ".env.defaults"} {
		if err := godotenv.Load(file); err != nil && !errors.Is(err, os.ErrNotExist) {
			return err
		}
	}

	return nil
}
