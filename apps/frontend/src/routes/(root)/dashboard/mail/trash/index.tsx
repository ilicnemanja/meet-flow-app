import { TrashPage } from "@/pages/mail/TrashPage";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/(root)/dashboard/mail/trash/")({
  component: TrashPage,
});
