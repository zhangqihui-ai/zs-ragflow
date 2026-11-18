package structure

import (
	"fmt"
	"strings"
	"unicode/utf8"

	"ragflow/internal/ingestion/component/knowledge_compiler/common"
)

// Split oversized chunks only for extraction. Keep the source ID and full text
// for evidence offsets, which refer to the chunk stored by the indexer.
func splitOversizedGraphChunks(chunks []common.Chunk, budget int, tok common.Tokenizer) ([]common.Chunk, map[string]string, error) {
	pieces := make([]common.Chunk, 0, len(chunks))
	sources := make(map[string]string)
	for i, chunk := range chunks {
		text := common.FirstNonEmpty(chunk.Text, chunk.Content)
		chunk.Text = text
		if tok.NumTokens(text) <= budget {
			pieces = append(pieces, chunk)
			continue
		}
		chunk.ID = strings.TrimSpace(chunk.ID)
		if chunk.ID == "" {
			chunk.ID = fmt.Sprintf("chunk-%d", i+1)
		}
		sources[chunk.ID] = text
		chunk.Content = ""
		var err error
		pieces, err = appendGraphChunkPieces(pieces, chunk, budget, tok)
		if err != nil {
			return nil, nil, err
		}
	}
	return pieces, sources, nil
}

func appendGraphChunkPieces(pieces []common.Chunk, chunk common.Chunk, budget int, tok common.Tokenizer) ([]common.Chunk, error) {
	if tok.NumTokens(chunk.Text) <= budget {
		return append(pieces, chunk), nil
	}
	middle := len(chunk.Text) / 2
	for middle > 0 && !utf8.RuneStart(chunk.Text[middle]) {
		middle--
	}
	if middle == 0 {
		_, middle = utf8.DecodeRuneInString(chunk.Text)
		if middle == len(chunk.Text) {
			return nil, fmt.Errorf("graph: chunk %q cannot fit source token budget %d", chunk.ID, budget)
		}
	}
	left, right := chunk, chunk
	left.Text, right.Text = chunk.Text[:middle], chunk.Text[middle:]
	pieces, err := appendGraphChunkPieces(pieces, left, budget, tok)
	if err != nil {
		return nil, err
	}
	return appendGraphChunkPieces(pieces, right, budget, tok)
}
