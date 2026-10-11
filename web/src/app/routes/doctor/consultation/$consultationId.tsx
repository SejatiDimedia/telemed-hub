import { createFileRoute } from "@tanstack/react-router";
import { ConsultationRoomView } from "@/features/consultation/components/ConsultationRoomView";

export const Route = createFileRoute("/doctor/consultation/$consultationId")({
  component: DoctorConsultationPage,
});

function DoctorConsultationPage() {
  const { consultationId } = Route.useParams();
  return <ConsultationRoomView consultationId={consultationId} />;
}
