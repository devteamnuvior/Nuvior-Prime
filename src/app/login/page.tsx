import { Suspense } from "react";
import { LoginForm } from "@/components/LoginForm";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center bg-paper px-6 py-16">
      <Suspense fallback={<p className="text-muted">Loading…</p>}>
        <LoginForm />
      </Suspense>
    </main>
  );
}
