import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/patient/appointments")({
  component: PatientAppointmentsPlaceholder,
});

function PatientAppointmentsPlaceholder() {
  return (
    <div>
      <h1 className="text-2xl font-bold">Janji Temu Pasien</h1>
      <p className="mt-2 text-gray-600">Alur reservasi dan pencarian dokter akan dibangun di Sprint 3.</p>
    </div>
  );
}
