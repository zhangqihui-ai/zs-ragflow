package structure

import (
	"strings"
	"testing"
	"unicode/utf8"

	"ragflow/internal/ingestion/component/knowledge_compiler/common"
)

func TestGraphBatchTokenLimitPreservesOversizedSource(t *testing.T) {
	tok := graphTokenizer{}
	text := strings.Repeat("刘备遇见诸葛亮。", graphBatchTokenLimit)
	budget := min(structureInputBudget(1048576, 0), graphBatchTokenLimit)
	pieces, originals, err := splitOversizedGraphChunks([]common.Chunk{{ID: "source", Content: text}}, budget, tok)
	if err != nil {
		t.Fatal(err)
	}
	batches := common.PackBatches(pieces, budget, tok)
	if len(batches) < 2 || originals["source"] != text {
		t.Fatalf("got %d batches or lost the original source", len(batches))
	}
	var reconstructed strings.Builder
	for _, batch := range batches {
		tokens := 0
		for _, chunk := range batch {
			if chunk.ID != "source" || !utf8.ValidString(chunk.Text) {
				t.Fatal("invalid fragment source ID or UTF-8")
			}
			tokens += tok.NumTokens(chunk.Text)
			reconstructed.WriteString(chunk.Text)
		}
		if tokens > graphBatchTokenLimit {
			t.Fatalf("batch has %d source tokens", tokens)
		}
	}
	if reconstructed.String() != text {
		t.Fatal("splitting changed the original text")
	}
}
