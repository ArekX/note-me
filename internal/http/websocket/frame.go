package websocket

import (
	"encoding/binary"
	"encoding/json"
	"errors"
	"io"

	"github.com/coder/websocket"

	"noteme/internal/http/websocket/messages"
)

// Limits of the original app's websocket reader.
const (
	maxJSONMessageSize   = 1024 * 1024
	maxBinaryMessageSize = 2048 * 1024
)

// Binary frame: [uint16 BE header length][uint32 BE data length][JSON header][data].
const binaryPrefixSize = 6

var (
	errInvalidFrame    = errors.New("Could not parse message properly or over the allowed size.")
	errMessageTooLarge = errors.New("message over the allowed size")
)

type Message struct {
	messages.Header
	JSON       json.RawMessage
	BinaryData []byte
}

func (m Message) Decode(v any) error {
	return json.Unmarshal(m.JSON, v)
}

// Reads at most one byte over the limit. A message is either read to the end
// or errMessageTooLarge is returned and the connection must be closed. On
// failure the returned header carries the request id when one could be read.
func readMessage(typ websocket.MessageType, r io.Reader) (Message, error) {
	limit := maxJSONMessageSize
	if typ == websocket.MessageBinary {
		limit = maxBinaryMessageSize
	}

	data, err := io.ReadAll(io.LimitReader(r, int64(limit)+1))
	if err != nil {
		return Message{}, err
	}
	if len(data) > limit {
		return Message{Header: frameHeader(typ, data)}, errMessageTooLarge
	}

	if typ == websocket.MessageText {
		var header messages.Header
		if err := json.Unmarshal(data, &header); err != nil {
			return Message{}, errInvalidFrame
		}
		return Message{Header: header, JSON: data}, nil
	}

	if len(data) < binaryPrefixSize {
		return Message{}, errInvalidFrame
	}
	headerEnd := binaryPrefixSize + int(binary.BigEndian.Uint16(data[0:2]))
	dataSize := int(binary.BigEndian.Uint32(data[2:6]))
	if headerEnd+dataSize != len(data) {
		return Message{Header: frameHeader(typ, data)}, errInvalidFrame
	}

	var header messages.Header
	if err := json.Unmarshal(data[binaryPrefixSize:headerEnd], &header); err != nil {
		return Message{}, errInvalidFrame
	}

	return Message{
		Header:     header,
		JSON:       data[binaryPrefixSize:headerEnd],
		BinaryData: data[headerEnd:],
	}, nil
}

func frameHeader(typ websocket.MessageType, data []byte) messages.Header {
	var header messages.Header
	if typ == websocket.MessageText {
		_ = json.Unmarshal(data, &header)
		return header
	}

	if len(data) < binaryPrefixSize {
		return header
	}
	end := binaryPrefixSize + int(binary.BigEndian.Uint16(data[0:2]))
	if end <= len(data) {
		_ = json.Unmarshal(data[binaryPrefixSize:end], &header)
	}
	return header
}
