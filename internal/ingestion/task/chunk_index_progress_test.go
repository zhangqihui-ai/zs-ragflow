package task

import (
	"context"
	"errors"
	"strings"
	"testing"

	"ragflow/internal/agent/runtime"
)

func TestChunkIndexWriterDetailedProgressAndRetry(t *testing.T) {
	var messages []string
	ctx := runtime.WithProgressMessageCallback(t.Context(), func(component, message string) {
		if component != "Indexer" {
			t.Errorf("component = %q", component)
		}
		messages = append(messages, message)
	})
	calls := 0
	writer := newChunkIndexWriter(func(context.Context, []map[string]any, string, string) ([]string, error) {
		calls++
		if calls == 1 {
			return nil, errors.New("temporary index failure")
		}
		return nil, nil
	}, "base", "kb", 2)
	if err := writer.Write(ctx, []map[string]any{{"id": "1"}, {"id": "2"}, {"id": "3"}}); err != nil {
		t.Fatal(err)
	}
	if calls != 3 {
		t.Fatalf("calls=%d, want 3", calls)
	}
	for _, want := range []string{"Chunks written to search index: 0/3", "[WARN] Retrying search index batch 1-2: attempt=2/3", "Chunks written to search index: 2/3", "Chunks written to search index: 3/3 (100%)"} {
		if !strings.Contains(strings.Join(messages, "\n"), want) {
			t.Errorf("missing %q in %v", want, messages)
		}
	}
}
