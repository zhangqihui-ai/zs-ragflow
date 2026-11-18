package dao

import (
	"context"
	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
	"ragflow/internal/entity"
	"testing"
)

func TestDocumentParsingSummaries(t *testing.T) {
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		t.Fatal(err)
	}
	if err = db.AutoMigrate(&entity.Document{}, &entity.IngestionTask{}); err != nil {
		t.Fatal(err)
	}
	add := func(id, kb, status string, deleted bool) {
		t.Helper()
		active := "1"
		if deleted {
			active = "0"
		}
		doc := entity.Document{ID: id, KbID: kb, Status: &active, ParserConfig: entity.JSONMap{}}
		if err := db.Create(&doc).Error; err != nil {
			t.Fatal(err)
		}
		if status != "" {
			task := entity.IngestionTask{ID: id, DocumentID: id, DatasetID: kb, Status: status}
			if err := db.Create(&task).Error; err != nil {
				t.Fatal(err)
			}
		}
	}
	add("ready", "kb-ready", "COMPLETED", false)
	add("running", "kb-running", "RUNNING", false)
	add("failed-mixed", "kb-running", "FAILED", false)
	add("failed", "kb-failed", "FAILED", false)
	add("pending", "kb-pending", "", false)
	add("stopped", "kb-pending", "STOPPED", false)
	add("deleted", "kb-ready", "FAILED", true)
	add("outside", "kb-outside", "RUNNING", false)
	add("queued", "kb-queued", "SCHEDULED", false)
	summaries, err := NewDocumentDAO().ParsingSummaries(context.Background(), db, []string{"kb-ready", "kb-running", "kb-failed", "kb-pending", "kb-empty", "kb-queued"})
	if err != nil {
		t.Fatal(err)
	}
	for kb, want := range map[string]string{"kb-ready": "ready", "kb-running": "running", "kb-failed": "failed", "kb-pending": "pending", "kb-empty": "empty", "kb-queued": "running"} {
		if summaries[kb].Status != want {
			t.Errorf("%s=%+v, want %s", kb, summaries[kb], want)
		}
	}
	if summaries["kb-ready"].Total != 1 || summaries["kb-running"].Failed != 1 || summaries["kb-pending"].Pending != 2 {
		t.Fatalf("incorrect counts: %+v", summaries)
	}
	if _, exists := summaries["kb-outside"]; exists {
		t.Fatal("query returned a dataset outside the visible IDs")
	}
	empty, err := NewDocumentDAO().ParsingSummaries(context.Background(), db, nil)
	if err != nil || len(empty) != 0 {
		t.Fatalf("empty page: %v %v", empty, err)
	}
}
