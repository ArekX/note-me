package validation

import "testing"

type request struct {
	Name     string  `json:"name"`
	Optional *string `json:"optional,omitempty"`
	Count    int     `json:"count"`
}

type nullableRequest struct {
	Name     string  `json:"name" error:"Name is required"`
	ParentID *int64  `json:"parent_id" zod:"nullable" error:"Parent ID is required"`
	Label    *string `json:"label,omitempty" zod:"nullable"`
}

// Expected messages were produced by zod 4 for the equivalent strict schema.
func TestDecode(t *testing.T) {
	tests := map[string]string{
		`{"name":"a","count":1}`:                `null`,
		`{"name":"a","count":1,"optional":"x"}`: `null`,
		`"str"`:                                 `[{"code":"invalid_type","path":[],"message":"Invalid input: expected object, received string"}]`,
		`null`:                                  `[{"code":"invalid_type","path":[],"message":"Invalid input: expected object, received null"}]`,
		`{"name":5}`:                            `[{"code":"invalid_type","path":["name"],"message":"Invalid input: expected string, received number"},{"code":"invalid_type","path":["count"],"message":"Invalid input: expected number, received undefined"}]`,
		`{"name":"a","count":1,"x":1}`:          `[{"code":"unrecognized_keys","path":[],"message":"Unrecognized key: \"x\""}]`,
		`{"name":"a","count":1,"y":true,"x":false}`: `[{"code":"unrecognized_keys","path":[],"message":"Unrecognized keys: \"x\", \"y\""}]`,
		`{"name":null,"count":1}`:                   `[{"code":"invalid_type","path":["name"],"message":"Invalid input: expected string, received null"}]`,
		`{"name":"a","count":1,"optional":null}`:    `[{"code":"invalid_type","path":["optional"],"message":"Invalid input: expected string, received null"}]`,
	}

	for input, want := range tests {
		var dst request
		issues := Decode([]byte(input), &dst)
		got := "null"
		if len(issues) > 0 {
			got = issues.Error()
		}
		if got != want {
			t.Errorf("Decode(%s)\n got  %s\n want %s", input, got, want)
		}
	}
}

// Expected messages were produced by zod 4 for the group schemas in
func TestDecodeNullableAndCustomError(t *testing.T) {
	tests := map[string]string{
		`{"name":"a","parent_id":null}`:           `null`,
		`{"name":"a","parent_id":1,"label":null}`: `null`,
		`{}`:                            `[{"code":"invalid_type","path":["name"],"message":"Name is required"},{"code":"invalid_type","path":["parent_id"],"message":"Parent ID is required"}]`,
		`{"name":null,"parent_id":"x"}`: `[{"code":"invalid_type","path":["name"],"message":"Name is required"},{"code":"invalid_type","path":["parent_id"],"message":"Parent ID is required"}]`,
		`{"name":"a","parent_id":null,"label":false}`: `[{"code":"invalid_type","path":["label"],"message":"Invalid input: expected string, received boolean"}]`,
	}

	for input, want := range tests {
		var dst nullableRequest
		issues := Decode([]byte(input), &dst)
		got := "null"
		if len(issues) > 0 {
			got = issues.Error()
		}
		if got != want {
			t.Errorf("Decode(%s)\n got  %s\n want %s", input, got, want)
		}
	}
}

func TestMinLength(t *testing.T) {
	var issues Issues
	issues.MinLength("a", "", 1, "")
	issues.MinLength("b", "short", 8, "Password must have at least 8 characters")
	issues.MinLength("c", "🙂🙂🙂🙂", 8, "counted as UTF-16")
	issues.MinLength("d", "12345678", 8, "not added")

	want := `[{"code":"too_small","path":["a"],"message":"Too small: expected string to have >=1 characters"},` +
		`{"code":"too_small","path":["b"],"message":"Password must have at least 8 characters"}]`
	if issues.Error() != want {
		t.Errorf("issues = %s", issues.Error())
	}
}

func TestMaxLength(t *testing.T) {
	var issues Issues
	issues.MaxLength("a", "abc", 2, "")
	issues.MaxLength("b", "🙂", 1, "Group name must be at most 1 characters long")
	issues.MaxLength("c", "ab", 2, "not added")

	want := `[{"code":"too_big","path":["a"],"message":"Too big: expected string to have <=2 characters"},` +
		`{"code":"too_big","path":["b"],"message":"Group name must be at most 1 characters long"}]`
	if issues.Error() != want {
		t.Errorf("issues = %s", issues.Error())
	}
}
