package service

import (
	"context"
	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
	"testing"
	"time"
)

func TestDashboardTenantScopeAndUsage(t *testing.T) {
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		t.Fatal(err)
	}
	statements := []string{
		`CREATE TABLE knowledgebase(id TEXT, name TEXT, tenant_id TEXT, status TEXT)`,
		`CREATE TABLE document(id TEXT, kb_id TEXT, suffix TEXT, type TEXT, size INTEGER, status TEXT)`,
		`CREATE TABLE dialog(id TEXT, name TEXT, tenant_id TEXT, status TEXT)`,
		`CREATE TABLE conversation(id TEXT, dialog_id TEXT, create_time INTEGER)`,
		`CREATE TABLE conversation_message(conversation_id TEXT, role TEXT, created_at REAL, usage TEXT, reference TEXT, position INTEGER)`,
		`CREATE TABLE api_4_conversation(id TEXT, dialog_id TEXT, create_time INTEGER, source TEXT)`,
		`CREATE TABLE api_4_conversation_message(conversation_id TEXT, role TEXT, created_at REAL, usage TEXT, reference TEXT, position INTEGER)`,
		`INSERT INTO knowledgebase VALUES('kb-own','Knowledge','tenant-a','1'),('kb-other','Other','tenant-b','1'),('kb-deleted','Deleted','tenant-a','0')`,
		`INSERT INTO document VALUES('d1','kb-own','pdf','pdf',1024,'1'),('d2','kb-other','docx','doc',5000,'1'),('d3','kb-own','pdf','pdf',4096,'0')`,
		`INSERT INTO dialog VALUES('own','Assistant','tenant-a','1'),('other','Other assistant','tenant-b','1')`,
		`INSERT INTO conversation VALUES('s1','own',1735722000000),('s2','other',1735722000000)`,
		`INSERT INTO conversation_message VALUES('s1','user',1735722000,NULL,NULL,0),('s1','assistant',1735722000,'{"prompt_tokens":20,"completion_tokens":5,"total_tokens":25}','{"chunks":[{"kb_id":"kb-own"},{"kb_id":"kb-own"},{"kb_id":"kb-other"}]}',1),('s2','assistant',1735722000,'{"total_tokens":9999}',NULL,1)`,
		`INSERT INTO api_4_conversation VALUES('api-chat','own',1735722000000,'dialog'),('api-agent','own',1735722000000,'agent')`,
		`INSERT INTO api_4_conversation_message VALUES('api-chat','assistant',1735722000,'{"input_tokens":4,"output_tokens":6,"total_tokens":10}',NULL,1),('api-agent','assistant',1735722000,'{"total_tokens":999}',NULL,1)`,
	}
	for _, sql := range statements {
		if err := db.Exec(sql).Error; err != nil {
			t.Fatal(err)
		}
	}
	now := time.Date(2025, 1, 1, 12, 0, 0, 0, time.UTC)
	result, err := loadDashboard(context.Background(), db, "tenant-a", "24h", now)
	if err != nil {
		t.Fatal(err)
	}
	if result.KnowledgeBases != 1 || result.Documents != 1 || result.StorageBytes != 1024 || result.Conversations != 2 || result.Messages != 3 {
		t.Fatalf("inventory or scope: %+v", result)
	}
	if result.TotalTokens != 35 || result.InputTokens != 24 || result.OutputTokens != 11 || result.PeriodTokens != 35 {
		t.Fatalf("usage: %+v", result)
	}
	if len(result.Recall) != 1 || result.Recall[0].Count != 1 || result.Recall[0].ID != "kb-own" {
		t.Fatalf("recalls should deduplicate chunks and exclude foreign KBs: %+v", result.Recall)
	}
	if len(result.Assistants) != 1 || result.Assistants[0].Count != 2 {
		t.Fatalf("assistant ranking: %+v", result.Assistants)
	}
	if len(result.Trend) != 24 || len(result.Daily) != 30 {
		t.Fatal("missing empty buckets")
	}
	var calls int64
	for _, p := range result.Trend {
		calls += p.Calls
		if p.Embedding != nil {
			t.Fatal("unknown embedding history must not be reported as zero")
		}
	}
	if calls != 2 {
		t.Fatalf("calls=%d", calls)
	}
	for _, period := range []string{"7d", "30d"} {
		r, err := loadDashboard(context.Background(), db, "tenant-a", period, now)
		if err != nil || r.PeriodTokens != 35 {
			t.Fatalf("period %s: %+v %v", period, r, err)
		}
	}
	empty, err := loadDashboard(context.Background(), db, "empty", "7d", now)
	if err != nil || empty.TotalTokens != 0 || len(empty.Assistants) != 0 {
		t.Fatalf("empty tenant: %+v %v", empty, err)
	}
	if _, err = loadDashboard(context.Background(), db, "tenant-a", "invalid", now); err == nil {
		t.Fatal("invalid period accepted")
	}
	// Old replies remain in lifetime totals but not in the selected window.
	if err := db.Exec("UPDATE api_4_conversation_message SET created_at = ? WHERE conversation_id = ?", now.AddDate(0, 0, -8).Unix(), "api-chat").Error; err != nil {
		t.Fatal(err)
	}
	window, err := loadDashboard(context.Background(), db, "tenant-a", "7d", now)
	if err != nil || window.TotalTokens != 35 || window.PeriodTokens != 25 {
		t.Fatalf("lifetime/window mismatch: %+v %v", window, err)
	}
}

func TestDashboardUsageTotalsAndInvalidData(t *testing.T) {
	in, out, total, known := dashboardUsage([]byte(`{"total_tokens":42}`))
	if in != 0 || out != 0 || total != 42 || !known {
		t.Fatal("total-only usage lost")
	}
	in, out, total, known = dashboardUsage([]byte(`{"prompt_tokens":8,"completion_tokens":2}`))
	if in != 8 || out != 2 || total != 10 || !known {
		t.Fatal("split usage lost")
	}
	_, _, total, known = dashboardUsage([]byte(`not json`))
	if total != 0 || known {
		t.Fatal("invalid usage counted")
	}
	_, _, total, known = dashboardUsage([]byte(`{"total_tokens":"unknown"}`))
	if total != 0 || known {
		t.Fatal("invalid token values must remain unknown")
	}
}
