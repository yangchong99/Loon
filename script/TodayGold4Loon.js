// Loon 专用定时脚本：今日金银看板
// 数据要素：国际及国内金银现货单价、主流金店当日单价及30日均价偏移量
// 更新时间：2026-04-02 10:10:00

const $ = new Env("今日金银看板");
const PAGE_URL = "https://www.ip138.com/gold/";
const SHOPS = ["周大福", "六福珠宝", "周生生"];
const MARKETS = [
  "国际黄金现货",
  "国际白银现货",
  "上海黄金现货",
  "上海白银现货",
];

function toNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function avg(arr) {
  if (!arr || arr.length === 0) return null;
  let s = 0;
  for (let i = 0; i < arr.length; i++) s += arr[i];
  return s / arr.length;
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

function pctText(v) {
  if (v === null || !Number.isFinite(v)) return "--";
  const x = round2(v);
  return (x >= 0 ? "+" : "") + x + "%";
}

function priceText(v) {
  return v === null || !Number.isFinite(v) ? "--" : "¥" + round2(v);
}

function parseShopRealtime(html) {
  const out = {};
  for (let i = 0; i < SHOPS.length; i++) {
    const name = SHOPS[i];
    const safe = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(
      "<span>\\s*" +
        safe +
        '\\s*<\\/span>[\\s\\S]{0,1200}?<td[^>]*data-value=\\"([\\d.]+)\\"',
    );
    const m = html.match(re);
    if (m && m[1] !== undefined) {
      const p = toNum(m[1]);
      if (p !== null) out[name] = p;
    }
  }
  return out;
}

function parseShopAvg30(html) {
  const out = {};
  for (let i = 0; i < SHOPS.length; i++) {
    const name = SHOPS[i];
    const encoded = name
      .split("")
      .map((ch) => "\\u" + ch.charCodeAt(0).toString(16).padStart(4, "0"))
      .join("");
    const re = new RegExp(
      '"name":"' + encoded + '","series":\\[([\\s\\S]*?)\\]\\}',
    );
    const mm = html.match(re);
    if (!mm || !mm[1]) continue;
    const vals = [];
    const vr = /"value":(null|[\d.]+)/g;
    let vm;
    while ((vm = vr.exec(mm[1])) !== null) {
      const v = toNum(vm[1]);
      if (v !== null) vals.push(v);
    }
    const a = avg(vals);
    if (a !== null) out[name] = round2(a);
  }
  return out;
}

function parseMarketsCnyPerGram(html) {
  const out = {};
  for (let i = 0; i < MARKETS.length; i++) {
    const n = MARKETS[i];
    const re = new RegExp(
      "<td>\\s*" +
        n +
        '\\s*<\\/td>[\\s\\S]{0,500}?<span class="value">([\\d.]+)<\\/span>[\\s\\S]{0,260}?<span class="value">([\\d.]+)<\\/span>',
    );
    const m = html.match(re);
    if (m) {
      out[n] = {
        tradeRaw: toNum(m[1]),
        cnyPerGram: toNum(m[2]),
      };
    }
  }
  return out;
}

function parseUpdate(html) {
  const m = html.match(
    /<span>\s*(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2})\s*<\/span>/,
  );
  return m ? m[1] : "";
}

async function fetchUsdCnh() {
  try {
    const u =
      "https://push2.eastmoney.com/api/qt/stock/get?secid=133.USDCNH&fields=f43";
    const r = await httpGet({ url: u, timeout: 10000 });
    const j = JSON.parse(r);
    const raw = j && j.data ? toNum(j.data.f43) : null;
    if (raw === null) return null;
    return raw / 10000;
  } catch (e) {
    $.log("汇率获取失败");
    return null;
  }
}

async function fetchIntlGoldAvg30Cny(usdcnh) {
  try {
    if (usdcnh === null) return null;
    const url =
      "https://push2his.eastmoney.com/api/qt/stock/kline/get?secid=122.XAU&klt=101&fqt=0&lmt=30&end=20500101&fields1=f1,f2,f3,f4,f5,f6&fields2=f51,f52,f53,f54,f55,f56,f57,f58";
    const r = await httpGet({ url: url, timeout: 12000 });
    const j = JSON.parse(r);
    const lines = j && j.data && j.data.klines ? j.data.klines : null;
    if (!lines || lines.length === 0) return null;

    const vals = [];
    for (let i = 0; i < lines.length; i++) {
      const p = String(lines[i]).split(",");
      if (p.length < 3) continue;
      const closeUsdPerOz = toNum(p[2]);
      if (closeUsdPerOz === null) continue;
      const cnyPerGram = (closeUsdPerOz * usdcnh) / 31.1034768;
      vals.push(cnyPerGram);
    }
    const a = avg(vals);
    return a === null ? null : round2(a);
  } catch (e) {
    $.log("国际黄金30日均价获取失败");
    return null;
  }
}

