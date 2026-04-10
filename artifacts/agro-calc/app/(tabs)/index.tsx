import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal,
  FlatList,
  StyleSheet,
  Alert,
  Platform,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { CULTURES, CULTURE_MOISTURE_HINTS } from "@/constants/mockData";
import {
  calculate,
  findRule,
  formatCurrency,
  type CalculationResult,
} from "@/utils/calculator";
import { saveCalculation } from "@/utils/storage";

const MOISTURE_MIN = 20;
const MOISTURE_MAX = 80;

export default function CalculatorScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";

  const [culture, setCulture] = useState("");
  const [mass, setMass] = useState("");
  const [moisture, setMoisture] = useState(40);
  const [method, setMethod] = useState<"combine" | "sprayer">("combine");
  const [speed, setSpeed] = useState("");
  const [egalisScheme, setEgalisScheme] = useState<2 | 8>(2);
  const [result, setResult] = useState<CalculationResult | null>(null);
  const [showCultureModal, setShowCultureModal] = useState(false);
  const [saved, setSaved] = useState(false);

  const isEgalisCulture =
    culture === "Силос / Сенаж" || culture === "Влажное зерно";
  const moistureHint = culture ? CULTURE_MOISTURE_HINTS[culture] : null;
  const ruleExists = culture ? findRule(culture, moisture) !== null : null;

  const handleMoisture = useCallback(
    (delta: number) => {
      setMoisture((v) => Math.min(MOISTURE_MAX, Math.max(MOISTURE_MIN, v + delta)));
      setResult(null);
      setSaved(false);
    },
    []
  );

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
      Alert.alert("Внимание", "Введите корректную скорость уборки (т/ч)");
      return;
    }

    const calc = calculate({
      culture,
      mass: massNum,
      moisture,
      method,
      speed: speedNum,
      egalisScheme,
    });

    if (!calc) {
      Alert.alert(
        "Нет данных",
        `Для культуры "${culture}" при влажности ${moisture}% правило не найдено.\n\nПроверьте диапазон влажности:\n${CULTURE_MOISTURE_HINTS[culture]}`
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
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSaved(true);
    } catch {
      Alert.alert("Ошибка", "Не удалось сохранить расчёт");
    }
  };

  const handleReset = () => {
    setCulture("");
    setMass("");
    setMoisture(40);
    setMethod("combine");
    setSpeed("");
    setEgalisScheme(2);
    setResult(null);
    setSaved(false);
  };

  const styles = makeStyles(colors, isWeb, insets);
  const moisturePct = ((moisture - MOISTURE_MIN) / (MOISTURE_MAX - MOISTURE_MIN)) * 100;

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Culture Picker */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Параметры сырья</Text>

          <Text style={styles.label}>Культура / сырьё</Text>
          <TouchableOpacity
            style={styles.pickerButton}
            onPress={() => setShowCultureModal(true)}
            activeOpacity={0.7}
          >
            <Text
              style={
                culture ? styles.pickerText : styles.pickerPlaceholder
              }
            >
              {culture || "Выберите культуру..."}
            </Text>
            <Feather name="chevron-down" size={18} color={colors.mutedForeground} />
          </TouchableOpacity>

          <View style={styles.divider} />

          <Text style={styles.label}>Масса сырья (тонн)</Text>
          <TextInput
            style={styles.input}
            value={mass}
            onChangeText={(v) => { setMass(v); setResult(null); setSaved(false); }}
            placeholder="Например: 100"
            placeholderTextColor={colors.mutedForeground}
            keyboardType="decimal-pad"
          />

          <View style={styles.divider} />

          <View style={styles.moistureHeader}>
            <Text style={styles.label}>Влажность</Text>
            <Text style={styles.moistureValue}>{moisture}%</Text>
          </View>

          <View style={styles.moistureBar}>
            <View
              style={[
                styles.moistureFill,
                {
                  width: `${moisturePct}%` as any,
                  backgroundColor: ruleExists === false
                    ? colors.warning
                    : ruleExists === true
                    ? colors.accent
                    : colors.border,
                },
              ]}
            />
          </View>

          <View style={styles.moistureControls}>
            <View style={styles.moistureButtons}>
              <TouchableOpacity
                style={styles.moistureBtn}
                onPress={() => handleMoisture(-5)}
                activeOpacity={0.7}
              >
                <Text style={styles.moistureBtnText}>-5</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.moistureBtn}
                onPress={() => handleMoisture(-1)}
                activeOpacity={0.7}
              >
                <Text style={styles.moistureBtnText}>-1</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.moistureBtn}
                onPress={() => handleMoisture(1)}
                activeOpacity={0.7}
              >
                <Text style={styles.moistureBtnText}>+1</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.moistureBtn}
                onPress={() => handleMoisture(5)}
                activeOpacity={0.7}
              >
                <Text style={styles.moistureBtnText}>+5</Text>
              </TouchableOpacity>
            </View>
            {moistureHint && (
              <Text
                style={[
                  styles.moistureHint,
                  ruleExists === false && { color: colors.warning },
                ]}
              >
                {moistureHint}
              </Text>
            )}
          </View>
        </View>

        {/* Method & Speed */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Параметры внесения</Text>

          <Text style={styles.label}>Способ внесения</Text>
          <View style={styles.toggleRow}>
            <TouchableOpacity
              style={[
                styles.toggleBtn,
                method === "combine" && styles.toggleBtnActive,
              ]}
              onPress={() => { setMethod("combine"); setResult(null); setSaved(false); }}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.toggleBtnText,
                  method === "combine" && styles.toggleBtnTextActive,
                ]}
              >
                Комбайн
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.toggleBtn,
                method === "sprayer" && styles.toggleBtnActive,
              ]}
              onPress={() => { setMethod("sprayer"); setResult(null); setSaved(false); }}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.toggleBtnText,
                  method === "sprayer" && styles.toggleBtnTextActive,
                ]}
              >
                Опрыскиватель
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.divider} />

          <Text style={styles.label}>Скорость уборки (т/ч)</Text>
          <TextInput
            style={styles.input}
            value={speed}
            onChangeText={(v) => { setSpeed(v); setResult(null); setSaved(false); }}
            placeholder="Например: 25"
            placeholderTextColor={colors.mutedForeground}
            keyboardType="decimal-pad"
          />

          {isEgalisCulture && (
            <>
              <View style={styles.divider} />
              <Text style={styles.label}>Схема разведения EGALIS</Text>
              <View style={styles.toggleRow}>
                <TouchableOpacity
                  style={[
                    styles.toggleBtn,
                    egalisScheme === 2 && styles.toggleBtnActive,
                  ]}
                  onPress={() => { setEgalisScheme(2); setResult(null); setSaved(false); }}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.toggleBtnText,
                      egalisScheme === 2 && styles.toggleBtnTextActive,
                    ]}
                  >
                    50 г / 50 л (2 л/т)
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.toggleBtn,
                    egalisScheme === 8 && styles.toggleBtnActive,
                  ]}
                  onPress={() => { setEgalisScheme(8); setResult(null); setSaved(false); }}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.toggleBtnText,
                      egalisScheme === 8 && styles.toggleBtnTextActive,
                    ]}
                  >
                    50 г / 200 л (8 л/т)
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>

        {/* Calculate Button */}
        <TouchableOpacity
          style={styles.calcButton}
          onPress={handleCalculate}
          activeOpacity={0.85}
        >
          <Feather name="zap" size={20} color="#FFFFFF" />
          <Text style={styles.calcButtonText}>Рассчитать</Text>
        </TouchableOpacity>

        {/* Result */}
        {result && (
          <View style={styles.resultCard}>
            <Text style={styles.resultProductLabel}>
              {result.product.name}
            </Text>
            <Text style={styles.resultDoseLabel}>
              Доза: {result.doseDisplay} {result.rule.unit}
            </Text>

            <View style={styles.pumpBox}>
              <Text style={styles.pumpLabel}>НАСТРОЙКА ПОМПЫ</Text>
              <Text style={styles.pumpValue}>
                {result.pumpSetting}
              </Text>
              <Text style={styles.pumpUnit}>{result.pumpUnit}</Text>
            </View>

            <View style={styles.resultGrid}>
              {result.totalLiters !== undefined && (
                <ResultRow
                  label="Объём препарата"
                  value={`${result.totalLiters} л`}
                  colors={colors}
                />
              )}
              <ResultRow
                label="Масса препарата"
                value={`${result.totalKg} кг`}
                colors={colors}
              />
              {result.totalPacks !== undefined && (
                <ResultRow
                  label="Количество пакетов (50 г)"
                  value={`${result.totalPacks} шт.`}
                  colors={colors}
                />
              )}
              {result.solutionLiters !== undefined && (
                <ResultRow
                  label="Объём раствора"
                  value={`${result.solutionLiters} л`}
                  colors={colors}
                />
              )}
              <ResultRow
                label="Стоимость"
                value={`${formatCurrency(result.totalCost)} BYN`}
                colors={colors}
                highlight
              />
            </View>

            {result.solutionSchemeDisplay && (
              <View style={styles.schemeBox}>
                <Text style={styles.schemeText}>
                  {result.solutionSchemeDisplay}
                </Text>
              </View>
            )}

            {result.product.id === "silkorm" && (
              <View style={styles.warningBox}>
                <Feather name="alert-triangle" size={14} color={colors.warning} />
                <Text style={styles.warningText}>
                  Используйте средства защиты: перчатки, очки
                </Text>
              </View>
            )}

            <View style={styles.resultActions}>
              <TouchableOpacity
                style={[styles.saveBtn, saved && styles.saveBtnDone]}
                onPress={handleSave}
                disabled={saved}
                activeOpacity={0.8}
              >
                <Feather
                  name={saved ? "check" : "save"}
                  size={16}
                  color={saved ? colors.accent : colors.primary}
                />
                <Text
                  style={[
                    styles.saveBtnText,
                    saved && { color: colors.accent },
                  ]}
                >
                  {saved ? "Сохранено" : "Сохранить в историю"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.resetBtn}
                onPress={handleReset}
                activeOpacity={0.8}
              >
                <Feather name="refresh-ccw" size={16} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>

      {/* Culture Picker Modal */}
      <Modal
        visible={showCultureModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowCultureModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowCultureModal(false)}
        >
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Культура / сырьё</Text>
            <FlatList
              data={CULTURES}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.modalItem,
                    item === culture && styles.modalItemActive,
                  ]}
                  onPress={() => {
                    setCulture(item);
                    setResult(null);
                    setSaved(false);
                    setShowCultureModal(false);
                    Haptics.selectionAsync();
                  }}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.modalItemText,
                      item === culture && styles.modalItemTextActive,
                    ]}
                  >
                    {item}
                  </Text>
                  {item === culture && (
                    <Feather name="check" size={18} color={colors.primary} />
                  )}
                </TouchableOpacity>
              )}
              ItemSeparatorComponent={() => <View style={styles.divider} />}
            />
            <View style={{ height: Math.max(insets.bottom, 16) }} />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

