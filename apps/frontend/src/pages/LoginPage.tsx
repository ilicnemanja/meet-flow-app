import { LoginButton } from "@/components/LoginButton";

export const LoginPage = () => {
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
