package structure

import (
	"context"
	"crypto/sha256"
	"encoding/json"
	"fmt"
	"time"

	"ragflow/internal/ingestion/component/knowledge_compiler/common"
)

const graphCheckpointTTL = 7 * 24 * time.Hour

type graphCheckpoints struct {
	store  common.CheckpointStore
	prefix string
}

type extractedBatch struct {
	Nodes    []map[string]any
	Edges    []map[string]any
	BatchIDs []string
}

func newGraphCheckpoints(deps common.Deps, param common.Param, cfg CompileConfig, docID string, batches [][]common.Chunk, nodePrompt, edgePrompt string) (graphCheckpoints, error) {
	if cfg.Type != TypeHypergraph || deps.GraphCheckpoints == nil || deps.GraphModelIdentity == "" ||
		deps.TenantID == "" || deps.DatasetID == "" || docID == "" {
		return graphCheckpoints{}, nil
	}
	fingerprint := sha256.New()
	encoder := json.NewEncoder(fingerprint)
	if err := encoder.Encode([]any{
		deps.TenantID, deps.DatasetID, docID, deps.GraphModelIdentity,
		cfg, param.ChatSettings, param.SimilarityThreshold, deps.ModelContextLen, deps.ModelMaxOutput,
		nodePrompt, edgePrompt,
	}); err != nil {
		return graphCheckpoints{}, fmt.Errorf("graph checkpoint fingerprint: %w", err)
	}
	for _, batch := range batches {
		text, _ := PackBatch(batch)
		if err := encoder.Encode(text); err != nil {
			return graphCheckpoints{}, fmt.Errorf("graph checkpoint batch fingerprint: %w", err)
		}
	}
	return graphCheckpoints{
		store:  deps.GraphCheckpoints,
		prefix: fmt.Sprintf("ragflow:graph-checkpoint:v1:%x:", fingerprint.Sum(nil)),
	}, nil
}

func (c graphCheckpoints) load(ctx context.Context, stage string, value any) bool {
	return c.store != nil && c.store.GetObj(ctx, c.prefix+stage, value)
}

func (c graphCheckpoints) save(ctx context.Context, stage string, value any) error {
	if c.store == nil {
		return nil
	}
	data, err := json.Marshal(value)
	if err == nil {
		_, err = c.store.SetNX(ctx, c.prefix+stage, string(data), graphCheckpointTTL)
	}
	if err != nil {
		return fmt.Errorf("save graph checkpoint %s: %w", stage, err)
	}
	return nil
}

func (c graphCheckpoints) mergePair(ctx context.Context, chat common.ChatInvoker, llmID, existing, incoming string) (map[string]any, error) {
	if c.store == nil {
		return mergePair(ctx, chat, llmID, existing, incoming)
	}
	hash := sha256.New()
	fmt.Fprintf(hash, "%d:%s%s", len(existing), existing, incoming)
	key := fmt.Sprintf("merge:%x", hash.Sum(nil))
	var result map[string]any
	if c.load(ctx, key, &result) {
		return result, nil
	}
	result, err := mergePair(ctx, chat, llmID, existing, incoming)
	if err != nil {
		return nil, err
	}
	if err := c.save(ctx, key, result); err != nil {
		return nil, err
	}
	return result, nil
}
