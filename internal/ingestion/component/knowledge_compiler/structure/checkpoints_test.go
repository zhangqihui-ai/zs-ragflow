package structure

import (
	"context"
	"encoding/json"
	"errors"
	"testing"
	"time"

	"ragflow/internal/ingestion/component/knowledge_compiler/common"
)

type checkpointMemory map[string]string

func (m checkpointMemory) GetObj(_ context.Context, key string, dest any) bool {
	value, ok := m[key]
	return ok && json.Unmarshal([]byte(value), dest) == nil
}

func (m checkpointMemory) SetNX(_ context.Context, key, value string, _ time.Duration) (bool, error) {
	if _, ok := m[key]; ok {
		return false, nil
	}
	m[key] = value
	return true, nil
}

type checkpointEmbedder struct {
	hashEmbedder
	calls int
	fail  bool
}

func (e *checkpointEmbedder) Encode(ctx context.Context, texts []string) ([][]float32, error) {
	e.calls++
	if e.fail {
		return nil, errors.New("embedding unavailable")
	}
	return e.hashEmbedder.Encode(ctx, texts)
}

func TestGraphCheckpointsReuseCompletedStages(t *testing.T) {
	ctx := context.Background()
	chat := &graphChat{}
	embed := &checkpointEmbedder{hashEmbedder: hashEmbedder{dim: 16}, fail: true}
	deps := common.Deps{
		Chat: chat, Embed: embed, TenantID: "tenant", DatasetID: "dataset",
		GraphCheckpoints: checkpointMemory{}, GraphModelIdentity: "chat/embedding",
	}
	param := testParam()
	inputs := common.Inputs{
		DocID:           "doc",
		Chunks:          []common.Chunk{{ID: "c1", Text: "Alpha is a Beta."}},
		VariantSpecific: map[string]any{"parser_config": graphParserConfig()},
	}
	if _, err := Run(ctx, deps, param, inputs); err == nil {
		t.Fatal("expected embedding failure")
	}
	nodeCalls, edgeCalls := chat.nodeCalls, chat.edgeCalls
	if nodeCalls != 1 || edgeCalls != 1 {
		t.Fatalf("initial calls: nodes=%d edges=%d", nodeCalls, edgeCalls)
	}
	embed.fail = false
	out, err := Run(ctx, deps, param, inputs)
	if err != nil || len(out.Products) != 3 {
		t.Fatalf("retry produced %d products, err=%v", len(out.Products), err)
	}
	if chat.nodeCalls != nodeCalls || chat.edgeCalls != edgeCalls {
		t.Fatal("retry repeated completed extraction")
	}
	embedCalls := embed.calls
	out, err = Run(ctx, deps, param, inputs)
	if err != nil || len(out.Products) != 3 || embed.calls != embedCalls {
		t.Fatalf("completed retry: products=%d embedding calls=%d err=%v", len(out.Products), embed.calls, err)
	}
	inputs.Chunks[0].Text = "Beta related to Gamma."
	if _, err := Run(ctx, deps, param, inputs); err != nil || chat.nodeCalls != nodeCalls+1 {
		t.Fatalf("changed input failed to invalidate checkpoint: calls=%d err=%v", chat.nodeCalls, err)
	}
}
