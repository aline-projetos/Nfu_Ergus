package main

import (
	"fmt"
	"log"
	"os"

	"github.com/joho/godotenv"

	"github.com/golang-migrate/migrate/v4"
	_ "github.com/golang-migrate/migrate/v4/database/postgres"
	_ "github.com/golang-migrate/migrate/v4/source/file"
)

func main() {
	_ = godotenv.Load()

	if len(os.Args) < 2 {
		log.Fatal("uso: go run ./cmd/migrate [up|down|version]")
	}

	dbURL := os.Getenv("DB_URL")
	if dbURL == "" {
		log.Fatal("DB_URL não encontrado no .env")
	}

	m, err := migrate.New("file://migrations", dbURL)
	if err != nil {
		log.Fatal("erro criando migrate:", err)
	}

	switch os.Args[1] {
	case "up":
		if err := m.Up(); err != nil && err != migrate.ErrNoChange {
			log.Fatal("erro migrate up:", err)
		}
		log.Println("✅ migrations aplicadas (up)")

	case "down":
		// down 1 step (seguro)
		if err := m.Steps(-1); err != nil {
			log.Fatal("erro migrate down:", err)
		}
		log.Println("✅ rollback de 1 migration aplicado")

	case "version":
		v, dirty, err := m.Version()
		if err == migrate.ErrNilVersion {
			log.Println("version: (nenhuma) dirty:", dirty)
			return
		}
		if err != nil {
			log.Fatal("erro version:", err)
		}
		log.Printf("%s", fmt.Sprintf("version: %d dirty: %v", v, dirty))

	default:
		log.Fatal("comando inválido. use: up | down | version")
	}
}
