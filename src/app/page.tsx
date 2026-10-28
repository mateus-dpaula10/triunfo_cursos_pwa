"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { FullScreenLoader } from "@/components/states";

export default function Home() {
  const { user, ready } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (ready) router.replace(user ? "/cursos/" : "/login/");
  }, [ready, user, router]);

  return <FullScreenLoader />;
}
