import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/patient/wallet")({
  component: PatientWalletPlaceholder,
});

function PatientWalletPlaceholder() {
  return (
    <div>
      <h1 className="text-2xl font-bold">Dompet Digital</h1>
      <p className="mt-2 text-gray-600">Sistem dompet digital dan transaksi ledger akan dibangun di Sprint 2.</p>
    </div>
  );
}
