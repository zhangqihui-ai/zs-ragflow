package progress

import (
	"context"
	"strings"
	"sync"
	"testing"
	"time"

	"ragflow/internal/agent/runtime"
)

func TestReporterBoundsFastUpdatesAndCompletes(t *testing.T) {
	var messages []string
	ctx := runtime.WithProgressMessageCallback(t.Context(), func(component, message string) {
		if component != "Parser" {
			t.Errorf("component = %q", component)
		}
		messages = append(messages, message)
	})
	reporter := NewReporter(ctx, "Parser", "PDF pages parsed")
	reporter.now = func() time.Time { return reporter.startedAt }
	for done := 0; done <= 1000; done++ {
		reporter.Report(done, 1000)
	}
	reporter.Report(1000, 1000)
	reporter.Report(1001, 1000)
	if len(messages) != 11 || !strings.Contains(messages[0], "0/1000") || !strings.Contains(messages[10], "1000/1000 (100%)") {
		t.Fatalf("unexpected bounded messages: %v", messages)
	}
}

func TestReporterSlowUpdatesAndCancellation(t *testing.T) {
	var messages []string
	ctx, cancel := context.WithCancel(runtime.WithProgressMessageCallback(t.Context(), func(_, message string) { messages = append(messages, message) }))
	defer cancel()
	reporter := NewReporter(ctx, "Parser", "PDF pages parsed")
	now := reporter.startedAt
	reporter.now = func() time.Time { return now }
	reporter.Report(0, 1000)
	now = now.Add(4 * time.Second)
	reporter.Report(1, 1000)
	now = now.Add(time.Second)
	reporter.Report(2, 1000)
	if len(messages) != 2 || !strings.Contains(messages[1], "2/1000") {
		t.Fatalf("slow progress missing: %v", messages)
	}
	cancel()
	reporter.Report(1000, 1000)
	if len(messages) != 2 {
		t.Fatal("reported after cancellation")
	}
}

func TestReporterConcurrentCallbacksRemainOrdered(t *testing.T) {
	var messages []string
	ctx := runtime.WithProgressMessageCallback(t.Context(), func(_, message string) { messages = append(messages, message) })
	reporter := NewReporter(ctx, "Parser", "PDF pages parsed")
	reporter.now = func() time.Time { return reporter.startedAt }
	var wg sync.WaitGroup
	for done := 1; done <= 100; done++ {
		wg.Add(1)
		go func(done int) { defer wg.Done(); reporter.Report(done, 100) }(done)
	}
	wg.Wait()
	if len(messages) > 11 || !strings.Contains(messages[len(messages)-1], "100/100 (100%)") {
		t.Fatalf("bad concurrent reports: %v", messages)
	}
}
