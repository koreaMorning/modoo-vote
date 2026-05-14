"use client";

import { useActionState, useEffect } from "react";
import { loginAdmin } from "./actions";
import { useRouter } from "next/navigation";

type State = { success: true } | { success: false; error: string } | null;

async function loginAction(_: State, formData: FormData): Promise<State> {
  const password = formData.get("password") as string;
  const result = await loginAdmin(password);
  if (result.success) return { success: true };
  return { success: false, error: result.error ?? "로그인 실패" };
}

export default function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, null);
  const router = useRouter();

  useEffect(() => {
    if (state?.success) router.refresh();
  }, [state, router]);

  return (
    <form action={formAction} className="space-y-4">
      {state && !state.success && (
        <div className="border-2 border-red-600 bg-red-50 text-red-700 text-sm px-4 py-2.5 font-medium">
          {state.error}
        </div>
      )}
      <div>
        <label className="text-[10px] font-black uppercase tracking-widest text-[#6b6356] block mb-1">
          비밀번호
        </label>
        <input
          type="password"
          name="password"
          autoFocus
          required
          disabled={pending}
          className="w-full border-2 border-[#1c1712] bg-[#f5f0e8] px-4 py-3 text-sm font-medium disabled:opacity-60"
          placeholder="관리자 비밀번호"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="w-full border-2 border-[#1c1712] bg-[#1c1712] text-[#f0e5c0] py-3 text-sm font-black hover:bg-[#3d2b1f] transition-colors tracking-widest uppercase disabled:opacity-50"
      >
        {pending ? "확인 중..." : "로그인"}
      </button>
    </form>
  );
}
