import React, { useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  Share,
  Linking,
  PanResponder,
  Platform,
} from "react-native";
import { Feather, Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { CULTURES, CULTURE_MOISTURE_HINTS } from "@/constants/mockData";
import {
  calculate,
  findRule,
  getMoistureRisk,
  formatCurrency,
  buildShareText,
  type CalculationResult,
  type ProductMode,
} from "@/utils/calculator";
import { saveCalculation } from "@/utils/storage";
import { queueHistoryRecord, flushHistoryToSheets } from "@/services/sheetsApi";

const MOISTURE_MIN = 0;
const MOISTURE_MAX = 100;

const METHOD_OPTIONS = [
  { id: "combine" as const, label: "Через комбайн", icon: "construct-outline" as const },
  { id: "sprayer" as const, label: "Опрыскиватель", icon: "water-outline" as const },
  { id: "manual" as const, label: "Ручное", icon: "hand-right-outline" as const },
];

const PRODUCT_MODES: { id: ProductMode; label: string }[] = [
  { id: "auto", label: "Авто" },
  { id: "silkorm", label: "СилКорм® Про" },
  { id: "egalis", label: "EGALIS Ferment" },
];

export default function CalculatorScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";

  const [productMode, setProductMode] = useState<ProductMode>("auto");
  const [culture, setCulture] = useState("");
  const [mass, setMass] = useState("");
  const [moisture, setMoisture] = useState(40);
  const [method, setMethod] = useState<"combine" | "sprayer" | "manual">("combine");
  const [speed, setSpeed] = useState("");
  const [egalisPackSize, setEgalisPackSize] = useState<50 | 200>(50);
  const [egalisWaterPerPack, setEgalisWaterPerPack] = useState<50 | 200>(50);
  const [layerMode, setLayerMode] = useState(false);
  const [result, setResult] = useState<CalculationResult | null>(null);
  const [saved, setSaved] = useState(false);

  const moistureHint = culture ? CULTURE_MOISTURE_HINTS[culture] : null;
  const ruleExists = culture ? findRule(culture, moisture) !== null : null;
  const moistureRisk = getMoistureRisk(moisture);

  const effectiveProduct = result?.product.id ?? (productMode === "silkorm" ? "silkorm" : productMode === "egalis" ? "egalis" : null);
  const showEgalisFields = productMode === "egalis" || (productMode === "auto" && result?.product.id === "egalis");
  const showLayerMode = (productMode === "silkorm" || (productMode === "auto" && result?.product.id === "silkorm")) && result?.rule?.layerMode;
  const canLayerMode = productMode === "silkorm" || (productMode === "auto" && !!(culture && findRule(culture, moisture)?.layerMode));

  const reset = () => { setResult(null); setSaved(false); };

  const handleCulture = (c: string) => {
    setCulture(c);
    reset();
    Haptics.selectionAsync();
  };

  const handleProductMode = (mode: ProductMode) => {
    setProductMode(mode);
    reset();
    Haptics.selectionAsync();
  };

  const handleCalculate = () => {
    if (!culture) {
      Alert.alert("Внимание", "Выберите культуру / сырьё");
      return;
    }
    const massNum = parseFloat(mass.replace(",", "."));
    if (!mass || isNaN(massNum) || massNum <= 0) {
      Alert.alert("Внимание", "Введите корректное значение массы (тонн)");
      return;
    }
    const speedNum = parseFloat(speed.replace(",", "."));
    if (!speed || isNaN(speedNum) || speedNum <= 0) {
      Alert.alert("Внимание", "Введите производительность (т/ч)");
      return;
    }

    const calc = calculate({
      culture,
      mass: massNum,
      moisture,
      method,
      speed: speedNum,
      egalisPackSize,
      egalisWaterPerPack,
      layerMode,
      productMode,
    });

    if (!calc) {
      Alert.alert(
        "Нет данных",
        `Для культуры "${culture}" при влажности ${moisture}% правило не найдено.\n\n${CULTURE_MOISTURE_HINTS[culture] ?? ""}`
      );
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setResult(calc);
    setSaved(false);
  };

  const handleSave = async () => {
    if (!result) return;
    try {
      await saveCalculation(result);
      await queueHistoryRecord(result);
      flushHistoryToSheets().catch(() => {});
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSaved(true);
    } catch {
      Alert.alert("Ошибка", "Не удалось сохранить расчёт");
    }
  };

  const handleShareWhatsApp = async () => {
    if (!result) return;
    const text = buildShareText(result);
    const url = `whatsapp://send?text=${encodeURIComponent(text)}`;
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) { Linking.openURL(url); } else { Share.share({ message: text }); }
    } catch {
      Share.share({ message: text });
    }
  };

  const handleSharePDF = async () => {
    if (!result) return;
    const text = buildShareText(result);
    Share.share({ message: text, title: "AgroCalc КЛМ — Расчёт" });
  };

  const lockScrollX = useCallback(() => {
    if (!isWeb) return;
    const fix = () => { if (window.scrollX !== 0) window.scrollTo(0, window.scrollY); };
    fix();
    setTimeout(fix, 50);
    setTimeout(fix, 200);
    setTimeout(fix, 400);
  }, [isWeb]);

  const styles = makeStyles(colors, isWeb, insets);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {/* ── Product Mode Selector ── */}
      <Text style={styles.groupLabel}>Консервант</Text>
      <View style={styles.productModeRow}>
        {PRODUCT_MODES.map((pm) => {
          const sel = productMode === pm.id;
          return (
            <TouchableOpacity
              key={pm.id}
              style={[styles.productModeBtn, sel && styles.productModeBtnSelected]}
              onPress={() => handleProductMode(pm.id)}
              activeOpacity={0.75}
            >
              {sel && (
                <Feather name="check" size={11} color="#fff" style={{ marginRight: 3 }} />
              )}
              <Text style={[styles.productModeTxt, sel && styles.productModeTxtSelected]}>
                {pm.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {productMode !== "auto" && (
        <View style={styles.forcedBanner}>
          <Feather name="lock" size={12} color={colors.primary} />
          <Text style={styles.forcedBannerText}>
            {productMode === "silkorm"
              ? "Расчёт по СилКорм® Про — доза подбирается по культуре"
              : "Расчёт по EGALIS Ferment — доза подбирается по культуре"}
          </Text>
        </View>
      )}

      {/* ── Culture Selection ── */}
      <Text style={[styles.groupLabel, { marginTop: 14 }]}>Сырьё</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginBottom: 16 }}
        contentContainerStyle={{ gap: 8, paddingRight: 4 }}
      >
        {CULTURES.map((c) => {
          const selected = c === culture;
          return (
            <TouchableOpacity
              key={c}
              style={[styles.chip, selected && styles.chipSelected]}
              onPress={() => handleCulture(c)}
              activeOpacity={0.75}
            >
              {selected && (
                <Feather name="check" size={12} color="#FFFFFF" style={{ marginRight: 4 }} />
              )}
              <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{c}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* ── Parameters Card ── */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Параметры заготовки</Text>

        <View style={styles.paramRow}>
          <Text style={styles.paramLabel}>Масса, т</Text>
          <View style={styles.inputBox}>
            <Text style={styles.inputPrefix}>=</Text>
            <TextInput
              style={styles.paramInput}
              value={mass}
              onChangeText={(v) => { setMass(v); reset(); }}
              onFocus={lockScrollX}
              placeholder="0"
              placeholderTextColor={colors.mutedForeground}
              keyboardType="decimal-pad"
            />
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.paramRow}>
          <Text style={styles.paramLabel}>Влажность, %</Text>
          <Text style={styles.moistureBig}>{moisture}</Text>
        </View>

        <MoistureSlider
          value={moisture}
          min={MOISTURE_MIN}
          max={MOISTURE_MAX}
          activeColor={moistureRisk.color}
          onChange={(v) => { setMoisture(v); reset(); }}
        />

        {/* Moisture Risk Badge */}
        <View style={[styles.riskBadge, { backgroundColor: moistureRisk.bgColor, borderColor: moistureRisk.borderColor }]}>
          <Feather name={moistureRisk.icon} size={13} color={moistureRisk.color} />
          <Text style={[styles.riskText, { color: moistureRisk.color }]}>{moistureRisk.text}</Text>
        </View>

        {moistureHint && ruleExists === false && (
          <Text style={[styles.hintText, { color: colors.warning, marginTop: 4 }]}>
            {moistureHint}
          </Text>
        )}

        <View style={styles.divider} />

        <View style={styles.paramRow}>
          <Text style={styles.paramLabel}>Производительность, т/ч</Text>
          <View style={styles.inputBox}>
            <Text style={styles.inputPrefix}>=</Text>
            <TextInput
              style={styles.paramInput}
              value={speed}
              onChangeText={(v) => { setSpeed(v); reset(); }}
              onFocus={lockScrollX}
              placeholder="0"
              placeholderTextColor={colors.mutedForeground}
              keyboardType="decimal-pad"
            />
          </View>
        </View>
      </View>

      {/* ── Method Card ── */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Способ внесения</Text>
        <View style={styles.methodRow}>
          {METHOD_OPTIONS.map((opt) => {
            const sel = method === opt.id;
            return (
              <TouchableOpacity
                key={opt.id}
                style={[styles.methodCard, sel && styles.methodCardSelected]}
                onPress={() => { setMethod(opt.id); reset(); }}
                activeOpacity={0.75}
              >
                <Ionicons
                  name={opt.icon}
                  size={24}
                  color={sel ? colors.primary : colors.mutedForeground}
                />
                <Text style={[styles.methodLabel, sel && styles.methodLabelSelected]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* EGALIS Pack & Water Selectors */}
        {(productMode === "egalis") && (
          <>
            <View style={styles.divider} />
            <Text style={styles.condLabel}>Вариант пакета EGALIS</Text>
            <View style={styles.methodRow}>
              {([50, 200] as const).map((size) => (
                <TouchableOpacity
                  key={size}
                  style={[styles.methodCard, egalisPackSize === size && styles.methodCardSelected, { flex: 1 }]}
                  onPress={() => { setEgalisPackSize(size); reset(); }}
                  activeOpacity={0.75}
                >
                  <Feather name="package" size={20} color={egalisPackSize === size ? colors.primary : colors.mutedForeground} />
                  <Text style={[styles.methodLabel, egalisPackSize === size && styles.methodLabelSelected]}>
                    {size} г
                  </Text>
                  <Text style={styles.methodSubLabel}>
                    {size === 50 ? "на 25 т" : "на 100 т"}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={[styles.divider, { marginTop: 12 }]} />
            <Text style={styles.condLabel}>Рабочий раствор на пакет</Text>
            <View style={styles.methodRow}>
              {([50, 200] as const).map((vol) => (
                <TouchableOpacity
                  key={vol}
                  style={[styles.methodCard, egalisWaterPerPack === vol && styles.methodCardSelected, { flex: 1 }]}
                  onPress={() => { setEgalisWaterPerPack(vol); reset(); }}
                  activeOpacity={0.75}
                >
                  <Feather name="droplet" size={20} color={egalisWaterPerPack === vol ? colors.primary : colors.mutedForeground} />
                  <Text style={[styles.methodLabel, egalisWaterPerPack === vol && styles.methodLabelSelected]}>
                    {vol} л
                  </Text>
                  <Text style={styles.methodSubLabel}>воды/пакет</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {/* Layer Mode for СилКорм */}
        {(productMode === "silkorm" || (productMode === "auto" && canLayerMode)) && (
          <>
            <View style={styles.divider} />
            <TouchableOpacity
              style={styles.layerModeRow}
              onPress={() => { setLayerMode((v) => !v); reset(); }}
              activeOpacity={0.75}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.condLabel}>Послойное внесение</Text>
                <Text style={styles.layerModeHint}>75% низ / 100% середина / 125% верх</Text>
              </View>
              <View style={[styles.toggle, layerMode && styles.toggleActive]}>
                <View style={[styles.toggleThumb, layerMode && styles.toggleThumbActive]} />
              </View>
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* ── Calculate Button ── */}
      <TouchableOpacity style={styles.calcButton} onPress={handleCalculate} activeOpacity={0.85}>
        <Text style={styles.calcButtonText}>Сформировать расчет</Text>
      </TouchableOpacity>

      {/* ── Result ── */}
      {result && (
        <>
          {/* EGALIS moisture warning */}
          {result.egalisWarning && (
            <View style={styles.egalisWarningBox}>
              <Feather name="alert-triangle" size={15} color="#991B1B" />
              <Text style={styles.egalisWarningText}>{result.egalisWarning}</Text>
            </View>
          )}

          <View style={styles.resultCard}>
            <Text style={styles.resultTitle}>Рекомендация</Text>

            <ResultRow
              label="Продукт:"
              value={result.product.name}
              colors={colors}
              valueStyle={{ fontFamily: "Inter_700Bold" }}
            />
            {result.isForcedProduct ? (
              <View style={styles.forcedTag}>
                <Feather name="lock" size={11} color={colors.primary} />
                <Text style={styles.forcedTagText}>Выбран вручную</Text>
              </View>
            ) : (
              <ResultRow label="Причина:" value={result.reason} colors={colors} valueStyle={{ fontFamily: "Inter_700Bold" }} />
            )}
            <View style={styles.divider} />

            <ResultRow label="Норма:" value={`${result.doseDisplay} ${result.rule.unit}`} colors={colors} />

            {/* СилКорм results */}
            {result.totalLiters !== undefined && (
              <ResultRow label="Итого препарата:" value={`${result.totalLiters} л`} colors={colors} />
            )}

            {/* Layer Mode Doses */}
            {result.layerDoses && (
              <View style={styles.layerBox}>
                <Text style={styles.layerBoxTitle}>Послойное внесение</Text>
                <View style={styles.layerRow}>
                  <LayerDoseCol label="Низ (75%)" dose={result.layerDoses.bottom} unit={result.layerDoses.unit} speed={result.input.speed} colors={colors} />
                  <LayerDoseCol label="Середина" dose={result.layerDoses.middle} unit={result.layerDoses.unit} speed={result.input.speed} colors={colors} isMain />
                  <LayerDoseCol label="Верх (125%)" dose={result.layerDoses.top} unit={result.layerDoses.unit} speed={result.input.speed} colors={colors} />
                </View>
              </View>
            )}

            {/* EGALIS results */}
            {result.totalPacks !== undefined && (
              <ResultRow label={`Пакетов (${result.packLabel}):`} value={`${result.totalPacks} шт.`} colors={colors} />
            )}
            {result.solutionLiters !== undefined && (
              <ResultRow label="Рабочий раствор:" value={`${result.solutionLiters} л (${result.solutionLPerT} л/т)`} colors={colors} />
            )}

            <ResultRow
              label="Настройка дозатора:"
              value={`${result.pumpLPH} ${result.pumpUnit}`}
              colors={colors}
              highlight
            />
            <View style={styles.divider} />
            <ResultRow
              label="Цена партии:"
              value={`${formatCurrency(result.totalCost)} BYN`}
              colors={colors}
              highlight
            />

            {result.product.id === "silkorm" && (
              <View style={styles.warningBox}>
                <Feather name="alert-triangle" size={13} color={colors.warning} />
                <Text style={styles.warningText}>
                  Используйте средства защиты: перчатки, очки
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={[styles.saveRow, saved && { borderColor: colors.accent }]}
              onPress={handleSave}
              disabled={saved}
              activeOpacity={0.8}
            >
              <Feather name={saved ? "check-circle" : "bookmark"} size={15} color={saved ? colors.accent : colors.mutedForeground} />
              <Text style={[styles.saveRowText, saved && { color: colors.accent }]}>
                {saved ? "Сохранено в историю" : "Сохранить в историю"}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.shareRow}>
            <TouchableOpacity style={styles.shareBtn} onPress={handleSharePDF} activeOpacity={0.8}>
              <Feather name="file-text" size={18} color={colors.foreground} />
              <Text style={styles.shareBtnText}>Поделиться</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.shareBtn, { borderColor: "#25D366" }]} onPress={handleShareWhatsApp} activeOpacity={0.8}>
              <Ionicons name="logo-whatsapp" size={18} color="#25D366" />
              <Text style={[styles.shareBtnText, { color: "#25D366" }]}>WhatsApp</Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      <View style={{ height: 24 }} />
    </ScrollView>
  );
}

/* ─── Layer Dose Column ─── */
function LayerDoseCol({ label, dose, unit, speed, colors, isMain }: {
  label: string; dose: number; unit: string; speed: number;
  colors: ReturnType<typeof useColors>; isMain?: boolean;
}) {
  const lph = dose * speed;
  const pumpStr = lph < 1 ? `${Math.round(lph * 1000)} мл/ч` : `${Math.round(lph * 10) / 10} л/ч`;
  return (
    <View style={{ flex: 1, alignItems: "center" }}>
      <Text style={{ fontSize: 10, fontFamily: "Inter_400Regular", color: colors.mutedForeground, marginBottom: 2 }}>{label}</Text>
      <Text style={{ fontSize: 14, fontFamily: isMain ? "Inter_700Bold" : "Inter_600SemiBold", color: isMain ? colors.primary : colors.foreground }}>
        {dose} {unit}
      </Text>
      <Text style={{ fontSize: 11, fontFamily: "Inter_400Regular", color: colors.mutedForeground }}>{pumpStr}</Text>
    </View>
  );
}

/* ─── Custom Moisture Slider ─── */
interface SliderProps {
  value: number;
  min: number;
  max: number;
  activeColor: string;
  onChange: (v: number) => void;
}

function MoistureSlider({ value, min, max, activeColor, onChange }: SliderProps) {
  const trackWidthRef = useRef(0);
  const [trackWidth, setTrackWidth] = useState(0);
  const THUMB = 20;

  const updateValue = useCallback(
    (x: number) => {
      const w = trackWidthRef.current;
      if (w === 0) return;
      const ratio = Math.max(0, Math.min(1, x / w));
      const v = Math.round(min + ratio * (max - min));
      onChange(v);
    },
    [min, max, onChange]
  );

  const panRef = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => updateValue(evt.nativeEvent.locationX),
      onPanResponderMove: (evt) => updateValue(evt.nativeEvent.locationX),
    })
  ).current;

  const fillPct = ((value - min) / (max - min)) * 100;
  const thumbLeft = trackWidth > 0 ? (fillPct / 100) * trackWidth - THUMB / 2 : 0;

  return (
    <View style={{ marginBottom: 6, marginTop: 2 }}>
      <View
        style={{ height: 28, justifyContent: "center" }}
        onLayout={(e) => {
          const w = e.nativeEvent.layout.width;
          trackWidthRef.current = w;
          setTrackWidth(w);
        }}
        {...panRef.panHandlers}
      >
        <View style={{ height: 4, backgroundColor: "#D0E4D0", borderRadius: 2 }}>
          <View style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${fillPct}%`, backgroundColor: activeColor, borderRadius: 2 }} />
        </View>
        {trackWidth > 0 && (
          <View style={{
            position: "absolute",
            left: thumbLeft,
            width: THUMB, height: THUMB,
            borderRadius: THUMB / 2,
            backgroundColor: activeColor,
            borderWidth: 3, borderColor: "#FFFFFF",
            shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.2, shadowRadius: 2, elevation: 3,
            top: "50%", marginTop: -THUMB / 2,
          }} />
        )}
      </View>
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 2 }}>
        {[0, 25, 50, 75, 100].map((tick) => (
          <Text key={tick} style={{ fontSize: 10, color: "#A0A0A0", fontFamily: "Inter_400Regular" }}>{tick}</Text>
        ))}
      </View>
    </View>
  );
}

/* ─── Result Row ─── */
function ResultRow({ label, value, colors, highlight, valueStyle }: {
  label: string; value: string;
  colors: ReturnType<typeof useColors>;
  highlight?: boolean; valueStyle?: object;
}) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 5 }}>
      <Text style={{ fontSize: 14, color: "#666", fontFamily: "Inter_400Regular", flex: 1 }}>{label}</Text>
      <Text style={[
        { fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#1A2E1A" },
        highlight && { fontSize: 16, fontFamily: "Inter_700Bold" },
        valueStyle,
      ]}>{value}</Text>
    </View>
  );
}

/* ─── Styles ─── */
function makeStyles(
  colors: ReturnType<typeof useColors>,
  isWeb: boolean,
  insets: { top: number; bottom: number }
) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    scrollContent: {
      padding: 16,
      paddingTop: isWeb ? Math.max(insets.top, 67) + 8 : 8,
      paddingBottom: isWeb ? 34 + 84 : 100,
    },
    groupLabel: {
      fontSize: 20, fontFamily: "Inter_700Bold", color: colors.foreground, marginBottom: 10,
    },
    productModeRow: {
      flexDirection: "row", gap: 8, marginBottom: 4,
    },
    productModeBtn: {
      flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
      paddingVertical: 9, borderRadius: 10,
      borderWidth: 1.5, borderColor: colors.border,
      backgroundColor: colors.card,
    },
    productModeBtnSelected: {
      backgroundColor: colors.primary, borderColor: colors.primary,
    },
    productModeTxt: {
      fontSize: 12, fontFamily: "Inter_500Medium", color: colors.mutedForeground, textAlign: "center",
    },
    productModeTxtSelected: {
      color: "#FFFFFF", fontFamily: "Inter_600SemiBold",
    },
    forcedBanner: {
      flexDirection: "row", alignItems: "center", gap: 6,
      backgroundColor: colors.secondary, borderRadius: 8,
      paddingHorizontal: 10, paddingVertical: 7, marginBottom: 2,
    },
    forcedBannerText: {
      fontSize: 12, fontFamily: "Inter_400Regular", color: colors.primary, flex: 1,
    },
    chip: {
      flexDirection: "row", alignItems: "center",
      paddingHorizontal: 14, paddingVertical: 8,
      borderRadius: 20, borderWidth: 1.5,
      borderColor: colors.border, backgroundColor: colors.card,
    },
    chipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
    chipText: { fontSize: 13, fontFamily: "Inter_500Medium", color: colors.mutedForeground },
    chipTextSelected: { color: "#FFFFFF" },
    card: {
      backgroundColor: colors.card, borderRadius: 16,
      padding: 16, marginBottom: 12,
      borderWidth: 1, borderColor: colors.border,
    },
    cardTitle: {
      fontSize: 17, fontFamily: "Inter_700Bold", color: colors.foreground, marginBottom: 14,
    },
    paramRow: {
      flexDirection: "row", alignItems: "center",
      justifyContent: "space-between", marginBottom: 10,
    },
    paramLabel: { fontSize: 14, fontFamily: "Inter_400Regular", color: colors.foreground, flex: 1 },
    inputBox: {
      flexDirection: "row", alignItems: "center",
      borderWidth: 1, borderColor: colors.border,
      borderRadius: 8, paddingHorizontal: 10, height: 38,
      width: 100, backgroundColor: colors.background,
    },
    inputPrefix: {
      fontSize: 16, color: colors.mutedForeground, marginRight: 4, fontFamily: "Inter_400Regular",
    },
    paramInput: {
      fontSize: 16, color: colors.foreground, fontFamily: "Inter_600SemiBold",
      flex: 1, textAlign: "left",
    },
    moistureBig: { fontSize: 22, fontFamily: "Inter_700Bold", color: colors.primary },
    riskBadge: {
      flexDirection: "row", alignItems: "center", gap: 6,
      borderRadius: 8, borderWidth: 1,
      paddingHorizontal: 10, paddingVertical: 6,
      marginTop: 4,
    },
    riskText: { fontSize: 12, fontFamily: "Inter_500Medium", flex: 1 },
    hintText: {
      fontSize: 11, fontFamily: "Inter_400Regular", color: colors.mutedForeground,
    },
    divider: { height: 1, backgroundColor: colors.border, marginVertical: 10 },
    methodRow: { flexDirection: "row", gap: 8 },
    methodCard: {
      flex: 1, alignItems: "center", justifyContent: "center",
      paddingVertical: 12, borderRadius: 12, borderWidth: 1.5,
      borderColor: colors.border, backgroundColor: colors.background, gap: 4,
    },
    methodCardSelected: { borderColor: colors.primary, backgroundColor: colors.secondary },
    methodLabel: {
      fontSize: 11, fontFamily: "Inter_500Medium",
      color: colors.mutedForeground, textAlign: "center",
    },
    methodLabelSelected: { color: colors.primary, fontFamily: "Inter_600SemiBold" },
    methodSubLabel: {
      fontSize: 10, fontFamily: "Inter_400Regular",
      color: colors.mutedForeground, textAlign: "center",
    },
    condLabel: {
      fontSize: 13, fontFamily: "Inter_600SemiBold",
      color: colors.foreground, marginBottom: 8,
    },
    layerModeRow: {
      flexDirection: "row", alignItems: "center", gap: 12,
    },
    layerModeHint: {
      fontSize: 11, fontFamily: "Inter_400Regular", color: colors.mutedForeground, marginTop: 2,
    },
    toggle: {
      width: 44, height: 26, borderRadius: 13,
      backgroundColor: colors.border, justifyContent: "center", padding: 2,
    },
    toggleActive: { backgroundColor: colors.primary },
    toggleThumb: {
      width: 22, height: 22, borderRadius: 11,
      backgroundColor: "#FFFFFF",
      shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.2, shadowRadius: 1, elevation: 2,
    },
    toggleThumbActive: { transform: [{ translateX: 18 }] },
    calcButton: {
      height: 52, backgroundColor: colors.primary, borderRadius: 14,
      alignItems: "center", justifyContent: "center", marginBottom: 16,
    },
    calcButtonText: { fontSize: 17, fontFamily: "Inter_700Bold", color: "#FFFFFF" },
    egalisWarningBox: {
      flexDirection: "row", alignItems: "flex-start", gap: 8,
      backgroundColor: "#FEF2F2", borderRadius: 10,
      borderWidth: 1, borderColor: "#FCA5A5",
      padding: 12, marginBottom: 10,
    },
    egalisWarningText: {
      fontSize: 13, fontFamily: "Inter_500Medium", color: "#991B1B", flex: 1,
    },
    resultCard: {
      backgroundColor: colors.card, borderRadius: 16, padding: 16,
      borderWidth: 1, borderColor: colors.border, marginBottom: 12,
    },
    resultTitle: { fontSize: 17, fontFamily: "Inter_700Bold", color: colors.foreground, marginBottom: 12 },
    forcedTag: {
      flexDirection: "row", alignItems: "center", gap: 4,
      paddingVertical: 4, paddingBottom: 6,
    },
    forcedTagText: { fontSize: 12, fontFamily: "Inter_500Medium", color: colors.primary },
    layerBox: {
      backgroundColor: colors.secondary, borderRadius: 10,
      padding: 12, marginVertical: 6,
    },
    layerBoxTitle: {
      fontSize: 12, fontFamily: "Inter_600SemiBold",
      color: colors.primary, marginBottom: 8, textAlign: "center",
    },
    layerRow: { flexDirection: "row", gap: 4 },
    warningBox: {
      flexDirection: "row", alignItems: "center", gap: 6,
      backgroundColor: "#FFF7F0", borderRadius: 8, padding: 10, marginTop: 8,
    },
    warningText: { fontSize: 12, fontFamily: "Inter_400Regular", color: colors.warning, flex: 1 },
    saveRow: {
      flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
      marginTop: 12, paddingTop: 12,
      borderTopWidth: 1, borderTopColor: colors.border,
    },
    saveRowText: { fontSize: 13, fontFamily: "Inter_500Medium", color: colors.mutedForeground },
    shareRow: { flexDirection: "row", gap: 10, marginBottom: 12 },
    shareBtn: {
      flex: 1, height: 48, borderRadius: 12, borderWidth: 1.5,
      borderColor: colors.border, backgroundColor: colors.card,
      flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    },
    shareBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: colors.foreground },
  });
}
