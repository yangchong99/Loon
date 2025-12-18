/**
 * 什么值得买签到脚本【优化版 - Loon】
 * 仅签到任务
 * 
 * 使用：
 * - 请先用抓 Cookie 脚本将 Cookie 保存到 $persistentStore，键名为 smzdm_cookie
 * - 在 Loon 里用 CRON 定时执行本脚本
 * 
 * author: yangchong99
 * update-time: 2025-12-18 21:30
 */

const COOKIE_KEY = "smzdm_cookie";

const notify = (title, sub, msg) => $notification.post(title, sub, msg);
const log = (msg) => console.log(`[SMZDM] ${msg}`);
const readCookie = () => $persistentStore.read(COOKIE_KEY) || "";
const done = () => $done();

// 生成随机数字字符串
function randomStr(len = 18) {
  const chars = "0123456789";
  let str = "";
  for (let i = 0; i < len; i++) {
    str += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return str;
}

// 轻量纯JS实现MD5函数
function md5(s) {
  function RotateLeft(lValue, iShiftBits) { return (lValue << iShiftBits) | (lValue >>> (32 - iShiftBits)); }
  function AddUnsigned(lX, lY) {
    let lX4, lY4, lX8, lY8, lResult;
    lX8 = (lX & 0x80000000); lY8 = (lY & 0x80000000);
    lX4 = (lX & 0x40000000); lY4 = (lY & 0x40000000);
    lResult = (lX & 0x3FFFFFFF) + (lY & 0x3FFFFFFF);
    if (lX4 & lY4) return (lResult ^ 0x80000000 ^ lX8 ^ lY8);
    if (lX4 | lY4) {
      if (lResult & 0x40000000) return (lResult ^ 0xC0000000 ^ lX8 ^ lY8);
      else return (lResult ^ 0x40000000 ^ lX8 ^ lY8);
    }
    return (lResult ^ lX8 ^ lY8);
  }
  function F(x, y, z) { return (x & y) | ((~x) & z); }
  function G(x, y, z) { return (x & z) | (y & (~z)); }
  function H(x, y, z) { return x ^ y ^ z; }
  function I(x, y, z) { return y ^ (x | (~z)); }
  function FF(a, b, c, d, x, s, ac) { a = AddUnsigned(a, AddUnsigned(AddUnsigned(F(b, c, d), x), ac)); return AddUnsigned(RotateLeft(a, s), b); }
  function GG(a, b, c, d, x, s, ac) { a = AddUnsigned(a, AddUnsigned(AddUnsigned(G(b, c, d), x), ac)); return AddUnsigned(RotateLeft(a, s), b); }
  function HH(a, b, c, d, x, s, ac) { a = AddUnsigned(a, AddUnsigned(AddUnsigned(H(b, c, d), x), ac)); return AddUnsigned(RotateLeft(a, s), b); }
  function II(a, b, c, d, x, s, ac) { a = AddUnsigned(a, AddUnsigned(AddUnsigned(I(b, c, d), x), ac)); return AddUnsigned(RotateLeft(a, s), b); }
  function ConvertToWordArray(str) {
    let lWordCount;
    const lMessageLength = str.length;
    const lNumberOfWordsTemp1 = lMessageLength + 8;
    const lNumberOfWordsTemp2 = (lNumberOfWordsTemp1 - (lNumberOfWordsTemp1 % 64)) / 64;
    const lNumberOfWords = (lNumberOfWordsTemp2 + 1) * 16;
    const lWordArray = new Array(lNumberOfWords - 1);
    let lBytePosition = 0, lByteCount = 0;
    while (lByteCount < lMessageLength) {
      lWordCount = (lByteCount - (lByteCount % 4)) / 4;
      lBytePosition = (lByteCount % 4) * 8;
      lWordArray[lWordCount] = (lWordArray[lWordCount] | (str.charCodeAt(lByteCount) << lBytePosition)) >>> 0;
      lByteCount++;
    }
    lWordCount = (lByteCount - (lByteCount % 4)) / 4;
    lBytePosition = (lByteCount % 4) * 8;
    lWordArray[lWordCount] = lWordArray[lWordCount] | (0x80 << lBytePosition);
    lWordArray[lNumberOfWords - 2] = (lMessageLength << 3) >>> 0;
    lWordArray[lNumberOfWords - 1] = (lMessageLength >>> 29) >>> 0;
    return lWordArray;
  }
  function WordToHex(lValue) {
    let WordToHexValue = "", WordToHexValueTemp = "", lByte, lCount;
    for (lCount = 0; lCount <= 3; lCount++) {
      lByte = (lValue >>> (lCount * 8)) & 255;
      WordToHexValueTemp = "0" + lByte.toString(16);
      WordToHexValue += WordToHexValueTemp.substr(WordToHexValueTemp.length - 2, 2);
    }
    return WordToHexValue;
  }
  function Utf8Encode(str) {
    str = str.replace(/\r\n/g, "\n");
    let utftext = "";
    for (let n = 0; n < str.length; n++) {
      const c = str.charCodeAt(n);
      if (c < 128) utftext += String.fromCharCode(c);
      else if ((c > 127) && (c < 2048)) {
        utftext += String.fromCharCode((c >> 6) | 192);
        utftext += String.fromCharCode((c & 63) | 128);
      } else {
        utftext += String.fromCharCode((c >> 12) | 224);
        utftext += String.fromCharCode(((c >> 6) & 63) | 128);
        utftext += String.fromCharCode((c & 63) | 128);
      }
    }
    return utftext;
  }

  let x = [], a, b, c, d, k;
  let str = Utf8Encode(s);
  x = ConvertToWordArray(str);
  a = 0x67452301; b = 0xEFCDAB89; c = 0x98BADCFE; d = 0x10325476;

  for (k = 0; k < x.length; k += 16) {
    const AA = a, BB = b, CC = c, DD = d;
    a = FF(a, b, c, d, x[k + 0], 7, 0xD76AA478);
    d = FF(d, a, b, c, x[k + 1], 12, 0xE8C7B756);
    c = FF(c, d, a, b, x[k + 2], 17, 0x242070DB);
    b = FF(b, c, d, a, x[k + 3], 22, 0xC1BDCEEE);
    a = FF(a, b, c, d, x[k + 4], 7, 0xF57C0FAF);
    d = FF(d, a, b, c, x[k + 5], 12, 0x4787C62A);
    c = FF(c, d, a, b, x[k + 6], 17, 0xA8304613);
    b = FF(b, c, d, a, x[k + 7], 22, 0xFD469501);
    a = FF(a, b, c, d, x[k + 8], 7, 0x698098D8);
    d = FF(d, a, b, c, x[k + 9], 12, 0x8B44F7AF);
    c = FF(c, d, a, b, x[k + 10], 17, 0xFFFF5BB1);
    b = FF(b, c, d, a, x[k + 11], 22, 0x895CD7BE);
    a = FF(a, b, c, d, x[k + 12], 7, 0x6B901122);
    d = FF(d, a, b, c, x[k + 13], 12, 0xFD987193);
    c = FF(c, d, a, b, x[k + 14], 17, 0xA679438E);
    b = FF(b, c, d, a, x[k + 15], 22, 0x49B40821);
    a = GG(a, b, c, d, x[k + 1], 5, 0xF61E2562);
    d = GG(d, a, b, c, x[k + 6], 9, 0xC040B340);
    c = GG(c, d, a, b, x[k + 11], 14, 0x265E5A51);
    b = GG(b, c, d, a, x[k + 0], 20, 0xE9B6C7AA);
    a = GG(a, b, c, d, x[k + 5], 5, 0xD62F105D);
    d = GG(d, a, b, c, x[k + 10], 9, 0x2441453);
    c = GG(c, d, a, b, x[k + 15], 14, 0xD8A1E681);
    b = GG(b, c, d, a, x[k + 4], 20, 0xE7D3FBC8);
    a = GG(a, b, c, d, x[k + 9], 5, 0x21E1CDE6);
    d = GG(d, a, b, c, x[k + 14], 9, 0xC33707D6);
    c = GG(c, d, a, b, x[k + 3], 14, 0xF4D50D87);
    b = GG(b, c, d, a, x[k + 8], 20, 0x455A14ED);
    a = GG(a, b, c, d, x[k + 13], 5, 0xA9E3E905);
    d = GG(d, a, b, c, x[k + 2], 9, 0xFCEFA3F8);
    c = GG(c, d, a, b, x[k + 7], 14, 0x676F02D9);
    b = GG(b, c, d, a, x[k + 12], 20, 0x8D2A4C8A);
    a = HH(a, b, c, d, x[k + 5], 4, 0xFFFA3942);
    d = HH(d, a, b, c, x[k + 8], 11, 0x8771F681);
    c = HH(c, d, a, b, x[k + 11], 16, 0x6D9D6122);
    b = HH(b, c, d, a, x[k + 14], 23, 0xFDE5380C);
    a = HH(a, b, c, d, x[k + 1], 4, 0xA4BEEA44);
    d = HH(d, a, b, c, x[k + 4], 11, 0x4BDECFA9);
    c = HH(c, d, a, b, x[k + 7], 16, 0xF6BB4B60);
    b = HH(b, c, d, a, x[k + 10], 23, 0xBEBFBC70);
    a = HH(a, b, c, d, x[k + 13], 4, 0x289B7EC6);
    d = HH(d, a, b, c, x[k + 0], 11, 0xEAA127FA);
    c = HH(c, d, a, b, x[k + 3], 16, 0xD4EF3085);
    b = HH(b, c, d, a, x[k + 6], 23, 0x4881D05);
    a = HH(a, b, c, d, x[k + 9], 4, 0xD9D4D039);
    d = HH(d, a, b, c, x[k + 12], 11, 0xE6DB99E5);
    c = HH(c, d, a, b, x[k + 15], 16, 0x1FA27CF8);
    b = HH(b, c, d, a, x[k + 2], 23, 0xC4AC5665);
    a = II(a, b, c, d, x[k + 0], 6, 0xF4292244);
    d = II(d, a, b, c, x[k + 7], 10, 0x432AFF97);
    c = II(c, d, a, b, x[k + 14], 15, 0xAB9423A7);
    b = II(b, c, d, a, x[k + 5], 21, 0xFC93A039);
    a = II(a, b, c, d, x[k + 12], 6, 0x655B59C3);
    d = II(d, a, b, c, x[k + 3], 10, 0x8F0CCC92);
    c = II(c, d, a, b, x[k + 10], 15, 0xFFEFF47D);
    b = II(b, c, d, a, x[k + 1], 21, 0x85845DD1);
    a = II(a, b, c, d, x[k + 8], 6, 0x6FA87E4F);
    d = II(d, a, b, c, x[k + 15], 10, 0xFE2CE6E0);
    c = II(c, d, a, b, x[k + 6], 15, 0xA3014314);
    b = II(b, c, d, a, x[k + 13], 21, 0x4E0811A1);
    a = II(a, b, c, d, x[k + 4], 6, 0xF7537E82);
    d = II(d, a, b, c, x[k + 11], 10, 0xBD3AF235);
    c = II(c, d, a, b, x[k + 2], 15, 0x2AD7D2BB);
    b = II(b, c, d, a, x[k + 9], 21, 0xEB86D391);
    a = AddUnsigned(a, AA);
    b = AddUnsigned(b, BB);
    c = AddUnsigned(c, CC);
    d = AddUnsigned(d, DD);
  }

  return (WordToHex(a) + WordToHex(b) + WordToHex(c) + WordToHex(d)).toLowerCase();
}

// GET 封装
function httpGet(params) {
  return new Promise((resolve, reject) => {
    $httpClient.get(params, (error, response, data) => {
      if (error) reject(error);
      else resolve({ response, body: data });
    });
  });
}

// POST 封装
function httpPost(params) {
  return new Promise((resolve, reject) => {
    $httpClient.post(params, (error, response, data) => {
      if (error) reject(error);
      else resolve({ response, body: data });
    });
  });
}

// 获取用户昵称
async function getUserNickName(cookie) {
  const url = `https://zhiyou.smzdm.com/user/info/jsonp_get_current?with_avatar_ornament=1&callback=jQuery_${Date.now()}&_=${Date.now()}`;
  try {
    log("请求用户信息...");
    const resp = await httpGet({
      url,
      headers: {
        Cookie: cookie,
        Referer: "https://zhiyou.smzdm.com/user/",
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.132 Safari/537.36",
        Accept: "text/javascript",
      },
    });

    const jsonpMatch = /\((.*)\)/.exec(resp.body);
    if (!jsonpMatch) {
      log("用户信息接口返回格式错误，没有匹配 JSONP");
      return null;
    }
    let jsonData = null;
    try {
      jsonData = JSON.parse(jsonpMatch[1]);
    } catch (e) {
      log("解析 JSON 出错：" + e.message);
      return null;
    }
    if (!jsonData || !jsonData.smzdm_id || jsonData.smzdm_id === 0) {
      log("Cookie无效或未登录");
      return null;
    }
    log("用户昵称：" + jsonData.nickname);
    return jsonData.nickname;
  } catch (e) {
    log("请求用户信息异常：" + e.message);
    return null;
  }
}

// Android 端签到
async function androidSignIn(cookie, username) {
  if (!cookie || !username) {
    log("Cookie或用户名无效");
    return [false, "Cookie或用户名为空"];
  }
  try {
    const smzdmToken = cookie.slice(5);
    const smzdmKey = "apr1$AwP!wRRT$gJ/q.X24poeBInlUJC";
    const outcome = Math.floor(Date.now() / 1000).toString();
    const rawData = `f=android&sk=${username}&time=${outcome}000&token=${smzdmToken}&v=9.9.12&weixin=1&key=${smzdmKey}`;
    const sign = md5(rawData).toUpperCase();

    log("发送签到请求...");
    const resp = await httpPost({
      url: "https://user-api.smzdm.com/checkin",
      headers: {
        Cookie: cookie,
        "User-Agent": "smzdm 10.4.20 rv:134.2 (iPhone 11; iOS 15.5; zh_CN)/iphone_smzdmapp/10.4.20",
        "Accept-Language": "zh-Hans-CN;q=1",
        "Accept-Encoding": "gzip, deflate, br",
        Connection: "Keep-Alive",
        request_key: randomStr(18),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: `sk=${username}&sign=${sign}&weixin=1&v=9.9.12&captcha=&f=android&token=${encodeURIComponent(
        smzdmToken
      )}&touchstone_event=&time=${outcome}000`,
    });

   // log("签到接口返回：" + resp.body);

    const data = typeof resp.body === "string" ? JSON.parse(resp.body) : resp.body;

    if (data.error_code === "0") {
      const gold = data.data?.cgold ?? "0";
      const dailyNum = data.data?.daily_num ?? "0";
      const cards = data.data?.cards ?? "0";

      if (data.error_msg && data.error_msg.includes("签到成功")) {
        return [true, `签到成功 🎉\n金币+${gold}｜连续${dailyNum}天｜卡片${cards}张`];
      } else if (data.error_msg === "已签到") {
        return [true, `今日已签到 ✅\n连续${dailyNum}天｜金币+${gold}｜卡片${cards}张`];
      }
    }
    return [false, `签到失败: ${JSON.stringify(data)}`];
  } catch (e) {
    return [false, `签到异常: ${e.message}`];
  }
}

// 主入口
(async () => {
  log("签到脚本开始");
  const cookie = readCookie();
  if (!cookie) {
    notify("什么值得买", "签到失败", "未找到 Cookie，请先抓取/更新");
    log("没有找到 Cookie，退出");
    done();
    return;
  }

  const nickname = await getUserNickName(cookie);
  if (!nickname) {
    notify("什么值得买", "签到失败", "用户信息获取失败或 Cookie 无效");
    log("用户信息获取失败或 Cookie 无效，退出");
    done();
    return;
  }

  log(`开始为用户 [${nickname}] 签到`);
  const [success, msg] = await androidSignIn(cookie, nickname);

  if (success) {
    notify("什么值得买", "签到结果", msg);
    log("签到成功: " + msg);
  } else {
    notify("什么值得买", "签到失败", msg);
    log("签到失败: " + msg);
  }

  log("签到脚本结束");
  done();
})();
