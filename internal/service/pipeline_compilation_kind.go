package service

import (
	"context"
	"maps"
	"slices"
	"strings"

	"ragflow/internal/dao"
	"ragflow/internal/entity"
)

type compilationReference struct {
	tenantID string
	id       string
	group    bool
}

func pipelineCompilationKinds(ctx context.Context, canvases []*dao.UserCanvasListItem) (map[string]string, error) {
	references := make(map[string]compilationReference)
	templateIDs := make(map[string]struct{})
	groupIDs := make(map[string]struct{})
	for _, canvas := range canvases {
		if canvas.PipelineDSL == nil {
			continue
		}
		var dsl entity.JSONMap
		if err := dsl.Scan(*canvas.PipelineDSL); err != nil {
			continue
		}
		components, _ := dsl["components"].(map[string]any)
		for _, key := range slices.Sorted(maps.Keys(components)) {
			node, _ := components[key].(map[string]any)
			obj, _ := node["obj"].(map[string]any)
			if obj["component_name"] != "Compiler" {
				continue
			}
			params, _ := obj["params"].(map[string]any)
			templateID, _ := params["compilation_template_id"].(string)
			groupID, _ := params["compilation_template_group_id"].(string)
			if templateID = strings.TrimSpace(templateID); templateID != "" {
				templateIDs[templateID] = struct{}{}
				references[canvas.ID] = compilationReference{tenantID: canvas.TenantID, id: templateID}
				break
			}
			if groupID = strings.TrimSpace(groupID); groupID != "" {
				groupIDs[groupID] = struct{}{}
				references[canvas.ID] = compilationReference{tenantID: canvas.TenantID, id: groupID, group: true}
				break
			}
		}
	}
	if len(references) == 0 {
		return nil, nil
	}

	valid := string(entity.StatusValid)
	db := dao.DB.WithContext(ctx)
	var templates []entity.CompilationTemplate
	if err := db.Select("compilation_template.id, compilation_template.tenant_id, template_group.id AS group_id, compilation_template.kind").
		Joins("LEFT JOIN compilation_template_group AS template_group ON template_group.id = compilation_template.group_id AND template_group.tenant_id = compilation_template.tenant_id AND template_group.status = ?", valid).
		Where("compilation_template.status = ? AND (compilation_template.id IN ? OR template_group.id IN ?)",
			valid, sortedSetKeys(templateIDs), sortedSetKeys(groupIDs)).
		Order("compilation_template.create_time ASC, compilation_template.id ASC").Find(&templates).Error; err != nil {
		return nil, err
	}

	kinds := make(map[compilationReference]string)
	for _, template := range templates {
		kind := template.Kind
		switch kind {
		case "knowledge_graph", "mind_map", "page_index", "timeline", "tree", "wiki":
		default:
			continue
		}
		tenantID := derefString(template.TenantID)
		kinds[compilationReference{tenantID: tenantID, id: template.ID}] = kind
		if template.GroupID != nil {
			ref := compilationReference{tenantID: tenantID, id: *template.GroupID, group: true}
			if kinds[ref] == "" {
				kinds[ref] = kind
			}
		}
	}
	result := make(map[string]string, len(references))
	for id, ref := range references {
		result[id] = kinds[ref]
	}
	return result, nil
}
