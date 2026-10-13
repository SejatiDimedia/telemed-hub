package main

import (
	"context"
	"fmt"
	"log"

	"github.com/redis/go-redis/v9"
)

func main() {
	rdb := redis.NewClient(&redis.Options{
		Addr: "localhost:6379",
	})
	defer rdb.Close()

	ctx := context.Background()
	err := rdb.FlushDB(ctx).Err()
	if err != nil {
		log.Fatalf("Failed to flush redis: %v", err)
	}
	fmt.Println("Redis DB flushed successfully!")
}
