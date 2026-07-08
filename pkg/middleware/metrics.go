package middleware

import (
	"net/http"
	"strconv"

	chimw "github.com/go-chi/chi/v5/middleware"
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
)

var (
	httpRequestsTotal = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "http_requests_total",
			Help: "Total number of HTTP requests, partitioned by method, path, and status code.",
		},
		[]string{"method", "path", "status_code"},
	)

	httpRequestDuration = promauto.NewHistogramVec(
		prometheus.HistogramOpts{
			Name:    "http_request_duration_seconds",
			Help:    "Histogram of HTTP request latencies in seconds.",
			Buckets: prometheus.DefBuckets,
		},
		[]string{"method", "path"},
	)
)

// MetricsMiddleware records Prometheus metrics for every HTTP request:
//   - http_requests_total   (counter)  — labels: method, path, status_code
//   - http_request_duration_seconds (histogram) — labels: method, path
//
// Place this middleware AFTER TraceIDMiddleware and BEFORE the access-log
// middleware so that the recorded status code is accurate.
func MetricsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Use chi's WrapResponseWriter to capture the status code.
		ww := chimw.NewWrapResponseWriter(w, r.ProtoMajor)

		timer := prometheus.NewTimer(httpRequestDuration.WithLabelValues(r.Method, r.URL.Path))
		defer timer.ObserveDuration()

		next.ServeHTTP(ww, r)

		httpRequestsTotal.WithLabelValues(
			r.Method,
			r.URL.Path,
			strconv.Itoa(ww.Status()),
		).Inc()
	})
}
