#include <HX711.h>
#include <ESP8266WiFi.h>      // WiFiClient included here
#include <ESP8266WebServer.h>
#include <WiFiClientSecure.h> // HTTPS push len Vercel
#include <EEPROM.h>

// ── EEPROM config ─────────────────────────────────────────────
#define CAL_MAGIC 0xCAFE
struct Config { uint16_t magic; float cal; };

float calibrationFactor = 1065.5f;

void saveConfig() {
  Config cfg = { CAL_MAGIC, calibrationFactor };
  EEPROM.begin(sizeof(Config));
  EEPROM.put(0, cfg);
  EEPROM.commit();
  EEPROM.end();
  Serial.print("Config saved: cal="); Serial.println(calibrationFactor);
}

void loadConfig() {
  EEPROM.begin(sizeof(Config));
  Config cfg;
  EEPROM.get(0, cfg);
  EEPROM.end();
  if (cfg.magic == CAL_MAGIC && !isnan(cfg.cal) && !isinf(cfg.cal) && cfg.cal != 0) {
    calibrationFactor = cfg.cal;
    Serial.print("Config loaded: cal="); Serial.println(calibrationFactor);
  } else {
    Serial.println("No saved config, dung default");
  }
}

// ── Pins ─────────────────────────────────────────────────────
#define DOUT_PIN  14   // D5
#define SCK_PIN   12   // D6

// ── WiFi ─────────────────────────────────────────────────────
const char* WIFI_SSID = "Chien Thang";
const char* WIFI_PASS = "88888888";

// ── Vercel push config ─────────────────────────────────────────
// ESP8266 push thẳng lên web server đã deploy qua HTTPS — không cần
// cùng mạng LAN với PC, không cần ngrok. Chỉ cần ESP có Internet.
const char* VERCEL_HOST = "robot-com-rang-new.vercel.app";
const int   VERCEL_PORT = 443;
const char* PUSH_PATH   = "/api/scale";

// Push khi cân vừa ổn định, hoặc cứ mỗi PUSH_INTERVAL_MS nếu đang ổn định
const unsigned long PUSH_COOLDOWN_MS  = 3000;   // tối thiểu 3s giữa 2 lần push
const unsigned long PUSH_INTERVAL_MS  = 10000;  // push định kỳ mỗi 10s dù stable không đổi
bool pushEnabled = true;

// ── Filter tuning ─────────────────────────────────────────────
#define MED_SIZE    7
#define EMA_ALPHA   0.25f
#define DEADBAND    0.3f
#define STABLE_N    10
#define STABLE_RNG  0.8f

// ─────────────────────────────────────────────────────────────

HX711 scale;
ESP8266WebServer server(80);

// Tang 1: Median filter
float medBuf[MED_SIZE] = {0};
uint8_t medIdx = 0;
bool medFull = false;

float medianOf(float* arr, int n) {
  float tmp[MED_SIZE];
  memcpy(tmp, arr, n * sizeof(float));
  for (int i = 0; i < n - 1; i++)
    for (int j = i + 1; j < n; j++)
      if (tmp[j] < tmp[i]) { float t = tmp[i]; tmp[i] = tmp[j]; tmp[j] = t; }
  return tmp[n / 2];
}

float applyMedian(float val) {
  medBuf[medIdx] = val;
  medIdx = (medIdx + 1) % MED_SIZE;
  if (medIdx == 0) medFull = true;
  int n = medFull ? MED_SIZE : (medIdx == 0 ? MED_SIZE : medIdx);
  return medianOf(medBuf, n);
}

// Tang 2: EMA
float emaVal = 0.0f;
bool  emaInit = false;

float applyEMA(float val) {
  if (!emaInit) { emaVal = val; emaInit = true; return val; }
  emaVal = EMA_ALPHA * val + (1.0f - EMA_ALPHA) * emaVal;
  return emaVal;
}

// Tang 3: Deadband
float displayVal = 0.0f;

void applyDeadband(float val) {
  if (fabsf(val - displayVal) > DEADBAND) displayVal = val;
}

// Kiem tra on dinh
float stableBuf[STABLE_N] = {0};
uint8_t stableIdx = 0;
bool stableFull = false;
bool isStable = false;

