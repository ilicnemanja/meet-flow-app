import { JunkPage } from "@/pages/mail/JunkPage";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/(root)/dashboard/mail/junk/")({
  component: JunkPage,
});
