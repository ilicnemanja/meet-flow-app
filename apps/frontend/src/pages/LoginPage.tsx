import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { LoginButton } from "@/components/LoginButton";
import { authService } from "@/lib/auth";

export const LoginPage = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to dashboard if already authenticated
    if (authService.isAuthenticated()) {
      navigate({ to: '/dashboard' } as any);
    }
  }, [navigate]);

  return (
    <div className="h-screen w-screen flex items-center justify-center">
      {/* Image wrapper */}
      <div className="relative w-full max-w-4xl">
        <img
          src="/login-bg.png"
          alt="MeetFlow Login Illustration"
          className="w-full h-full object-contain"
        />

        <LoginButton />
      </div>
    </div>
  );
};
