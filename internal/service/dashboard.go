package service

import (
	"context"
	"encoding/json"
	"fmt"
	"sort"
	"strings"
	"time"

	"gorm.io/gorm"
	"ragflow/internal/dao"
)

type dashboardPoint struct {
	Time         string `json:"time"`
	Calls        int64  `json:"llm"`
	Embedding    *int64 `json:"embedding"`
	Input        int64  `json:"input"`
	Output       int64  `json:"output"`
	Total        int64  `json:"total"`
	Unclassified int64  `json:"unclassified"`
}
type dashboardRank struct {
	ID    string `json:"id"`
	Name  string `json:"name"`
	Count int64  `json:"count"`
}
type dashboardFileType struct {
	Name  string `json:"name"`
	Count int64  `json:"count"`
}

// DashboardResponse contains tenant-scoped inventory and saved chat-message statistics.
type DashboardResponse struct {
	KnowledgeBases     int64               `json:"knowledge_bases"`
	Documents          int64               `json:"documents"`
	Conversations      int64               `json:"conversations"`
	Messages           int64               `json:"messages"`
	StorageBytes       int64               `json:"storage_bytes"`
	TotalTokens        int64               `json:"total_tokens"`
	InputTokens        int64               `json:"input_tokens"`
	OutputTokens       int64               `json:"output_tokens"`
	UnclassifiedTokens int64               `json:"unclassified_tokens"`
	MissingUsage       int64               `json:"missing_usage"`
	PeriodTokens       int64               `json:"period_tokens"`
	Trend              []dashboardPoint    `json:"trend"`
	Daily              []dashboardPoint    `json:"daily"`
	Assistants         []dashboardRank     `json:"assistants"`
	Recall             []dashboardRank     `json:"recall"`
	FileTypes          []dashboardFileType `json:"file_types"`
	UpdatedAt          time.Time           `json:"updated_at"`
}

// GetDashboard reads saved UI/API chat messages; agent conversations are excluded.
// Embedding history is not persisted by the OSS backend, so its series is null.
func (s *StatsService) GetDashboard(ctx context.Context, period string) (*DashboardResponse, error) {
	tenantID, err := requireCurrentTenantID(ctx)
	if err != nil {
		return nil, err
	}
	return loadDashboard(ctx, dao.DB, tenantID, period, time.Now())
}

