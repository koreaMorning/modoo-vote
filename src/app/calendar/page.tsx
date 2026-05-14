import Header from "@/components/Header";
import CalendarClient from "./CalendarClient";

export const metadata = { title: "달력 - 모두의 투표" };

export default function CalendarPage() {
  return (
    <div className="min-h-screen flex flex-col text-[#1c1712]">
      <Header />
      <CalendarClient />
    </div>
  );
}
