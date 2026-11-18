package service

import (
	"strings"
	"testing"

	agentruntime "ragflow/internal/agent/runtime"
	"ragflow/internal/dao"
	"ragflow/internal/entity"
	"ragflow/internal/ingestion/component"
	"ragflow/internal/ingestion/pipeline"
	"ragflow/internal/ingestion/testutil"
	servicepkg "ragflow/internal/service"
)

func TestProgressSinkPersistsParserDetailsWithoutChangingLifecycleProgress(t *testing.T) {
	db := testutil.SetupTestDB(t)
	cleanup := testutil.ReplaceDBForTest(t, db)
	defer cleanup()
	_, _, docID, taskID := testutil.SeedTestData(t, db, testutil.WithPipelineID("flow-1"))
	sink := newProgressSink(t.Context(), servicepkg.NewIngestionTaskService(), "run-details")
	defer sink.Close()
	ctx := agentruntime.WithProgressMessageCallback(t.Context(), func(component, message string) {
		sink.OnComponentMessage(t.Context(), taskID, docID, component, message)
	})
	sink.OnComponentTotal(ctx, taskID, 1)
	sink.OnComponentProgress(ctx, pipeline.ProgressEvent{TaskID: taskID, DocumentID: docID, Component: "Parser", Phase: 0, Message: "Parser Started"})
	parser, err := component.NewParserComponent(nil)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := parser.Invoke(ctx, db, map[string]any{"name": "notes.txt", "binary": []byte("Knowledge base parser detail verification.")}); err != nil {
		t.Fatal(err)
	}
	sink.OnComponentProgress(ctx, pipeline.ProgressEvent{TaskID: taskID, DocumentID: docID, Component: "Parser", Phase: 1, Message: "Parser Done"})
	sink.Close()
	events, err := dao.NewIngestionTaskLogDAO().ListLogsByPipelineLogID(ctx, db, "run-details")
	if err != nil {
		t.Fatal(err)
	}
	lifecycle, messages := 0, 0
	finished := false
	for _, event := range events {
		switch event.EventType {
		case dao.EventTypeLifecycle:
			lifecycle++
		case dao.EventTypeMessage:
			messages++
		}
		finished = finished || strings.Contains(event.Message, "Parser: Parsing finished:")
	}
	if lifecycle != 2 || messages < 3 || !finished {
		t.Fatalf("lifecycle=%d messages=%d finished=%t events=%+v", lifecycle, messages, finished, events)
	}
	var doc entity.Document
	if err := db.Take(&doc, "id = ?", docID).Error; err != nil {
		t.Fatal(err)
	}
	if doc.Progress != 1 {
		t.Fatalf("progress=%v, want 1", doc.Progress)
	}
}
