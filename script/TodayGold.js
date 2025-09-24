// 2025-09-24 11:36:30
// 原创脚本@yangchongUncle，转载请留名
// Loon专用脚本，获取每日金价

const $ = new Env("今日黄金报价");
const query_addr = "https://www.ip138.com/gold/";

// 时间格式转换为 2025-09-23-224546，用于显示
function toFormattedDate(timeStr) {
  try {
    let d = new Date(timeStr);
    if (isNaN(d.getTime())) return "";
    let yyyy = d.getFullYear();
    let MM = (d.getMonth() + 1).toString().padStart(2, "0");
    let dd = d.getDate().toString().padStart(2, "0");
    let hh = d.getHours().toString().padStart(2, "0");
    let mm = d.getMinutes().toString().padStart(2, "0");
    let ss = d.getSeconds().toString().padStart(2, "0");
    return `${yyyy}-${MM}-${dd}-${hh}${mm}${ss}`;
  } catch {
    return "";
  }
}

(async () => {
  try {
    let data = await httpGet(query_addr);
    log("网页抓取成功，开始解析...");

    // 解析金店报价表，改进更新时间解析，支持无 span 标签情况
    let shop_prices = [];
    const shop_table_regex = /<table>[\s\S]*?<thead>[\s\S]*?金店名称[\s\S]*?<\/thead>[\s\S]*?<tbody>([\s\S]*?)<\/tbody>/;
    const shop_table_match = data.match(shop_table_regex);
    if (shop_table_match) {
      const row_regex = /<tr>([\s\S]*?)<\/tr>/g;
      let row_match;
      while ((row_match = row_regex.exec(shop_table_match[1])) !== null) {
        const td_regex = /<td(?:[^>]*)>([\s\S]*?)<\/td>/g;
        let tds = [];
        let td_match;
        while ((td_match = td_regex.exec(row_match[1])) !== null) {
          let raw = td_match[1].replace(/\n/g, " ").trim();
          let parts = [];
          const spanReg = /<span[^>]*>(.*?)<\/span>/g;
          let m;
          while ((m = spanReg.exec(raw))) {
            parts.push(m[1]);
          }
          // 有 span 的取第一个，否则取裸文本
          if (parts.length > 0) {
            tds.push(parts.join(""));
          } else {
            let plain = raw.replace(/<[^>]+>/g, "").trim().replace(/-/g, "—");
            tds.push(plain);
          }
        }
        if (tds.length === 4 && tds[0] !== "金店名称") {
          shop_prices.push({
            shop: tds[0],
            price: tds[1],
            buy_price: tds[2],
            time: toFormattedDate(tds[3]),
          });
        }
      }
      log(`解析到金店报价 ${shop_prices.length} 条`);
    } else {
      log("未匹配到金店报价表");
    }

    // 解析主流交易品种表
    let types = [];
    const type_table_regex = /<table>[\s\S]*?<thead>[\s\S]*?交易品种[\s\S]*?<\/thead>[\s\S]*?<tbody>([\s\S]*?)<\/tbody>/;
    const type_table_match = data.match(type_table_regex);
    if (type_table_match) {
      const row_regex = /<tr>([\s\S]*?)<\/tr>/g;
      let row_match;
      while ((row_match = row_regex.exec(type_table_match[1])) !== null) {
        const td_regex = /<td(?:[^>]*)>([\s\S]*?)<\/td>/g;
        let tds = [];
        let td_match;
        while ((td_match = td_regex.exec(row_match[1])) !== null) {
          let val = td_match[1].replace(/<[^>]+>/g, "").trim();
          tds.push(val);
        }
        if (tds.length === 4 && tds[0] !== "交易品种") {
          types.push({
            breed: tds[0],
            price: tds[1],
            convert: tds[2],
            time: toFormattedDate(tds[3]),
          });
        }
      }
      log(`解析到交易品种 ${types.length} 条`);
    } else {
      log("未匹配到交易品种表");
    }

    // 美化排版辅助
    function pad(str, len, align = "left") {
      str = str ? str.toString() : "";
      let wideLen = str.replace(/[^\x00-\xff]/g, "xx").length;
      let padLen = len - wideLen;
      if (padLen <= 0) return str;
      if (align === "right") return " ".repeat(padLen) + str;
      if (align === "center") {
        let left = Math.floor(padLen / 2);
        let right = padLen - left;
        return " ".repeat(left) + str + " ".repeat(right);
      }
      return str + " ".repeat(padLen);
    }

    // 字段宽度设置
    const w1 = 8,
      w2 = 8,
      w3 = 8,
      w4 = 18; // 充足显示时间

    let message =
      "【今日黄金报价】\n\n金店报价:\n" +
      pad("名称", w1) +
      pad("零售价", w2) +
      pad("换购价", w3) +
      pad("更新时间", w4) +
      "\n";
    shop_prices.forEach((i) => {
      message +=
        pad(i.shop, w1) +
        pad(i.price, w2) +
        pad(i.buy_price, w3) +
        pad(i.time, w4, "right") +
        "\n";
    });

    message += "\n主流交易品种:\n";
    message += "品种  交易价格  换算价  更新时间\n";
    types.forEach((i) => {
      message += [i.breed, i.price, i.convert, i.time].join(" | ") + "\n";
    });

    notify("今日黄金报价", "", message, query_addr);
    log("脚本执行完成，推送内容如下：\n" + message);
  } catch (e) {
    log("请求或解析异常: " + e.message);
    notify("今日黄金报价", "执行失败", e.message);
  } finally {
    $.done();
  }
})();

function httpGet(url) {
  return new Promise((resolve, reject) => {
    $httpClient.get(
      { url: url, headers: { Referer: query_addr, "User-Agent": "Mozilla/5.0" } },
      (err, resp, body) => {
        if (err) reject(err);
        else resolve(body);
      }
    );
  });
}

function notify(title, subTitle, content, url) {
  if (url) {
    $.notify(title, subTitle, content, url);
  } else {
    $.notify(title, subTitle, content);
  }
}

function log(message) {
  console.log(message);
}

function Env(name) {
  this.name = name;
  this.notify = (title, subtitle, message, url) => {
    if (typeof $notify !== "undefined") {
      $notify(title, subtitle, message, { "open-url": url });
    } else if (typeof $notification !== "undefined") {
      $notification.post(title, subtitle, message, { url: url });
    } else {
      console.log(`${title}\n${subtitle}\n${message}\n${url}`);
    }
  };
  this.done = () => {
    if (typeof $done !== "undefined") $done();
  };
}
