export interface RssFeed {
  name: string;
  url: string;
}

export const RSS_FEEDS: Record<string, RssFeed[]> = {
  정치: [
    { name: "연합뉴스",  url: "https://www.yna.co.kr/rss/politics.xml" },
    { name: "조선일보",  url: "https://www.chosun.com/arc/outboundfeeds/rss/category/politics/?outputType=xml" },
    { name: "한겨레",   url: "https://www.hani.co.kr/rss/politics/index.rss" },
    { name: "경향신문", url: "https://www.khan.co.kr/rss/rssdata/polNewsRss.xml" },
    { name: "SBS",      url: "https://news.sbs.co.kr/news/headlineNewsRss.do?plink=headlinerss" },
    { name: "MBC",      url: "https://imnews.imbc.com/rss/news/news_00.xml" },
    { name: "KBS",      url: "https://news.kbs.co.kr/rss/rss.do" },
    { name: "YTN",      url: "https://www.ytn.co.kr/ln/rss/rss01.xml" },
  ],
  경제: [
    { name: "연합뉴스",  url: "https://www.yna.co.kr/rss/economy.xml" },
    { name: "조선일보",  url: "https://www.chosun.com/arc/outboundfeeds/rss/category/economy/?outputType=xml" },
    { name: "한겨레",   url: "https://www.hani.co.kr/rss/economy/index.rss" },
    { name: "매일경제", url: "https://www.mk.co.kr/rss/30000001/" },
    { name: "경향신문", url: "https://www.khan.co.kr/rss/rssdata/ecoNewsRss.xml" },
    { name: "MBC",      url: "https://imnews.imbc.com/rss/news/news_00.xml" },
    { name: "YTN",      url: "https://www.ytn.co.kr/ln/rss/rss01.xml" },
  ],
  사회: [
    { name: "연합뉴스",  url: "https://www.yna.co.kr/rss/society.xml" },
    { name: "조선일보",  url: "https://www.chosun.com/arc/outboundfeeds/rss/category/national/?outputType=xml" },
    { name: "한겨레",   url: "https://www.hani.co.kr/rss/society/index.rss" },
    { name: "경향신문", url: "https://www.khan.co.kr/rss/rssdata/sociNewsRss.xml" },
    { name: "SBS",      url: "https://news.sbs.co.kr/news/headlineNewsRss.do?plink=headlinerss" },
    { name: "MBC",      url: "https://imnews.imbc.com/rss/news/news_00.xml" },
    { name: "KBS",      url: "https://news.kbs.co.kr/rss/rss.do" },
    { name: "YTN",      url: "https://www.ytn.co.kr/ln/rss/rss01.xml" },
  ],
  문화: [
    { name: "연합뉴스",  url: "https://www.yna.co.kr/rss/culture.xml" },
    { name: "조선일보",  url: "https://www.chosun.com/arc/outboundfeeds/rss/category/culture-life/?outputType=xml" },
    { name: "한겨레",   url: "https://www.hani.co.kr/rss/culture/index.rss" },
    { name: "경향신문", url: "https://www.khan.co.kr/rss/rssdata/culNewsRss.xml" },
  ],
  국제: [
    { name: "연합뉴스",  url: "https://www.yna.co.kr/rss/international.xml" },
    { name: "조선일보",  url: "https://www.chosun.com/arc/outboundfeeds/rss/category/international/?outputType=xml" },
    { name: "한겨레",   url: "https://www.hani.co.kr/rss/international/index.rss" },
    { name: "경향신문", url: "https://www.khan.co.kr/rss/rssdata/intNewsRss.xml" },
    { name: "SBS",      url: "https://news.sbs.co.kr/news/headlineNewsRss.do?plink=headlinerss" },
    { name: "KBS",      url: "https://news.kbs.co.kr/rss/rss.do" },
    { name: "YTN",      url: "https://www.ytn.co.kr/ln/rss/rss01.xml" },
  ],
  기술: [
    { name: "연합뉴스",  url: "https://www.yna.co.kr/rss/it.xml" },
    { name: "조선일보",  url: "https://www.chosun.com/arc/outboundfeeds/rss/category/it-science/?outputType=xml" },
    { name: "한겨레",   url: "https://www.hani.co.kr/rss/science/index.rss" },
    { name: "매일경제", url: "https://www.mk.co.kr/rss/50300009/" },
  ],
  스포츠: [
    { name: "연합뉴스",  url: "https://www.yna.co.kr/rss/sports.xml" },
    { name: "조선일보",  url: "https://www.chosun.com/arc/outboundfeeds/rss/category/sports/?outputType=xml" },
    { name: "한겨레",   url: "https://www.hani.co.kr/rss/sports/index.rss" },
    { name: "경향신문", url: "https://www.khan.co.kr/rss/rssdata/sporNewsRss.xml" },
    { name: "SBS",      url: "https://news.sbs.co.kr/news/headlineNewsRss.do?plink=headlinerss" },
  ],
  환경: [
    { name: "연합뉴스",  url: "https://www.yna.co.kr/rss/ecology.xml" },
    { name: "한겨레",   url: "https://www.hani.co.kr/rss/science/index.rss" },
    { name: "경향신문", url: "https://www.khan.co.kr/rss/rssdata/khanAllNews.xml" },
  ],
  연예: [
    { name: "연합뉴스",   url: "https://www.yna.co.kr/rss/entertainment.xml" },
    { name: "조선일보",   url: "https://www.chosun.com/arc/outboundfeeds/rss/category/entertainments/?outputType=xml" },
    { name: "경향신문",  url: "https://www.khan.co.kr/rss/rssdata/entNewsRss.xml" },
    { name: "엑스포츠뉴스", url: "https://www.xportsnews.com/?ac=rss&sec=10" },
    { name: "스타뉴스",  url: "https://star.mt.co.kr/rss.rss" },
  ],
};
