import { DraftsPage } from "@/pages/mail/DraftsPage";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/(root)/dashboard/mail/drafts/")({
  component: DraftsPage,
});
