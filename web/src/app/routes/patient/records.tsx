import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/patient/records")({
  component: PatientRecordsPlaceholder,
});

function PatientRecordsPlaceholder() {
  return (
    <div>
      <h1 className="text-2xl font-bold">Rekam Medis</h1>
      <p className="mt-2 text-gray-600">Riwayat rekam medis terproteksi audit log akan dibangun di Sprint 5.</p>
    </div>
  );
}
