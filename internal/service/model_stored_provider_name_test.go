//
//  Copyright 2026 The InfiniFlow Authors. All Rights Reserved.
//
//  Licensed under the Apache License, Version 2.0 (the "License");
//  you may not use this file except in compliance with the License.
//  You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
//  Unless required by applicable law or agreed to in writing, software
//  distributed under the License is distributed on an "AS IS" BASIS,
//  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//  See the License for the specific language governing permissions and
//  limitations under the License.
//

package service

import (
	"testing"

	"gorm.io/gorm"

	"ragflow/internal/common"
	"ragflow/internal/entity"
)

// mistralOCRStoredKey is the api_key Python's "Mistral OCR" factory stored when
// provisioned from the environment; the model migration copies it verbatim.
const mistralOCRStoredKey = `{"MISTRAL_OCR_API_KEY": "sk-env", "MISTRAL_OCR_BASE_URL": "https://api.mistral.ai/v1"}`

// seedStoredMistralOCRProvider seeds a tenant whose provider row carries the
// "Mistral OCR" name, with mistral-ocr-latest enrolled as an ocr model.
// mistral-ocr-2512 is left unenrolled so composite references to it resolve
// through the catalog.
func seedStoredMistralOCRProvider(t *testing.T, db *gorm.DB) {
	t.Helper()
	activeStatus := "1"
	rows := []interface{}{
		&entity.UserTenant{ID: "user-tenant-1", UserID: "user-1", TenantID: "user-1", Role: "owner", InvitedBy: "user-1", Status: &activeStatus},
		&entity.TenantModelProvider{ID: "provider-mistral-ocr", UserID: "user-1", TenantID: "user-1", ProviderName: "Mistral OCR"},
		&entity.TenantModelInstance{ID: "instance-mistral-ocr", ProviderID: "provider-mistral-ocr", InstanceName: "default", APIKey: mistralOCRStoredKey, Status: "active", Extra: "{}"},
		&entity.TenantModel{ID: "model-mistral-ocr", ProviderID: "provider-mistral-ocr", InstanceID: "instance-mistral-ocr", ModelName: "mistral-ocr-latest", ModelType: int(entity.ModelTypeOCR), Status: "active"},
	}
	for _, row := range rows {
		if err := db.Create(row).Error; err != nil {
			t.Fatalf("failed to seed %T: %v", row, err)
		}
	}
}

// The provider list skips a
// "Mistral OCR" row, as it does for any name the catalog does not serve.
func TestListProvidersOfTenantSkipsStoredMistralOCRProvider(t *testing.T) {
	db := setupModelProviderServiceTestDB(t)
	useModelProviderServiceTestDB(t, db)
	seedStoredMistralOCRProvider(t, db)
	if err := db.Create(&entity.TenantModelProvider{ID: "provider-openai", UserID: "user-1", TenantID: "user-1", ProviderName: "OpenAI"}).Error; err != nil {
		t.Fatalf("create provider: %v", err)
	}

	providers, code, err := NewModelProviderService().ListProvidersOfTenant(serviceTestContext(t, "user-1", "user-1"))
	if err != nil || code != common.CodeSuccess {
		t.Fatalf("ListProvidersOfTenant = (%v, %v)", code, err)
	}
	var names []string
	for _, provider := range providers {
		names = append(names, provider["name"].(string))
	}
	if len(names) != 1 || names[0] != "OpenAI" {
		t.Fatalf("providers = %v, want only OpenAI", names)
	}
}
