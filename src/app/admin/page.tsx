import { checkAdminAuth, getPolls } from "./actions";
import AdminDashboard from "./AdminDashboard";
import LoginForm from "./LoginForm";

export const metadata = { title: "관리자 | 모두의 투표" };

export default async function AdminPage() {
  const isAuthed = await checkAdminAuth();

  if (!isAuthed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5f0e8] text-[#1c1712]">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <h1 className="font-black font-serif text-3xl tracking-tight">모두의 투표</h1>
            <p className="text-xs tracking-[0.3em] uppercase text-[#8c8070] mt-1">Admin Console</p>
          </div>
          <div className="border-4 border-[#1c1712] p-8">
            <h2 className="text-sm font-black uppercase tracking-widest mb-6 text-center">관리자 로그인</h2>
            <LoginForm />
          </div>
        </div>
      </div>
    );
  }

  const polls = await getPolls();

  return <AdminDashboard initialPolls={polls as Parameters<typeof AdminDashboard>[0]["initialPolls"]} />;
}
