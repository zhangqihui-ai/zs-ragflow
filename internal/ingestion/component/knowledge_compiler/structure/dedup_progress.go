package structure

import (
	"context"
	"fmt"
	"time"

	"ragflow/internal/agent/runtime"
	"ragflow/internal/ingestion/component/knowledge_compiler/common"
)

// dedupProgressReporter is owned by the serial document dedup loop. Each
// Chat invocation counts one model call attempt, including GenJSON retries.
type dedupProgressReporter struct {
	chat       common.ChatInvoker
	total      int
	processed  int
	calls      int
	lastCall   time.Duration
	lastReport time.Time
	inFlight   bool
}

func (r *dedupProgressReporter) Chat(ctx context.Context, req common.ChatRequest) (*common.ChatResponse, error) {
	startedAt := time.Now()
	r.calls++
	r.inFlight = true
	r.report(ctx, false)
	resp, err := r.chat.Chat(ctx, req)
	r.lastCall = time.Since(startedAt)
	r.inFlight = false
	r.report(ctx, false)
	return resp, err
}

func (r *dedupProgressReporter) report(ctx context.Context, force bool) {
	now := time.Now()
	if !force && now.Sub(r.lastReport) < 5*time.Second {
		return
	}
	r.lastReport = now
	lastCall := "n/a"
	if r.lastCall > 0 {
		lastCall = r.lastCall.Round(time.Millisecond).String()
	}
	runtime.ReportProgressMessage(ctx, "Compiler", fmt.Sprintf(
		"dedup progress: %d/%d rows processed, %d LLM call(s), last call=%s, call in progress=%t",
		r.processed, r.total, r.calls, lastCall, r.inFlight))
}
