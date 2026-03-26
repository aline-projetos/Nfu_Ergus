package main

import (
	"log"
	"net/http"

	"github.com/GlauciaVita/erGus_backend/internal/config"
	"github.com/GlauciaVita/erGus_backend/internal/db"
	httpapi "github.com/GlauciaVita/erGus_backend/internal/httpapi"

	_ "github.com/GlauciaVita/erGus_backend/internal/docs"
	httpSwagger "github.com/swaggo/http-swagger"

	"github.com/joho/godotenv"
)

func withCORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// em dev, libera só o Vite
		w.Header().Set("Access-Control-Allow-Origin", "http://localhost:8081")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
		w.Header().Set(
			"Access-Control-Allow-Headers",
			"Content-Type, Authorization, X-Tenant-ID",
		)

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}

		next.ServeHTTP(w, r)
	})
}

// @title        erGus API
// @version      1.0
// @description  API do ERP erGus (multi-tenant, categorias, produtos, etc).

// @host      localhost:8080
// @BasePath  /

func main() {
	_ = godotenv.Load()

	cfg := config.Load()

	pg, err := db.NewPostgres(
		cfg.DBHost,
		cfg.DBPort,
		cfg.DBName,
		cfg.DBUser,
		cfg.DBPass,
		cfg.DBSSL,
	)
	if err != nil {
		log.Fatal("erro conectando no postgres:", err)
	}
	defer pg.Close()

	mux := http.NewServeMux()

	mux.Handle("/docs/", httpSwagger.WrapHandler)

	//opcional: redirecionar /docs -> /docs/index.html (qualquer coisa que não termine com /)
	mux.HandleFunc("/docs", func(w http.ResponseWriter, r *http.Request) {
		http.Redirect(w, r, "/docs/index.html", http.StatusMovedPermanently)
	})

	mux.HandleFunc("/health", httpapi.HealthHandler)

	// Auth
	authHandler := httpapi.NewAuthHandler(pg)
	authHandler.RegisterRoutes(mux)

	// Tenants (clientes)
	tenantHandler := httpapi.NewTenantHandler(pg)
	tenantHandler.RegisterRoutes(mux)

	// Users
	userHandler := httpapi.NewUserHandler(pg)
	userHandler.RegisterRoutes(mux)

	// handlers de categoria
	catHandler := httpapi.NewCategoryHandler(pg)
	catHandler.RegisterRoutes(mux)

	// handlers de fornecedor
	supplier := httpapi.NewSupplierHandler(pg)
	supplier.RegisterRoutes(mux)

	// handlers de fabricante
	manufacturer := httpapi.NewManufacturerHandler(pg)
	manufacturer.RegisterRoutes(mux)

	// handlers de produtos
	products := httpapi.NewProductHandler(pg)
	products.RegisterRoutes(mux)

	// handlers de promoção
	promotions := httpapi.NewPromotionHandler(pg)
	promotions.RegisterRoutes(mux)

	// handlers de tributação
	taxHandler := httpapi.NewTaxHandler(pg)
	taxHandler.RegisterRoutes(mux)

	// handler de controle de acesso
	accessHandler := httpapi.NewAccessControlHandler(pg)
	mux.HandleFunc("/access-permissions", accessHandler.ListAccessPermissions)

	//handler de perfis de acesso
	profilesHandler := httpapi.NewProfileHandler(pg)
	profilesHandler.RegisterRoutes(mux)

	handler := httpapi.LoggingMiddleware(withCORS(mux))

	log.Println("🚀 API rodando em http://localhost:8080")
	if err := http.ListenAndServe(":8080", handler); err != nil {
		log.Fatal(err)
	}
}
