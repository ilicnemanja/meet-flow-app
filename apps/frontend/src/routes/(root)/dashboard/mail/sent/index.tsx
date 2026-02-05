import { SentPage } from "@/pages/mail/SentPage";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/(root)/dashboard/mail/sent/")({
  component: SentPage,
});