void checkStable(float val) {
  stableBuf[stableIdx] = val;
  stableIdx = (stableIdx + 1) % STABLE_N;
  if (stableIdx == 0) stableFull = true;
  if (!stableFull) { isStable = false; return; }
  float mn = stableBuf[0], mx = stableBuf[0];
  for (int i = 1; i < STABLE_N; i++) {
    if (stableBuf[i] < mn) mn = stableBuf[i];
    if (stableBuf[i] > mx) mx = stableBuf[i];
  }
  isStable = (mx - mn) < STABLE_RNG;
}

void processSample(float raw) {
  float med = applyMedian(raw);
  float ema = applyEMA(med);
  applyDeadband(ema);
  checkStable(ema);
}

void resetFilters() {
  memset(medBuf,    0, sizeof(medBuf));
  memset(stableBuf, 0, sizeof(stableBuf));
  medIdx = stableIdx = 0;
  medFull = stableFull = emaInit = false;
  emaVal = displayVal = 0.0f;
  isStable = false;
}

// ── Push weight event lên Vercel qua HTTPS ────────────────────
bool prevStable = false;
unsigned long lastPushMs = 0;
unsigned long lastPeriodicPushMs = 0;
bool lastPushOk = false;

void pushWeightEvent(const char* reason) {
  if (!pushEnabled) return;

  char body[100];
  snprintf(body, sizeof(body),
    "{\"weight\":%.1f,\"stable\":%s,\"reason\":\"%s\"}",
    displayVal, isStable ? "true" : "false", reason);

  WiFiClientSecure client;
  client.setInsecure();   // bo qua kiem tra chung chi — don gian hoa cho ESP8266
  client.setTimeout(4000); // TLS handshake cham hon HTTP thuong

  if (!client.connect(VERCEL_HOST, VERCEL_PORT)) {
    Serial.println("Push: HTTPS connect failed");
    lastPushOk = false;
    return;
  }

  int bodyLen = strlen(body);
  client.print("POST "); client.print(PUSH_PATH); client.print(" HTTP/1.1\r\n");
  client.print("Host: "); client.print(VERCEL_HOST); client.print("\r\n");
  client.print("Content-Type: application/json\r\n");
  client.print("Content-Length: "); client.print(bodyLen); client.print("\r\n");
  client.print("Connection: close\r\n\r\n");
  client.print(body);

  // Doc dong dau tien cua response de xac nhan HTTP status (khong bat buoc)
  unsigned long waitStart = millis();
  String statusLine;
  while (client.connected() && millis() - waitStart < 3000) {
    if (client.available()) { statusLine = client.readStringUntil('\n'); break; }
  }
  client.stop();

  lastPushOk = statusLine.indexOf("200") > 0;
  Serial.print("Push ["); Serial.print(reason);
  Serial.print("] w="); Serial.print(displayVal);
  Serial.print(" -> "); Serial.println(statusLine.length() ? statusLine : "(no response)");
  lastPushMs = millis();
}

// ─────────────────────────────────────────────────────────────

