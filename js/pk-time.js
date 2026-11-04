/* KAFEO POS — always use Pakistan time (Asia/Karachi, UTC+5, no daylight saving).
   Works even if the counter PC / tablet clock is set to the wrong time zone,
   so AM/PM, "today" totals and reports always match the café's real time. */
(function () {
  'use strict';
  if (window.__pkTime) return; window.__pkTime = true;
  var OFF = 5 * 3600 * 1000, N = Date, P = N.prototype, TZ = 'Asia/Karachi';
  function sh(t) { return new N(t + OFF); }
  ['FullYear', 'Month', 'Date', 'Day', 'Hours', 'Minutes', 'Seconds', 'Milliseconds'].forEach(function (k) {
    var g = P['getUTC' + k];
    P['get' + k] = function () { var t = this.getTime(); return isNaN(t) ? NaN : g.call(sh(t)); };
  });
  ['FullYear', 'Month', 'Date', 'Hours', 'Minutes', 'Seconds', 'Milliseconds'].forEach(function (k) {
    var s = P['setUTC' + k];
    P['set' + k] = function () { var t = this.getTime(); var x = sh(isNaN(t) ? 0 : t); s.apply(x, arguments); return this.setTime(x.getTime() - OFF); };
  });
  P.getTimezoneOffset = function () { return -300; };
  ['toLocaleString', 'toLocaleDateString', 'toLocaleTimeString'].forEach(function (k) {
    var o = P[k];
    P[k] = function (l, opt) { var op = Object.assign({}, opt || {}); if (!op.timeZone) op.timeZone = TZ; return o.call(this, l, op); };
  });
  var LOCAL_ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/;
  function PKDate() {
    var a = arguments, t;
    if (!(this instanceof PKDate)) return new N().toString();
    if (a.length >= 2) t = N.UTC.apply(null, a) - OFF;
    else if (a.length === 1 && typeof a[0] === 'string' && LOCAL_ISO.test(a[0].trim())) t = N.parse(a[0].trim() + 'Z') - OFF;
    else if (a.length === 1) t = new N(a[0]).getTime();
    else t = N.now();
    return new N(t);
  }
  PKDate.prototype = P;
  PKDate.now = N.now; PKDate.parse = N.parse; PKDate.UTC = N.UTC;
  window.Date = PKDate;
})();