function ResultRow({
  label,
  value,
  colors,
  highlight,
}: {
  label: string;
  value: string;
  colors: ReturnType<typeof useColors>;
  highlight?: boolean;
}) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 6 }}>
      <Text style={{ fontSize: 14, color: colors.mutedForeground, flex: 1 }}>
        {label}
      </Text>
      <Text
        style={{
          fontSize: 14,
          fontFamily: "Inter_600SemiBold",
          color: highlight ? colors.primary : colors.foreground,
        }}
      >
        {value}
      </Text>
    </View>
  );
}

function makeStyles(
  colors: ReturnType<typeof useColors>,
  isWeb: boolean,
  insets: { top: number; bottom: number }
) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollContent: {
      padding: 16,
      paddingTop: isWeb ? Math.max(insets.top, 67) + 8 : 8,
      paddingBottom: isWeb ? 34 + 84 : 100,
    },
    card: {
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    sectionTitle: {
      fontSize: 13,
      fontFamily: "Inter_600SemiBold",
      color: colors.mutedForeground,
      textTransform: "uppercase",
      letterSpacing: 0.8,
      marginBottom: 14,
    },
    label: {
      fontSize: 14,
      fontFamily: "Inter_500Medium",
      color: colors.foreground,
      marginBottom: 8,
    },
    input: {
      height: 44,
      borderWidth: 1,
      borderColor: colors.input,
      borderRadius: 10,
      paddingHorizontal: 12,
      fontSize: 16,
      color: colors.foreground,
      backgroundColor: colors.background,
      fontFamily: "Inter_400Regular",
    },
    pickerButton: {
      height: 44,
      borderWidth: 1,
      borderColor: colors.input,
      borderRadius: 10,
      paddingHorizontal: 12,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: colors.background,
    },
    pickerText: {
      fontSize: 16,
      color: colors.foreground,
      fontFamily: "Inter_400Regular",
    },
    pickerPlaceholder: {
      fontSize: 16,
      color: colors.mutedForeground,
      fontFamily: "Inter_400Regular",
    },
    divider: {
      height: 1,
      backgroundColor: colors.border,
      marginVertical: 12,
    },
    moistureHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 10,
    },
    moistureValue: {
      fontSize: 22,
      fontFamily: "Inter_700Bold",
      color: colors.primary,
    },
    moistureBar: {
      height: 8,
      backgroundColor: colors.muted,
      borderRadius: 4,
      overflow: "hidden",
      marginBottom: 10,
    },
    moistureFill: {
      height: "100%",
      borderRadius: 4,
    },
    moistureControls: {
      gap: 8,
    },
    moistureButtons: {
      flexDirection: "row",
      gap: 8,
    },
    moistureBtn: {
      flex: 1,
      height: 36,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.muted,
      alignItems: "center",
      justifyContent: "center",
    },
    moistureBtnText: {
      fontSize: 14,
      fontFamily: "Inter_600SemiBold",
      color: colors.primary,
    },
    moistureHint: {
      fontSize: 12,
      fontFamily: "Inter_400Regular",
      color: colors.mutedForeground,
      textAlign: "center",
    },
    toggleRow: {
      flexDirection: "row",
      gap: 8,
    },
    toggleBtn: {
      flex: 1,
      height: 40,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.muted,
    },
    toggleBtnActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    toggleBtnText: {
      fontSize: 13,
      fontFamily: "Inter_500Medium",
      color: colors.mutedForeground,
    },
    toggleBtnTextActive: {
      color: colors.primaryForeground,
    },
    calcButton: {
      height: 52,
      backgroundColor: colors.primary,
      borderRadius: 14,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      marginBottom: 16,
    },
    calcButtonText: {
      fontSize: 17,
      fontFamily: "Inter_700Bold",
      color: "#FFFFFF",
    },
    resultCard: {
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 12,
    },
    resultProductLabel: {
      fontSize: 20,
      fontFamily: "Inter_700Bold",
      color: colors.primary,
      marginBottom: 2,
    },
    resultDoseLabel: {
      fontSize: 14,
      fontFamily: "Inter_400Regular",
      color: colors.mutedForeground,
      marginBottom: 16,
    },
    pumpBox: {
      backgroundColor: colors.primary,
      borderRadius: 14,
      padding: 20,
      alignItems: "center",
      marginBottom: 16,
    },
    pumpLabel: {
      fontSize: 11,
      fontFamily: "Inter_600SemiBold",
      color: "rgba(255,255,255,0.7)",
      letterSpacing: 1.2,
      textTransform: "uppercase",
      marginBottom: 6,
    },
    pumpValue: {
      fontSize: 56,
      fontFamily: "Inter_700Bold",
      color: "#FFFFFF",
      lineHeight: 64,
    },
    pumpUnit: {
      fontSize: 18,
      fontFamily: "Inter_500Medium",
      color: "rgba(255,255,255,0.85)",
      marginTop: 2,
    },
    resultGrid: {
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingTop: 12,
      marginBottom: 12,
    },
    schemeBox: {
      backgroundColor: colors.secondary,
      borderRadius: 8,
      padding: 10,
      marginBottom: 10,
    },
    schemeText: {
      fontSize: 13,
      fontFamily: "Inter_400Regular",
      color: colors.foreground,
    },
    warningBox: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      backgroundColor: "#FFF7F0",
      borderRadius: 8,
      padding: 10,
      marginBottom: 12,
    },
    warningText: {
      fontSize: 13,
      fontFamily: "Inter_400Regular",
      color: colors.warning,
      flex: 1,
    },
    resultActions: {
      flexDirection: "row",
      gap: 10,
      alignItems: "center",
    },
    saveBtn: {
      flex: 1,
      height: 44,
      borderRadius: 10,
      borderWidth: 1.5,
      borderColor: colors.primary,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
    },
    saveBtnDone: {
      borderColor: colors.accent,
    },
    saveBtnText: {
      fontSize: 14,
      fontFamily: "Inter_600SemiBold",
      color: colors.primary,
    },
    resetBtn: {
      width: 44,
      height: 44,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: "center",
      justifyContent: "center",
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.4)",
      justifyContent: "flex-end",
    },
    modalSheet: {
      backgroundColor: colors.card,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingTop: 12,
      paddingHorizontal: 16,
      maxHeight: "70%",
    },
    modalHandle: {
      width: 36,
      height: 4,
      backgroundColor: colors.border,
      borderRadius: 2,
      alignSelf: "center",
      marginBottom: 12,
    },
    modalTitle: {
      fontSize: 17,
      fontFamily: "Inter_700Bold",
      color: colors.foreground,
      marginBottom: 12,
    },
    modalItem: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: 14,
    },
    modalItemActive: {},
    modalItemText: {
      fontSize: 16,
      fontFamily: "Inter_400Regular",
      color: colors.foreground,
    },
    modalItemTextActive: {
      fontFamily: "Inter_600SemiBold",
      color: colors.primary,
    },
  });
}
