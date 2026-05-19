import Header from "@/components/Header";
import Footer from "@/components/Footer";
import OttScheduleClient from "./OttScheduleClient";
import s from "./schedule.module.css";

export default function SchedulePage() {
  return (
    <div className="min-h-screen flex flex-col text-[#1c1712]">
      <Header />
      <main className="flex-1 py-6 px-4">
        <div className={s.paper}>
          {/* 헤더 */}
          <div className={s.header}>
            <div className={s.headerTop}>
              <div className={s.headerLogo}>
                <div className={s.logoMark}>모두의<br />투표</div>
                <div>
                  <div className={s.headerMainTitle}>OTT 프로그램 편성표</div>
                  <div className={s.headerSubTitle}>STREAMING SERVICE WEEKLY RANKINGS</div>
                </div>
              </div>
            </div>
          </div>

          {/* 플랫폼 탭 + 콘텐츠 */}
          <OttScheduleClient />

          {/* 푸터 */}
          <div className={s.footer}>
            <div>※ 본 편성표는 각 OTT 플랫폼의 공식 발표 기준이며 사정에 따라 변경될 수 있습니다</div>
            <div>모두의 투표 편성표팀</div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
