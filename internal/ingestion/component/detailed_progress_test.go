package component

import (
	"context"
	"strings"
	"testing"

	"ragflow/internal/agent/runtime"
	"ragflow/internal/ingestion/component/progress"
	"ragflow/internal/ingestion/component/schema"
	"ragflow/internal/parser/parser"
)

func TestParserDetailedProgress(t *testing.T) {
	var messages []string
	ctx := runtime.WithProgressMessageCallback(t.Context(), func(_, message string) { messages = append(messages, message) })
	comp, err := NewParserComponent(nil)
	if err != nil {
		t.Fatal(err)
	}
	out, err := comp.Invoke(ctx, nil, map[string]any{"name": "notes.txt", "binary": []byte("Project knowledge base development notes.")})
	if err != nil || out == nil {
		t.Fatalf("parse result: %v %v", out, err)
	}
	for _, want := range []string{"Reading source file", "Parsing source: format=txt", "Parsing finished:"} {
		if !strings.Contains(strings.Join(messages, "\n"), want) {
			t.Errorf("missing %q in %v", want, messages)
		}
	}
}

func TestAttachPDFPageProgressDetailedMessages(t *testing.T) {
	var messages []string
	ctx := runtime.WithProgressMessageCallback(t.Context(), func(_, message string) { messages = append(messages, message) })
	pdf := parser.NewPDFParser()
	attachPDFPageProgress(ctx, pdf, progress.Window{Span: 1})
	pdf.OnPageDone(1, 10)
	pdf.OnPageDone(10, 10)
	if len(messages) != 2 || !strings.Contains(messages[0], "1/10") || !strings.Contains(messages[1], "10/10 (100%)") {
		t.Fatalf("missing PDF page detail: %v", messages)
	}
}

func TestEmbedChunksDetailedProgress(t *testing.T) {
	t.Setenv("TOKENIZER_EMBEDDING_BATCH_SIZE", "2")
	var messages []string
	ctx := runtime.WithProgressMessageCallback(t.Context(), func(_, message string) { messages = append(messages, message) })
	stub := newStubEmbedder(2)
	comp, err := NewTokenizerComponentWithResolver(nil, func(_ context.Context, _, _ string) (Embedder, string, error) { return stub, "test-embedding", nil })
	if err != nil {
		t.Fatal(err)
	}
	tokenizer := comp.(*TokenizerComponent)
	tokenizer.param.Fields = []string{"text"}
	chunks := []schema.ChunkDoc{chunkWithID("one", "first"), chunkWithID("two", "second"), chunkWithID("three", "third")}
	if _, _, err := tokenizer.embedChunks(ctx, "tenant", "kb", "notes.txt", chunks, newMemCacheStore()); err != nil {
		t.Fatal(err)
	}
	for _, want := range []string{"input_chunks=3, cached=0, pending=3", "Embedding document title started", "2/3", "3/3 (100%)"} {
		if !strings.Contains(strings.Join(messages, "\n"), want) {
			t.Errorf("missing %q in %v", want, messages)
		}
	}
}
