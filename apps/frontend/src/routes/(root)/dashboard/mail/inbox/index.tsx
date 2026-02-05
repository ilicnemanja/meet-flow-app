import { InboxPage } from "@/pages/mail/InboxPage";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/(root)/dashboard/mail/inbox/")({
  component: InboxPage,
});
