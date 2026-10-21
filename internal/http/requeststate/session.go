package requeststate

import (
	"encoding/json"
	"fmt"

	"noteme/internal/components/repository"
)

const StepPasswordReset = "password_reset"

type Session struct {
	UserId                  int    `json:"user_id"`
	Username                string `json:"username"`
	Name                    string `json:"name"`
	Timezone                string `json:"timezone"`
	IsPasswordResetRequired bool   `json:"is_password_reset_required"`
	Role                    string `json:"role"`
	CreatedAt               int    `json:"created_at"`
	UpdatedAt               int    `json:"updated_at"`
}

func NewSession(record *repository.UserLoginRecord) *Session {
	return &Session{
		UserId:                  record.Id,
		Username:                record.Username,
		Name:                    record.Name,
		Timezone:                record.Timezone,
		IsPasswordResetRequired: record.IsPasswordResetRequired,
		Role:                    record.Role,
		CreatedAt:               int(record.CreatedAt),
		UpdatedAt:               int(record.UpdatedAt),
	}
}

func (s *Session) RequiredSteps() []string {
	steps := []string{}
	if s.IsPasswordResetRequired {
		steps = append(steps, StepPasswordReset)
	}
	return steps
}

func (s *Session) ToJson() ([]byte, error) {
	result, err := json.Marshal(s)

	if err != nil {
		return nil, err
	}

	return result, nil
}

func SessionFromJson(jsonData []byte) (*Session, error) {
	s := &Session{}

	if err := json.Unmarshal(jsonData, s); err != nil {
		return nil, fmt.Errorf("decode session: %w", err)
	}

	return s, nil
}
