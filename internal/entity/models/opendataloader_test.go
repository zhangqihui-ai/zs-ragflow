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
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestOpenDataLoaderCheckConnectionAcceptsReachableServer(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("Authorization") != "Bearer odl-key" {
			t.Errorf("Authorization = %q", r.Header.Get("Authorization"))
		}
		w.WriteHeader(http.StatusNotFound)
	}))
	defer server.Close()

	driver := NewOpenDataLoaderModel(nil, URLSuffix{})
	driver.baseModel.httpClient = server.Client()
	apiKey := `{"opendataloader_apiserver":"` + server.URL + `","opendataloader_api_key":"odl-key"}`
	if err := driver.CheckConnection(context.Background(), &APIConfig{ApiKey: &apiKey}); err != nil {
		t.Fatal(err)
	}
}

func TestOpenDataLoaderCheckConnectionRejectsAuthFailure(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusUnauthorized)
	}))
	defer server.Close()

	driver := NewOpenDataLoaderModel(nil, URLSuffix{})
	driver.baseModel.httpClient = server.Client()
	if err := driver.CheckConnection(context.Background(), &APIConfig{BaseURL: &server.URL}); err == nil || !strings.Contains(err.Error(), "authentication failed") {
		t.Fatalf("error = %v", err)
	}
}

func TestOpenDataLoaderCheckConnectionRequiresEndpoint(t *testing.T) {
	driver := NewOpenDataLoaderModel(nil, URLSuffix{})
	err := driver.CheckConnection(context.Background(), &APIConfig{})
	if err == nil || !strings.Contains(err.Error(), "opendataloader_apiserver") {
		t.Fatalf("error = %v", err)
	}
}
