#!/usr/bin/env bash
# =============================================================================
# TeleMedHub — Database Migration Runner
# =============================================================================
# Usage:
#   ./scripts/migrate.sh up       # Apply all pending migrations
#   ./scripts/migrate.sh down     # Roll back the last migration
#   ./scripts/migrate.sh down 2   # Roll back the last 2 migrations
#   ./scripts/migrate.sh version  # Show current migration version
#   ./scripts/migrate.sh create <name>  # Create a new migration pair
# =============================================================================

set -euo pipefail

MIGRATIONS_DIR="${MIGRATIONS_DIR:-migrations}"
DATABASE_URL="${DATABASE_URL:-postgres://telemedhub:telemedhub_secret@localhost:5432/telemedhub?sslmode=disable}"

# Check if golang-migrate is installed
if ! command -v migrate &> /dev/null; then
    echo "Error: golang-migrate CLI is not installed."
    echo "Install: go install -tags 'postgres' github.com/golang-migrate/migrate/v4/cmd/migrate@latest"
    exit 1
fi

CMD="${1:-help}"

case "$CMD" in
    up)
        echo "Applying migrations..."
        migrate -path "$MIGRATIONS_DIR" -database "$DATABASE_URL" up
        echo "Done."
        ;;
    down)
        STEPS="${2:-1}"
        echo "Rolling back $STEPS migration(s)..."
        migrate -path "$MIGRATIONS_DIR" -database "$DATABASE_URL" down "$STEPS"
        echo "Done."
        ;;
    version)
        migrate -path "$MIGRATIONS_DIR" -database "$DATABASE_URL" version
        ;;
    create)
        NAME="${2:?Error: migration name required. Usage: ./scripts/migrate.sh create <name>}"
        migrate create -ext sql -dir "$MIGRATIONS_DIR" -seq "$NAME"
        echo "Created migration: $NAME"
        ;;
    help|*)
        echo "Usage: ./scripts/migrate.sh {up|down [N]|version|create <name>}"
        ;;
esac
