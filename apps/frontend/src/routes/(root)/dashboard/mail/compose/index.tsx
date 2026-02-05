import { SendEmailPage } from "@/pages/SendEmailPage";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/(root)/dashboard/mail/compose/")({
  component: SendEmailPage,
});
