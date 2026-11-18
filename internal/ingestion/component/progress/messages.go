package progress

import (
	"context"
	"fmt"
	"sync"
	"time"

	"ragflow/internal/agent/runtime"
)

// Reporter emits bounded, ordered detail messages for concurrent work. It
// reports the first update, each ten-percent milestone, slow-work updates at
// most every five seconds, and completion, without changing numeric progress.
type Reporter struct {
	mu        sync.Mutex
	ctx       context.Context
	component string
	stage     string
	startedAt time.Time
	lastAt    time.Time
	lastDone  int
	lastStep  int
	now       func() time.Time
}

// NewReporter creates a run-scoped detail reporter for a counted stage.
func NewReporter(ctx context.Context, component, stage string) *Reporter {
	return &Reporter{ctx: ctx, component: component, stage: stage, startedAt: time.Now(), lastDone: -1, now: time.Now}
}

func (r *Reporter) Report(done, total int) {
	if total <= 0 || done < 0 || r.ctx.Err() != nil {
		return
	}
	r.mu.Lock()
	defer r.mu.Unlock()
	if r.ctx.Err() != nil {
		return
	}
	done = min(done, total)
	if done <= r.lastDone {
		return
	}
	now := r.now()
	step := int(float64(done) / float64(total) * 10)
	if r.lastDone >= 0 && done < total && step <= r.lastStep && now.Sub(r.lastAt) < 5*time.Second {
		return
	}
	r.lastDone, r.lastStep, r.lastAt = done, step, now
	runtime.ReportProgressMessage(r.ctx, r.component, fmt.Sprintf("%s: %d/%d (%.0f%%), elapsed=%s", r.stage, done, total, float64(done)/float64(total)*100, now.Sub(r.startedAt).Round(time.Millisecond)))
}