const char HTML[] PROGMEM = R"=====(
<!DOCTYPE html><html><head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
<title>LoadCell</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,sans-serif;background:#0f172a;color:#e2e8f0;min-height:100vh}
.hdr{background:#1e293b;padding:14px;text-align:center;border-bottom:1px solid #334155}
.hdr h1{color:#38bdf8;font-size:20px}
.card{background:#1e293b;border-radius:18px;margin:16px;padding:28px 16px;text-align:center}
.lbl{font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:2px;margin-bottom:8px}
.wnum{font-size:84px;font-weight:700;line-height:1;letter-spacing:-3px;transition:color .2s}
.wunit{font-size:22px;color:#94a3b8;margin-top:4px}
.badge{display:inline-block;margin-top:10px;padding:3px 14px;border-radius:99px;font-size:12px;font-weight:700}
.st{background:#14532d;color:#4ade80}.ms{background:#1e3a5f;color:#60a5fa}
.sec{padding:0 16px;margin-bottom:12px}
.sec h2{font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px}
.btn{width:100%;padding:16px;border:none;border-radius:12px;font-size:16px;font-weight:600;cursor:pointer;margin-bottom:8px}
.btn:active{opacity:.6}
.b-blue{background:#2563eb;color:#fff}
.b-green{background:#16a34a;color:#fff}
.b-orange{background:#ea580c;color:#fff}
.g4{display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:6px;margin-bottom:8px}
.bsm{background:#1e293b;color:#94a3b8;border:1px solid #334155;padding:12px 4px;font-size:14px;font-weight:600;border-radius:10px;cursor:pointer}
.bsm:active{opacity:.6}
.ci{display:flex;gap:8px;margin-bottom:6px}
.ci input{flex:1;padding:14px;background:#0f172a;border:1px solid #334155;border-radius:10px;color:#e2e8f0;font-size:16px}
.ci button{padding:14px 18px;border:none;border-radius:10px;font-size:15px;font-weight:700;cursor:pointer;background:#16a34a;color:#fff}
.hint{font-size:11px;color:#475569;margin-bottom:12px}
.ib{background:#1e293b;border-radius:12px;margin:0 16px 16px;padding:12px 14px}
.ir{display:flex;justify-content:space-between;font-size:12px;padding:5px 0;border-bottom:1px solid #0f172a}
.ir:last-child{border:none}
.iv{color:#38bdf8;font-weight:600}
</style></head><body>
<div class="hdr"><h1>&#9878; LoadCell Monitor</h1></div>
<div class="card">
  <div class="lbl">Khoi luong</div>
  <div class="wnum" id="w">--</div>
  <div class="wunit">gram</div>
  <span class="badge ms" id="sb">Do...</span>
</div>
<div class="sec">
  <button class="btn b-blue" onclick="doTare()">&#8635; TARE — Ve so 0</button>
  <button class="btn b-orange" onclick="doPush()">&#8679; Push len Vercel ngay</button>
</div>
<div class="sec">
  <h2>Chinh thu cong</h2>
  <div class="g4">
    <button class="bsm" onclick="doCal(-100)">-100</button>
    <button class="bsm" onclick="doCal(-10)">-10</button>
    <button class="bsm" onclick="doCal(10)">+10</button>
    <button class="bsm" onclick="doCal(100)">+100</button>
  </div>
</div>
<div class="sec">
  <h2>Calibrate theo thuc te</h2>
  <div class="ci">
    <input type="number" id="kw" placeholder="KL thuc te (g)" step="0.1">
    <button onclick="doCalibrate()">Set</button>
  </div>
  <div class="hint">1. De trong → TARE &nbsp;|&nbsp; 2. Dat vat len → doi ON DINH → nhap KL → Set</div>
</div>
<div class="ib">
  <div class="ir"><span>Cal Factor</span><span class="iv" id="cal">--</span></div>
  <div class="ir"><span>EMA alpha</span><span class="iv">)=====";

const char HTML2[] PROGMEM = R"=====(</span></div>
  <div class="ir"><span>Push host</span><span class="iv" id="ph">--</span></div>
  <div class="ir"><span>IP (ESP)</span><span class="iv" id="ip">--</span></div>
</div>
<script>
let prevW=0;
function upd(){
  fetch('/data').then(r=>r.json()).then(d=>{
    const el=document.getElementById('w');
    if(d.weight!==prevW){el.textContent=Math.round(d.weight);prevW=d.weight;}
    el.style.color=Math.abs(d.weight)<0.4?'#475569':d.weight>0?'#4ade80':'#f87171';
    const b=document.getElementById('sb');
    b.textContent=d.stable?'ON DINH':'Do...';
    b.className='badge '+(d.stable?'st':'ms');
    document.getElementById('cal').textContent=d.cal.toFixed(1);
    document.getElementById('ip').textContent=d.ip;
    document.getElementById('ph').textContent=d.push_host||'--';
  }).catch(()=>{});
}
function doTare(){fetch('/tare').then(()=>{document.getElementById('w').textContent='0.0';prevW=0;});}
function doCal(d){fetch('/cal?d='+d).then(r=>r.json()).then(v=>document.getElementById('cal').textContent=v.cal.toFixed(1));}
function doPush(){fetch('/push').then(r=>r.json()).then(v=>alert(v.ok?'Push OK len Vercel':'Push that bai, xem Serial Monitor'));}
function doCalibrate(){
  const kw=parseFloat(document.getElementById('kw').value);
  if(!kw||kw<=0){alert('Nhap KL hop le!');return;}
  fetch('/calibrate?w='+kw).then(r=>r.json()).then(v=>{
    document.getElementById('cal').textContent=v.cal.toFixed(1);
    alert('Calibrate xong!\nCal Factor = '+v.cal.toFixed(1));
  });
}
setInterval(upd,200);upd();
</script></body></html>
)=====";

// ─────────────────────────────────────────────────────────────

void handleRoot() {
  String pg = String(FPSTR(HTML));
  pg += String(EMA_ALPHA, 2);
  pg += String(FPSTR(HTML2));
  server.send(200, "text/html", pg);
}

void handleData() {
  char buf[200];
  snprintf(buf, sizeof(buf),
    "{\"weight\":%.0f,\"cal\":%.1f,\"stable\":%s,\"ip\":\"%s\",\"push_host\":\"%s\",\"last_push_ok\":%s}",
    displayVal, calibrationFactor,
    isStable ? "true" : "false",
    WiFi.localIP().toString().c_str(),
    VERCEL_HOST,
    lastPushOk ? "true" : "false");
  server.send(200, "application/json", buf);
}

void handleTare() {
  scale.tare();
  resetFilters();
  // Báo server.py là cân vừa được tare (bắt đầu đo mới)
  pushWeightEvent("tare");
  server.send(200, "text/plain", "ok");
}

void handleCal() {
  calibrationFactor += server.arg("d").toFloat();
  scale.set_scale(calibrationFactor);
  saveConfig();
  char buf[40];
  snprintf(buf, sizeof(buf), "{\"cal\":%.1f}", calibrationFactor);
  server.send(200, "application/json", buf);
}

void handleCalibrate() {
  float known = server.arg("w").toFloat();
  if (known <= 0) { server.send(400, "text/plain", "bad"); return; }
  scale.set_scale(1.0f);
  float raw1 = scale.get_units(8);
  calibrationFactor = raw1 / known;
  scale.set_scale(calibrationFactor);
  saveConfig();
  resetFilters();
  char buf[40];
  snprintf(buf, sizeof(buf), "{\"cal\":%.2f}", calibrationFactor);
  server.send(200, "application/json", buf);
}

void handlePushNow() {
  // Manual push từ UI để kiểm tra kết nối tới Vercel
  pushWeightEvent("manual");
  char buf[60];
  snprintf(buf, sizeof(buf), "{\"ok\":%s,\"weight\":%.1f}", lastPushOk ? "true" : "false", displayVal);
  server.send(200, "application/json", buf);
}

// ─────────────────────────────────────────────────────────────

void setup() {
  Serial.begin(115200);
  delay(300);
  Serial.println("\n=== ESP8266 LoadCell ===");

  loadConfig();
  scale.begin(DOUT_PIN, SCK_PIN);
  scale.set_scale(calibrationFactor);
  scale.tare();
  Serial.println("Tare OK");

  WiFi.begin(WIFI_SSID, WIFI_PASS);
  Serial.print("WiFi");
  while (WiFi.status() != WL_CONNECTED) { delay(400); Serial.print("."); }
  Serial.print("\n>> http://");
  Serial.println(WiFi.localIP());
  Serial.print(">> Push to: https://");
  Serial.print(VERCEL_HOST); Serial.println(PUSH_PATH);

  server.on("/",          handleRoot);
  server.on("/data",      handleData);
  server.on("/tare",      handleTare);
  server.on("/cal",       handleCal);
  server.on("/calibrate", handleCalibrate);
  server.on("/push",      handlePushNow);  // manual push trigger
  server.begin();
}

void loop() {
  server.handleClient();

  if (scale.is_ready()) {
    float raw = scale.get_units(1);
    processSample(raw);
  }

  unsigned long now = millis();
  bool stableJustChanged = (isStable != prevStable);
  prevStable = isStable;

  // Push khi cân vừa ổn định (stable transition false→true)
  if (stableJustChanged && isStable && fabsf(displayVal) > 0.5f) {
    if (now - lastPushMs >= PUSH_COOLDOWN_MS) {
      pushWeightEvent("stable");
    }
  }

  // Push định kỳ mỗi 10s khi đang ổn định (để server.py cập nhật cache)
  if (isStable && (now - lastPeriodicPushMs >= PUSH_INTERVAL_MS)) {
    lastPeriodicPushMs = now;
    if (now - lastPushMs >= PUSH_COOLDOWN_MS) {
      pushWeightEvent("periodic");
    }
  }
}
