import { AuthCallbackPage } from "@/pages/AuthCallbackPage";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/(root)/auth-callback/")({
  component: AuthCallbackPage,
});
