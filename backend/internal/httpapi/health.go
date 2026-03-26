package httpapi

import (
	"encoding/json"
	"net/http"
	"time"
)

type HealthResponse struct {
	Status    string    `json:"status"`
	Service   string    `json:"service"`
	Timestamp time.Time `json:"timestamp"`
}

// HealthHandler godoc
// @Summary     Healthcheck da API
// @Description Retorna status simples da API erGus
// @Tags        Health
// @Produce     json
// @Success     200 {object} HealthResponse
// @Router      /health [get]
func HealthHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "método não permitido", http.StatusMethodNotAllowed)
		return
	}

	resp := HealthResponse{
		Status:    "ok",
		Service:   "ergus-backend",
		Timestamp: time.Now().UTC(),
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(resp)
}