function marketShortName(n) {
  if (n === "国际黄金现货") return "国际黄金";
  if (n === "国际白银现货") return "国际白银";
  if (n === "上海黄金现货") return "上海黄金";
  if (n === "上海白银现货") return "上海白银";
  return n;
}

(async () => {
  try {
    $.log("开始获取贵金属网页数据...");
    const html = await httpGet({
      url: PAGE_URL,
      timeout: 12000,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15",
        Referer: "https://www.ip138.com/",
      },
    });

    if (!html || html.length < 500) {
      $.notify("今日金银看板", "", "获取页面内容失败或为空");
      return;
    }

    const shopRt = parseShopRealtime(html);
    const shopAvg = parseShopAvg30(html);
    const markets = parseMarketsCnyPerGram(html);
    const updateTime = parseUpdate(html);

    const ig = markets["国际黄金现货"];
    const intlGoldToday = ig && ig.cnyPerGram !== null ? ig.cnyPerGram : null;

    // 获取汇率和30日国际均价
    const fx = await fetchUsdCnh();
    const intlGoldAvg30 = await fetchIntlGoldAvg30Cny(fx);

    const intlDiff =
      intlGoldToday !== null && intlGoldAvg30 !== null && intlGoldAvg30 > 0
        ? ((intlGoldToday - intlGoldAvg30) / intlGoldAvg30) * 100
        : null;

    // 构建展示文本
    let content = `⌚️ 更新: ${updateTime}\n\n`;

    // 现货部分
    content += `【现货行情 (元/克)】\n`;
    content += `• 国际黄金: ${priceText(intlGoldToday)}`;
    content += ` (30日均: ${priceText(intlGoldAvg30)}) [${pctText(intlDiff)}]\n`;
    content += `• 上海黄金: ${priceText(markets["上海黄金现货"]?.cnyPerGram)}\n`;
    content += `• 国际白银: ${priceText(markets["国际白银现货"]?.cnyPerGram)}\n`;
    content += `• 上海白银: ${priceText(markets["上海白银现货"]?.cnyPerGram)}\n\n`;

    // 金店部分
    content += `【金店当日价 (元/克)】\n`;
    for (let i = 0; i < SHOPS.length; i++) {
      const name = SHOPS[i];
      const p = shopRt[name] !== undefined ? shopRt[name] : null;
      // 用全角空格对齐中文字符："周大福"补一个全角空格对齐"六福珠宝"
      const alignedName = name.length === 3 ? name + "　" : name;
      content += `• ${alignedName}: ${priceText(p)}\n`;
    }

    $.log("执行成功，推送通知：\n" + content);
    const subTitle = `国际黄金: ${priceText(intlGoldToday)} | 较30日均: ${pctText(intlDiff)}`;
    $.notify("今日金银看板", subTitle, content, PAGE_URL);
  } catch (e) {
    $.log("异常: " + (e && e.message ? e.message : e));
    $.notify("今日金银看板", "执行异常", e.message || "未知错误");
  } finally {
    $.done();
  }
})();

// Loon $httpClient.get 的 promise 封装
function httpGet(options) {
  return new Promise((resolve, reject) => {
    $httpClient.get(options, (err, resp, body) => {
      if (err) {
        reject(err);
      } else {
        resolve(body);
      }
    });
  });
}

// 模拟 Loon 运行时环境的上下文管理
function Env(name) {
  this.name = name;
  this.log = (msg) => console.log(`[${this.name}] ${msg}`);
  this.notify = (title, subtitle, message, url) => {
    if (typeof $notify !== "undefined") {
      $notify(title, subtitle, message, { "open-url": url });
    } else if (typeof $notification !== "undefined") {
      let attach = url ? { openUrl: url } : null;
      $notification.post(title, subtitle, message, attach);
    } else {
      console.log(`${title}\n${subtitle}\n${message}\n${url}`);
    }
  };
  this.done = () => {
    if (typeof $done !== "undefined") $done();
  };
}
