import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/doctor/schedule")({
  component: DoctorSchedulePlaceholder,
});

function DoctorSchedulePlaceholder() {
  return (
    <div>
      <h1 className="text-2xl font-bold">Jadwal Praktek Dokter</h1>
      <p className="mt-2 text-gray-600">Fitur pengelolaan jadwal praktek dan slot ketersediaan akan dibangun di Sprint 4.</p>
    </div>
  );
}
