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

package models

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"ragflow/internal/common"
)

const openDataLoaderProbeTimeout = 10 * time.Second

// OpenDataLoaderModel is the settings-page driver for a self-hosted
// OpenDataLoader API server. Document parsing itself stays in the PDF parser;
// this driver lets the provider card resolve the endpoint and check that the
// server answers.
type OpenDataLoaderModel struct {
	DummyModel
}

func NewOpenDataLoaderModel(baseURL map[string]string, urlSuffix URLSuffix) *OpenDataLoaderModel {
	inner := NewDummyModel(baseURL, urlSuffix)
	inner.baseModel.AllowEmptyAPIKey = true
	inner.baseModel.httpClient = common.GetSSRFHTTPClient()
	return &OpenDataLoaderModel{DummyModel: *inner}
}

func (m *OpenDataLoaderModel) NewInstance(baseURL map[string]string) ModelDriver {
	return NewOpenDataLoaderModel(baseURL, m.baseModel.URLSuffix)
}

func (m *OpenDataLoaderModel) Name() string {
	return "opendataloader"
}

func (m *OpenDataLoaderModel) OCRFile(ctx context.Context, modelName *string, content []byte, fileURL *string, apiConfig *APIConfig, ocrConfig *OCRConfig, modelUsage *common.ModelUsage) (*OCRFileResponse, error) {
	if err := m.CheckConnection(ctx, apiConfig); err != nil {
		return nil, err
	}
	return &OCRFileResponse{}, nil
}

func (m *OpenDataLoaderModel) ListModels(ctx context.Context, apiConfig *APIConfig) ([]ListModelResponse, error) {
	return []ListModelResponse{{
		Name:       "OpenDataLoader-model",
		ModelTypes: []string{"ocr"},
	}}, nil
}

func (m *OpenDataLoaderModel) CheckConnection(ctx context.Context, apiConfig *APIConfig) error {
	if err := m.baseModel.APIConfigCheck(apiConfig); err != nil {
		return err
	}
	endpoint, err := m.endpoint(apiConfig)
	if err != nil {
		return err
	}
	ctx, cancel := context.WithTimeout(ctx, openDataLoaderProbeTimeout)
	defer cancel()
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint, nil)
	if err != nil {
		return fmt.Errorf("opendataloader request: %w", err)
	}
	if key := openDataLoaderAPIKey(apiConfig); key != "" {
		req.Header.Set("Authorization", "Bearer "+key)
	}
	resp, err := m.baseModel.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("opendataloader connection failed: %w", err)
	}
	defer resp.Body.Close()
	_, _ = io.Copy(io.Discard, io.LimitReader(resp.Body, 4096))
	if resp.StatusCode == http.StatusUnauthorized || resp.StatusCode == http.StatusForbidden {
		return fmt.Errorf("opendataloader authentication failed (HTTP %d)", resp.StatusCode)
	}
	if resp.StatusCode >= http.StatusInternalServerError {
		return fmt.Errorf("opendataloader HTTP %d", resp.StatusCode)
	}
	return nil
}

func (m *OpenDataLoaderModel) endpoint(apiConfig *APIConfig) (string, error) {
	if apiConfig != nil && apiConfig.BaseURL != nil {
		if endpoint := normalizeOpenDataLoaderEndpoint(*apiConfig.BaseURL); endpoint != "" {
			return endpoint, nil
		}
	}
	if apiConfig != nil && apiConfig.ApiKey != nil {
		if endpoint := normalizeOpenDataLoaderEndpoint(ProviderJSONConfigValue(*apiConfig.ApiKey, "opendataloader_apiserver", "OPENDATALOADER_APISERVER", "base_url")); endpoint != "" {
			return endpoint, nil
		}
	}
	endpoint, err := m.baseModel.GetBaseURL(apiConfig)
	if err != nil {
		return "", fmt.Errorf("opendataloader requires opendataloader_apiserver")
	}
	endpoint = normalizeOpenDataLoaderEndpoint(endpoint)
	if endpoint == "" {
		return "", fmt.Errorf("opendataloader requires opendataloader_apiserver")
	}
	return endpoint, nil
}

func normalizeOpenDataLoaderEndpoint(raw string) string {
	endpoint := strings.TrimSpace(raw)
	if endpoint == "" {
		return ""
	}
	if !strings.HasPrefix(endpoint, "http://") && !strings.HasPrefix(endpoint, "https://") {
		endpoint = "http://" + endpoint
	}
	return strings.TrimRight(endpoint, "/")
}

func openDataLoaderAPIKey(apiConfig *APIConfig) string {
	if apiConfig == nil || apiConfig.ApiKey == nil {
		return ""
	}
	raw := strings.TrimSpace(*apiConfig.ApiKey)
	if key := ProviderJSONConfigValue(raw, "opendataloader_api_key", "OPENDATALOADER_API_KEY", "api_key"); key != "" {
		return key
	}
	if strings.HasPrefix(raw, "{") {
		return ""
	}
	return raw
}
