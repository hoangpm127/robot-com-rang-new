/**
 * ESP32 + HX711 Load Cell -> DO1, DO2, DO3
 *
 * Wiring:
 *   HX711  DOUT -> GPIO 2
 *   HX711  SCK  -> GPIO 4
 *   DO1         -> GPIO 25  (weight > THRESHOLD_1)
 *   DO2         -> GPIO 26  (weight > THRESHOLD_2)
 *   DO3         -> GPIO 27  (weight > THRESHOLD_3 / overload)
 *   TARE button -> GPIO 0   (BOOT button on most ESP32 boards)
 *
 * Serial commands (115200 baud):
 *   t  -> Tare (zero)
 *   c+ -> Increase calibration factor by 10
 *   c- -> Decrease calibration factor by 10
 *   p  -> Print current weight and status
 */

#include <HX711.h>

// ── Pin config ──────────────────────────────────────────────
#define HX711_DOUT    2
#define HX711_SCK     4
#define PIN_DO1       25
#define PIN_DO2       26
#define PIN_DO3       27
#define PIN_TARE_BTN  0    // BOOT button (active LOW)

// ── Thresholds (grams) ──────────────────────────────────────
// Adjust these to match your application
#define THRESHOLD_1   50.0f    // DO1 ON  khi weight > 50g
#define THRESHOLD_2   200.0f   // DO2 ON  khi weight > 200g
#define THRESHOLD_3   500.0f   // DO3 ON  khi weight > 500g (overload)

// ── Calibration ─────────────────────────────────────────────
// Bước 1: Để thang trống, gõ 't' để tare
// Bước 2: Đặt vật biết trước khối lượng lên thang
// Bước 3: Dùng 'c+' / 'c-' cho đến khi số hiển thị đúng
float calibrationFactor = -450.0f;  // Thay đổi giá trị này cho thang của bạn

// ── Sampling ─────────────────────────────────────────────────
#define SAMPLE_INTERVAL_MS  100   // Đọc 10 lần/giây
#define STABLE_SAMPLES      3     // Số mẫu liên tiếp phải đồng thuận

// ─────────────────────────────────────────────────────────────

HX711 scale;

float  currentWeight   = 0.0f;
float  lastWeight      = 0.0f;
bool   do1State        = false;
bool   do2State        = false;
bool   do3State        = false;
bool   btnLastState    = HIGH;
unsigned long lastRead = 0;

// Rolling average buffer
#define AVG_SIZE 5
float weightBuf[AVG_SIZE] = {0};
uint8_t bufIdx = 0;

// ─────────────────────────────────────────────────────────────

void setup() {
  Serial.begin(115200);
  Serial.println();
  Serial.println("=== ESP32 LoadCell DO Controller ===");

  // Output pins
  pinMode(PIN_DO1, OUTPUT);
  pinMode(PIN_DO2, OUTPUT);
  pinMode(PIN_DO3, OUTPUT);
  digitalWrite(PIN_DO1, LOW);
  digitalWrite(PIN_DO2, LOW);
  digitalWrite(PIN_DO3, LOW);

  // Tare button
  pinMode(PIN_TARE_BTN, INPUT_PULLUP);

  // HX711
  scale.begin(HX711_DOUT, HX711_SCK);
  scale.set_scale(calibrationFactor);
  scale.tare();

  Serial.printf("Calibration factor: %.1f\n", calibrationFactor);
  Serial.printf("Thresholds: DO1=%.0fg  DO2=%.0fg  DO3=%.0fg\n",
                THRESHOLD_1, THRESHOLD_2, THRESHOLD_3);
  Serial.println("Commands: t=tare  c+=cal up  c-=cal down  p=print");
  Serial.println("Ready.");
}

// ─────────────────────────────────────────────────────────────

float readAveraged() {
  if (!scale.is_ready()) return currentWeight;

  float raw = scale.get_units(1);
  if (raw < 0) raw = 0;  // Ignore negative (below tare)

  weightBuf[bufIdx] = raw;
  bufIdx = (bufIdx + 1) % AVG_SIZE;

  float sum = 0;
  for (int i = 0; i < AVG_SIZE; i++) sum += weightBuf[i];
  return sum / AVG_SIZE;
}

void updateDO(float weight) {
  bool d1 = (weight > THRESHOLD_1);
  bool d2 = (weight > THRESHOLD_2);
  bool d3 = (weight > THRESHOLD_3);

  if (d1 != do1State) {
    do1State = d1;
    digitalWrite(PIN_DO1, do1State ? HIGH : LOW);
    Serial.printf("[DO1] %s  (%.1fg)\n", do1State ? "ON " : "OFF", weight);
  }
  if (d2 != do2State) {
    do2State = d2;
    digitalWrite(PIN_DO2, do2State ? HIGH : LOW);
    Serial.printf("[DO2] %s  (%.1fg)\n", do2State ? "ON " : "OFF", weight);
  }
  if (d3 != do3State) {
    do3State = d3;
    digitalWrite(PIN_DO3, do3State ? HIGH : LOW);
    Serial.printf("[DO3] %s  (%.1fg)%s\n", do3State ? "ON " : "OFF", weight,
                  do3State ? "  *** OVERLOAD ***" : "");
  }
}

void handleSerial() {
  if (!Serial.available()) return;
  String cmd = Serial.readStringUntil('\n');
  cmd.trim();

  if (cmd == "t" || cmd == "T") {
    scale.tare();
    memset(weightBuf, 0, sizeof(weightBuf));
    currentWeight = 0;
    Serial.println("[TARE] Done.");

  } else if (cmd == "c+" || cmd == "C+") {
    calibrationFactor += 10.0f;
    scale.set_scale(calibrationFactor);
    Serial.printf("[CAL] factor = %.1f\n", calibrationFactor);

  } else if (cmd == "c-" || cmd == "C-") {
    calibrationFactor -= 10.0f;
    scale.set_scale(calibrationFactor);
    Serial.printf("[CAL] factor = %.1f\n", calibrationFactor);

  } else if (cmd == "p" || cmd == "P") {
    Serial.printf("[STATUS] Weight=%.2fg  DO1=%d  DO2=%d  DO3=%d  Cal=%.1f\n",
                  currentWeight, do1State, do2State, do3State, calibrationFactor);
  }
}

void handleTareButton() {
  bool btnState = digitalRead(PIN_TARE_BTN);
  if (btnState == LOW && btnLastState == HIGH) {
    delay(50);  // debounce
    if (digitalRead(PIN_TARE_BTN) == LOW) {
      scale.tare();
      memset(weightBuf, 0, sizeof(weightBuf));
      currentWeight = 0;
      Serial.println("[TARE] Button pressed.");
    }
  }
  btnLastState = btnState;
}

// ─────────────────────────────────────────────────────────────

void loop() {
  handleTareButton();
  handleSerial();

  unsigned long now = millis();
  if (now - lastRead >= SAMPLE_INTERVAL_MS) {
    lastRead = now;
    currentWeight = readAveraged();
    updateDO(currentWeight);

    // Print to Serial every 500ms for monitoring
    static unsigned long lastPrint = 0;
    if (now - lastPrint >= 500) {
      lastPrint = now;
      Serial.printf("Weight: %7.2f g  | DO1:%d  DO2:%d  DO3:%d\n",
                    currentWeight, do1State, do2State, do3State);
    }
  }
}
