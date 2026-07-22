package main

import (
	"context"
	"fmt"
	"os"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/joho/godotenv"
)

func main() {
	godotenv.Load()
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		dbURL = "postgres://postgres:postgres@localhost:5432/telemedhub?sslmode=disable"
	}
	
	ctx := context.Background()
	pool, err := pgxpool.New(ctx, dbURL)
	if err != nil {
		panic(err)
	}
	defer pool.Close()

	cmdTag, err := pool.Exec(ctx, `
		UPDATE prescriptions
		SET status = 'fulfilled'
		WHERE id IN (
			SELECT prescription_id FROM orders WHERE prescription_id IS NOT NULL
		) AND status != 'fulfilled'
	`)
	if err != nil {
		panic(err)
	}
	
	fmt.Printf("Updated %d prescriptions to fulfilled\n", cmdTag.RowsAffected())
}
