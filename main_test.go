package main

import (
	"errors"
	"strings"
	"testing"
)

func TestEstimateTokens(t *testing.T) {
	cases := []struct {
		name  string
		input string
		low   int // expected count is in [low, high]
		high  int
	}{
		// 100 ASCII chars: ~25 tokens (100/4)
		{"pure ASCII 100 chars", strings.Repeat("a", 100), 24, 26},
		// 30 Chinese chars (3 bytes each, 90 bytes total): ~60 tokens (90*2/3)
		{"pure CJK 30 chars", strings.Repeat("中", 30), 55, 65},
		// Empty input → 0 tokens
		{"empty", "", 0, 0},
		// Mixed: 40 ASCII + 10 CJK (40 + 30 bytes) → 10 + 20 = ~30 tokens
		{"mixed", strings.Repeat("a", 40) + strings.Repeat("中", 10), 28, 32},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			got := estimateTokens([]byte(c.input))
			if got < c.low || got > c.high {
				t.Errorf("estimateTokens(%q): got %d, want in [%d, %d]",
					truncate(c.input, 20), got, c.low, c.high)
			}
		})
	}
}

func TestDecide_EmptyInput(t *testing.T) {
	cases := [][]byte{nil, {}, []byte("   "), []byte("\n"), []byte(" \t\n")}
	for _, raw := range cases {
		_, err := decide(raw, 3000, false)
		if !errors.Is(err, ErrEmptyInput) {
			t.Errorf("expected ErrEmptyInput for %q, got %v", raw, err)
		}
	}
}

func TestDecide_InvalidJSON(t *testing.T) {
	_, err := decide([]byte("not json"), 3000, false)
	if !errors.Is(err, ErrInvalidJSON) {
		t.Fatalf("expected ErrInvalidJSON, got %v", err)
	}
}

func TestDecide_MissingView(t *testing.T) {
	_, err := decide([]byte(`{"title":"hi"}`), 3000, false)
	if !errors.Is(err, ErrMissingView) {
		t.Fatalf("expected ErrMissingView, got %v", err)
	}
}

func TestDecide_PassThroughBelowThreshold(t *testing.T) {
	// Small JSON with explicit small token_count → should pass through
	raw := []byte(`{"view":"plan","title":"tiny","token_count":100,"data":{}}`)
	dec, err := decide(raw, 3000, false)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !dec.PassThrough {
		t.Errorf("expected pass-through for token_count=100 with threshold=3000")
	}
	if dec.Input.View != "plan" {
		t.Errorf("expected view='plan', got %q", dec.Input.View)
	}
	if dec.TokenCount != 100 {
		t.Errorf("expected TokenCount=100 (from JSON), got %d", dec.TokenCount)
	}
}

func TestDecide_RenderAboveThreshold(t *testing.T) {
	// Explicit large token_count → should render (no pass-through)
	raw := []byte(`{"view":"plan","title":"huge","token_count":5000,"data":{}}`)
	dec, err := decide(raw, 3000, false)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if dec.PassThrough {
		t.Errorf("expected render (not pass-through) for token_count=5000 with threshold=3000")
	}
}

func TestDecide_NoThresholdForcesRender(t *testing.T) {
	// Small JSON, but --no-threshold should force the render path
	raw := []byte(`{"view":"plan","token_count":50,"data":{}}`)
	dec, err := decide(raw, 3000, true) // noThresh=true
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if dec.PassThrough {
		t.Errorf("expected render when noThreshold=true, even with low token count")
	}
}

func TestDecide_FallbackToEstimate(t *testing.T) {
	// JSON without token_count → falls back to byte-based estimate.
	// Use small bytes to verify estimate triggers pass-through.
	raw := []byte(`{"view":"plan","data":{}}`)
	dec, err := decide(raw, 3000, false)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !dec.PassThrough {
		t.Errorf("small input without token_count should pass through under threshold")
	}
	if dec.TokenCount == 0 {
		t.Errorf("expected estimated token count > 0, got 0")
	}
}

func TestDecide_EstimateDrivesRenderForLargeInput(t *testing.T) {
	// Large input without token_count: the estimate alone must cross the
	// threshold and trigger the render path. Builds a JSON with a step label
	// large enough that the byte-based estimate exceeds 100.
	bigLabel := strings.Repeat("A", 2000) // ~500 ASCII tokens
	raw := []byte(`{"view":"plan","data":{"steps":[{"id":1,"label":"` + bigLabel + `"}]}}`)
	dec, err := decide(raw, 100, false)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if dec.PassThrough {
		t.Errorf("large input without token_count should render (not pass through) when estimate > threshold")
	}
	if dec.TokenCount <= 100 {
		t.Errorf("expected estimate > threshold (100), got %d", dec.TokenCount)
	}
}

func TestDecide_LangField(t *testing.T) {
	// Lang field should round-trip into the parsed input
	raw := []byte(`{"view":"plan","lang":"zh","token_count":50,"data":{}}`)
	dec, err := decide(raw, 3000, false)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if dec.Input.Lang != "zh" {
		t.Errorf("expected Lang='zh', got %q", dec.Input.Lang)
	}
}

func TestDecide_ThresholdZeroAlwaysRenders(t *testing.T) {
	// threshold=0 disables the check → always render
	raw := []byte(`{"view":"plan","token_count":10,"data":{}}`)
	dec, err := decide(raw, 0, false)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if dec.PassThrough {
		t.Errorf("threshold=0 should disable pass-through")
	}
}

func truncate(s string, n int) string {
	if len(s) <= n {
		return s
	}
	return s[:n] + "..."
}
