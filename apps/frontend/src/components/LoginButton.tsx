import { Button } from "./ui/button";
import { ArrowRight } from "lucide-react";

export const LoginButton = () => {
  return (
    <Button
      className="
        absolute
        top-[58%]
        left-[67%]
        w-55
        h-14
        bg-linear-to-r from-sky-400 to-sky-600
        shadow-2xl
        text-white
        text-lg
        font-semibold
        cursor-pointer
        hover:from-sky-500 hover:to-sky-700
        active:scale-95
        transition
        duration-200
    "
    >
      Single Sign-On <ArrowRight className="size-6" />
    </Button>
  );
};
