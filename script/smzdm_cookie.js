// Loon 持久化抓smzdm_cookie脚本
// author: yangchong99
// update-time: 2025-12-18 21:50:46

const url = $request.url;

if (url.match(/^https?:\/\/user-api\.smzdm\.com\/checkin$/)) {
  const cookie = $request.headers.Cookie || $request.headers.cookie;
  if (cookie) {
    $persistentStore.write(cookie, 'smzdm_cookie');
    $notification.post('什么值得买', '🍪 Cookie 获取成功', '已保存 Cookie');
  }
}

$done({});
