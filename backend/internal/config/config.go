package config

import "os"

type Config struct {
	AppName string
	AppEnv  string

	DBHost string
	DBPort string
	DBName string
	DBUser string
	DBPass string
	DBSSL  string
}

func Load() *Config {
	return &Config{
		AppName: os.Getenv("APP_NAME"),
		AppEnv:  os.Getenv("APP_ENV"),

		DBHost: os.Getenv("DB_HOST"),
		DBPort: os.Getenv("DB_PORT"),
		DBName: os.Getenv("DB_NAME"),
		DBUser: os.Getenv("DB_USER"),
		DBPass: os.Getenv("DB_PASS"),
		DBSSL:  os.Getenv("DB_SSLMODE"),
	}
}
