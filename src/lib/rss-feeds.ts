export interface RssFeed {
  name: string;
  url: string;
}

/* Google 뉴스 RSS 헬퍼 */
const G = (q: string) =>
  `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=ko&gl=KR&ceid=KR:ko`;

export const RSS_FEEDS: Record<string, RssFeed[]> = {
  정치: [
    { name: "연합뉴스",  url: "https://www.yna.co.kr/rss/politics.xml" },
    { name: "조선일보",  url: "https://www.chosun.com/arc/outboundfeeds/rss/category/politics/?outputType=xml" },
    { name: "한겨레",   url: "https://www.hani.co.kr/rss/" },
    { name: "경향신문", url: "https://www.khan.co.kr/rss/rssdata/total_news.xml" },
    { name: "KBS",     url: "https://news.kbs.co.kr/rss/rss.do" },
    { name: "MBC",     url: G("정치 site:imbc.com") },
    { name: "SBS",     url: G("정치 site:sbs.co.kr") },
    { name: "YTN",     url: G("정치 site:ytn.co.kr") },
  ],
  경제: [
    { name: "연합뉴스",  url: "https://www.yna.co.kr/rss/economy.xml" },
    { name: "조선일보",  url: "https://www.chosun.com/arc/outboundfeeds/rss/category/economy/?outputType=xml" },
    { name: "한겨레",   url: "https://www.hani.co.kr/rss/" },
    { name: "경향신문", url: "https://www.khan.co.kr/rss/rssdata/total_news.xml" },
    { name: "매일경제", url: "https://www.mk.co.kr/rss/30000001/" },
    { name: "MBC",     url: G("경제 site:imbc.com") },
    { name: "YTN",     url: G("경제 site:ytn.co.kr") },
  ],
  사회: [
    { name: "연합뉴스",  url: "https://www.yna.co.kr/rss/society.xml" },
    { name: "조선일보",  url: "https://www.chosun.com/arc/outboundfeeds/rss/category/national/?outputType=xml" },
    { name: "한겨레",   url: "https://www.hani.co.kr/rss/" },
    { name: "경향신문", url: "https://www.khan.co.kr/rss/rssdata/total_news.xml" },
    { name: "KBS",     url: "https://news.kbs.co.kr/rss/rss.do" },
    { name: "MBC",     url: G("사회 site:imbc.com") },
    { name: "SBS",     url: G("사회 site:sbs.co.kr") },
  ],
  국제: [
    { name: "연합뉴스",  url: "https://www.yna.co.kr/rss/international.xml" },
    { name: "조선일보",  url: "https://www.chosun.com/arc/outboundfeeds/rss/category/international/?outputType=xml" },
    { name: "한겨레",   url: "https://www.hani.co.kr/rss/" },
    { name: "경향신문", url: "https://www.khan.co.kr/rss/rssdata/total_news.xml" },
    { name: "KBS",     url: "https://news.kbs.co.kr/rss/rss.do" },
    { name: "YTN",     url: G("국제 site:ytn.co.kr") },
  ],
  문화: [
    { name: "연합뉴스",  url: "https://www.yna.co.kr/rss/culture.xml" },
    { name: "조선일보",  url: "https://www.chosun.com/arc/outboundfeeds/rss/category/culture-life/?outputType=xml" },
    { name: "한겨레",   url: "https://www.hani.co.kr/rss/" },
    { name: "경향신문", url: "https://www.khan.co.kr/rss/rssdata/total_news.xml" },
    { name: "MBC",     url: G("문화 site:imbc.com") },
  ],
  스포츠: [
    { name: "연합뉴스",  url: "https://www.yna.co.kr/rss/sports.xml" },
    { name: "조선일보",  url: "https://www.chosun.com/arc/outboundfeeds/rss/category/sports/?outputType=xml" },
    { name: "한겨레",   url: "https://www.hani.co.kr/rss/" },
    { name: "MBC",     url: G("스포츠 site:imbc.com") },
    { name: "SBS",     url: G("스포츠 site:sbs.co.kr") },
  ],
  연예: [
    { name: "연합뉴스",  url: "https://www.yna.co.kr/rss/entertainment.xml" },
    { name: "조선일보",  url: "https://www.chosun.com/arc/outboundfeeds/rss/category/entertainments/?outputType=xml" },
    { name: "경향신문", url: "https://www.khan.co.kr/rss/rssdata/total_news.xml" },
    { name: "구글뉴스", url: G("연예 아이돌 드라마") },
  ],
};
