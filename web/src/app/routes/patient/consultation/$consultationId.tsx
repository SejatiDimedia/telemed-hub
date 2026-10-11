import { createFileRoute } from "@tanstack/react-router";
import { ConsultationRoomView } from "@/features/consultation/components/ConsultationRoomView";

export const Route = createFileRoute("/patient/consultation/$consultationId")({
  component: PatientConsultationPage,
});

function PatientConsultationPage() {
  const { consultationId } = Route.useParams();
  return <ConsultationRoomView consultationId={consultationId} />;
}