func loadDashboard(ctx context.Context, db *gorm.DB, tenantID, period string, now time.Time) (*DashboardResponse, error) {
	var step time.Duration
	var count int
	switch period {
	case "24h":
		step = time.Hour
		count = 24
	case "7d":
		step = 24 * time.Hour
		count = 7
	case "30d":
		step = 24 * time.Hour
		count = 30
	default:
		return nil, fmt.Errorf("invalid dashboard period")
	}
	end := time.Date(now.Year(), now.Month(), now.Day(), now.Hour(), 0, 0, 0, now.Location())
	if period != "24h" {
		end = time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
	}
	start := end.Add(-time.Duration(count-1) * step)
	dailyStart := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location()).AddDate(0, 0, -29)
	r := &DashboardResponse{Trend: make([]dashboardPoint, count), Daily: make([]dashboardPoint, 30), Assistants: []dashboardRank{}, Recall: []dashboardRank{}, FileTypes: []dashboardFileType{}, UpdatedAt: now}
	for i := range r.Trend {
		r.Trend[i].Time = start.Add(time.Duration(i) * step).Format(time.RFC3339)
	}
	for i := range r.Daily {
		r.Daily[i].Time = dailyStart.AddDate(0, 0, i).Format(time.RFC3339)
	}
	db = db.WithContext(ctx)
	var kbs []struct{ ID, Name string }
	if err := db.Table("knowledgebase").Select("id, name").Where("tenant_id = ? AND status = ?", tenantID, "1").Scan(&kbs).Error; err != nil {
		return nil, err
	}
	r.KnowledgeBases = int64(len(kbs))
	kbNames := map[string]string{}
	for _, kb := range kbs {
		kbNames[kb.ID] = kb.Name
	}
	docs := func() *gorm.DB {
		return db.Table("document AS doc").Joins("JOIN knowledgebase AS kb ON kb.id = doc.kb_id").Where("kb.tenant_id = ? AND kb.status = ? AND doc.status = ?", tenantID, "1", "1")
	}
	var inventory struct{ Count, Bytes int64 }
	if err := docs().Select("COUNT(*) AS count, COALESCE(SUM(doc.size),0) AS bytes").Scan(&inventory).Error; err != nil {
		return nil, err
	}
	r.Documents = inventory.Count
	r.StorageBytes = inventory.Bytes
	if err := docs().Select("LOWER(CASE WHEN doc.suffix = '' THEN doc.type ELSE doc.suffix END) AS name, COUNT(*) AS count").Group("LOWER(CASE WHEN doc.suffix = '' THEN doc.type ELSE doc.suffix END)").Order("count DESC").Scan(&r.FileTypes).Error; err != nil {
		return nil, err
	}
	assistantCounts := map[string]dashboardRank{}
	recalls := map[string]int64{}
	for _, source := range []struct {
		session, message string
		api              bool
	}{{"conversation", "conversation_message", false}, {"api_4_conversation", "api_4_conversation_message", true}} {
		sessions := func() *gorm.DB {
			q := db.Table(source.session+" AS c").Joins("JOIN dialog AS d ON d.id = c.dialog_id").Where("d.tenant_id = ? AND d.status = ?", tenantID, "1")
			if source.api {
				q = q.Where("(c.source IS NULL OR c.source <> ?)", "agent")
			}
			return q
		}
		var n int64
		if err := sessions().Count(&n).Error; err != nil {
			return nil, err
		}
		r.Conversations += n
		messages := func() *gorm.DB {
			return sessions().Joins("JOIN "+source.message+" AS m ON m.conversation_id = c.id").Where("m.role IN ?", []string{"user", "assistant"})
		}
		if err := messages().Count(&n).Error; err != nil {
			return nil, err
		}
		r.Messages += n
		rows, err := messages().Where("m.role = ?", "assistant").Select("d.id, d.name, m.created_at, c.create_time, m.usage, m.reference, m.position").Rows()
		if err != nil {
			return nil, err
		}
		for rows.Next() {
			var row struct {
				ID, Name         string
				CreatedAt        *float64
				CreateTime       *int64
				Usage, Reference []byte
				Position         int
			}
			if err = db.ScanRows(rows, &row); err != nil {
				rows.Close()
				return nil, err
			}
			// A saved opening greeting has no user turn, usage, or reference.
			if row.Position == 0 {
				continue
			}
			var at time.Time
			if row.CreateTime != nil {
				at = time.UnixMilli(*row.CreateTime).In(now.Location())
			}
			if row.CreatedAt != nil && *row.CreatedAt > 0 {
				at = time.UnixMilli(int64(*row.CreatedAt * 1000)).In(now.Location())
			}
			if at.After(now) {
				continue
			}
			input, output, total, hasUsage := dashboardUsage(row.Usage)
			r.TotalTokens += total
			r.InputTokens += input
			r.OutputTokens += output
			if total > input+output {
				r.UnclassifiedTokens += total - input - output
			}
			if !hasUsage {
				r.MissingUsage++
			}
			if !at.Before(start) {
				index := int(at.Sub(start) / step)
				if index >= 0 && index < len(r.Trend) {
					p := &r.Trend[index]
					p.Calls++
					p.Input += input
					p.Output += output
					p.Total += total
					p.Unclassified += total - input - output
					r.PeriodTokens += total
				}
				a := assistantCounts[row.ID]
				a.ID = row.ID
				a.Name = row.Name
				a.Count++
				assistantCounts[row.ID] = a
				for id := range dashboardReferenceIDs(row.Reference) {
					if _, ok := kbNames[id]; ok {
						recalls[id]++
					}
				}
			}
			day := time.Date(at.Year(), at.Month(), at.Day(), 0, 0, 0, 0, now.Location())
			index := int(day.Sub(dailyStart) / (24 * time.Hour))
			if index >= 0 && index < len(r.Daily) {
				p := &r.Daily[index]
				p.Input += input
				p.Output += output
				p.Total += total
				p.Unclassified += total - input - output
			}
		}
		err = rows.Err()
		rows.Close()
		if err != nil {
			return nil, err
		}
	}
	for _, a := range assistantCounts {
		r.Assistants = append(r.Assistants, a)
	}
	for id, n := range recalls {
		r.Recall = append(r.Recall, dashboardRank{ID: id, Name: kbNames[id], Count: n})
	}
	sortRank := func(rows []dashboardRank) []dashboardRank {
		sort.Slice(rows, func(i, j int) bool {
			if rows[i].Count == rows[j].Count {
				return rows[i].ID < rows[j].ID
			}
			return rows[i].Count > rows[j].Count
		})
		if len(rows) > 5 {
			return rows[:5]
		}
		return rows
	}
	r.Assistants = sortRank(r.Assistants)
	r.Recall = sortRank(r.Recall)
	return r, nil
}

func dashboardUsage(raw []byte) (input, output, total int64, known bool) {
	var values map[string]json.RawMessage
	if json.Unmarshal(raw, &values) != nil {
		return
	}
	read := func(keys ...string) int64 {
		for _, key := range keys {
			var n int64
			if v, ok := values[key]; ok && json.Unmarshal(v, &n) == nil && n >= 0 {
				known = true
				return n
			}
		}
		return 0
	}
	input = read("prompt_tokens", "input_tokens")
	output = read("completion_tokens", "output_tokens")
	total = read("total_tokens")
	if total < input+output {
		total = input + output
	}
	return
}
func dashboardReferenceIDs(raw []byte) map[string]bool {
	ids := map[string]bool{}
	var reference struct {
		Chunks []struct {
			KBID interface{} `json:"kb_id"`
		} `json:"chunks"`
	}
	if json.Unmarshal(raw, &reference) != nil {
		return ids
	}
	for _, chunk := range reference.Chunks {
		switch id := chunk.KBID.(type) {
		case string:
			if strings.TrimSpace(id) != "" {
				ids[id] = true
			}
		case []interface{}:
			for _, v := range id {
				if s, ok := v.(string); ok {
					ids[s] = true
				}
			}
		}
	}
	return ids
}
