import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Alert,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { PRODUCTS, RULES, CULTURES } from "@/constants/mockData";
import { clearHistory } from "@/utils/storage";

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const [lastSync] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

  const styles = makeStyles(colors, isWeb, insets);

  const handleSync = async () => {
    setSyncing(true);
    await new Promise((r) => setTimeout(r, 1500));
    setSyncing(false);
    Alert.alert(
      "Синхронизация",
      "Функция Google Sheets будет добавлена в следующем обновлении. Сейчас используются встроенные данные КЛМ."
    );
  };

  const handleClearHistory = () => {
    Alert.alert(
      "Очистить историю",
      "Все сохранённые расчёты будут удалены. Продолжить?",
      [
        { text: "Отмена", style: "cancel" },
        {
          text: "Удалить",
          style: "destructive",
          onPress: async () => {
            await clearHistory();
            Alert.alert("Готово", "История расчётов очищена");
          },
        },
      ]
    );
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Sync Section */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Синхронизация</Text>
        <View style={styles.syncRow}>
          <View>
            <Text style={styles.syncLabel}>Источник данных</Text>
            <Text style={styles.syncValue}>Встроенная база КЛМ</Text>
          </View>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: colors.secondary },
            ]}
          >
            <View
              style={[
                styles.statusDot,
                { backgroundColor: colors.accent },
              ]}
            />
            <Text style={[styles.statusText, { color: colors.primary }]}>
              Активна
            </Text>
          </View>
        </View>
        {lastSync && (
          <Text style={styles.lastSyncText}>
            Последняя синхронизация: {lastSync}
          </Text>
        )}
        <TouchableOpacity
          style={[styles.syncBtn, syncing && { opacity: 0.7 }]}
          onPress={handleSync}
          disabled={syncing}
          activeOpacity={0.8}
        >
          <Feather
            name={syncing ? "loader" : "refresh-cw"}
            size={16}
            color={colors.primary}
          />
          <Text style={styles.syncBtnText}>
            {syncing ? "Синхронизация..." : "Синхронизировать с Google Sheets"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Products */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Справочник препаратов</Text>
        {PRODUCTS.map((p, i) => (
          <View key={p.id}>
            {i > 0 && <View style={styles.divider} />}
            <View style={styles.productRow}>
              <View style={styles.productIcon}>
                <Feather
                  name={p.form === "liquid" ? "droplet" : "package"}
                  size={18}
                  color={colors.primary}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.productName}>{p.name}</Text>
                <Text style={styles.productDetail}>
                  {p.form === "liquid" ? "Жидкость" : "Порошок"} •{" "}
                  {p.price.toLocaleString("ru-RU")} BYN/кг
                  {p.density && ` • Плотность ${p.density} кг/л`}
                  {p.packSizeG && ` • Пакет ${p.packSizeG} г`}
                </Text>
              </View>
            </View>
          </View>
        ))}
      </View>

      {/* Rules Table */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Правила дозирования</Text>
        <Text style={styles.rulesNote}>
          Изменение правил — через Google Sheets (после синхронизации)
        </Text>

        <View style={styles.tableHeader}>
          <Text style={[styles.tableCell, { flex: 2, color: "#FFFFFF" }]}>Культура</Text>
          <Text style={[styles.tableCell, { width: 80, textAlign: "center", color: "#FFFFFF" }]}>
            Влажность
          </Text>
          <Text style={[styles.tableCell, { width: 80, textAlign: "right", color: "#FFFFFF" }]}>
            Доза
          </Text>
        </View>

        {RULES.map((rule, i) => {
          const product = PRODUCTS.find((p) => p.id === rule.productId);
          const isEgalis = rule.productId === "egalis";
          return (
            <View key={rule.id}>
              <View
                style={[
                  styles.tableRow,
                  i % 2 === 0 && { backgroundColor: colors.muted },
                  isEgalis && { backgroundColor: "#F0F7FF" },
                ]}
              >
                <Text style={[styles.tableCell, { flex: 2, fontSize: 12 }]}>
                  {rule.culture}
                </Text>
                <Text
                  style={[
                    styles.tableCell,
                    { width: 80, textAlign: "center", fontSize: 12 },
                  ]}
                >
                  {rule.moistureMin === 0 && rule.moistureMax === 100
                    ? "Любая"
                    : `${rule.moistureMin}–${rule.moistureMax}%`}
                </Text>
                <Text
                  style={[
                    styles.tableCell,
                    { width: 80, textAlign: "right", fontSize: 12 },
                  ]}
                >
                  {rule.doseMin === rule.doseMax
                    ? `${rule.doseMin}`
                    : `${rule.doseMin}–${rule.doseMax}`}{" "}
                  {rule.unit}
                </Text>
              </View>
              <View
                style={{
                  paddingHorizontal: 8,
                  paddingBottom: 4,
                  backgroundColor:
                    i % 2 === 0
                      ? colors.muted
                      : isEgalis
                      ? "#F0F7FF"
                      : "transparent",
                }}
              >
                <Text
                  style={{
                    fontSize: 10,
                    color: isEgalis ? "#2563EB" : colors.primary,
                    fontFamily: "Inter_500Medium",
                  }}
                >
                  {product?.name}
                </Text>
              </View>
            </View>
          );
        })}
      </View>

      {/* Data Management */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Управление данными</Text>
        <TouchableOpacity
          style={styles.dangerBtn}
          onPress={handleClearHistory}
          activeOpacity={0.8}
        >
          <Feather name="trash-2" size={16} color={colors.destructive} />
          <Text style={styles.dangerBtnText}>Очистить историю расчётов</Text>
        </TouchableOpacity>
      </View>

      {/* Version */}
      <Text style={styles.versionText}>AgroCalc КЛМ • Версия 1.0.0</Text>

      <View style={{ height: 24 }} />
    </ScrollView>
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
    divider: {
      height: 1,
      backgroundColor: colors.border,
      marginVertical: 10,
    },
    syncRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 12,
    },
    syncLabel: {
      fontSize: 12,
      fontFamily: "Inter_400Regular",
      color: colors.mutedForeground,
    },
    syncValue: {
      fontSize: 15,
      fontFamily: "Inter_600SemiBold",
      color: colors.foreground,
    },
    statusBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 20,
    },
    statusDot: {
      width: 7,
      height: 7,
      borderRadius: 4,
    },
    statusText: {
      fontSize: 12,
      fontFamily: "Inter_600SemiBold",
    },
    lastSyncText: {
      fontSize: 12,
      fontFamily: "Inter_400Regular",
      color: colors.mutedForeground,
      marginBottom: 12,
    },
    syncBtn: {
      height: 44,
      borderRadius: 10,
      borderWidth: 1.5,
      borderColor: colors.primary,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
    },
    syncBtnText: {
      fontSize: 14,
      fontFamily: "Inter_600SemiBold",
      color: colors.primary,
    },
    productRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingVertical: 4,
    },
    productIcon: {
      width: 38,
      height: 38,
      borderRadius: 10,
      backgroundColor: colors.secondary,
      alignItems: "center",
      justifyContent: "center",
    },
    productName: {
      fontSize: 15,
      fontFamily: "Inter_600SemiBold",
      color: colors.foreground,
      marginBottom: 2,
    },
    productDetail: {
      fontSize: 12,
      fontFamily: "Inter_400Regular",
      color: colors.mutedForeground,
    },
    rulesNote: {
      fontSize: 12,
      fontFamily: "Inter_400Regular",
      color: colors.mutedForeground,
      marginBottom: 12,
      fontStyle: "italic",
    },
    tableHeader: {
      flexDirection: "row",
      paddingHorizontal: 8,
      paddingVertical: 8,
      backgroundColor: colors.primary,
      borderRadius: 8,
      marginBottom: 2,
    },
    tableRow: {
      flexDirection: "row",
      paddingHorizontal: 8,
      paddingTop: 6,
      borderRadius: 0,
    },
    tableCell: {
      fontSize: 13,
      fontFamily: "Inter_500Medium",
      color: colors.foreground,
    },
    dangerBtn: {
      height: 44,
      borderRadius: 10,
      borderWidth: 1.5,
      borderColor: colors.destructive,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
    },
    dangerBtnText: {
      fontSize: 14,
      fontFamily: "Inter_600SemiBold",
      color: colors.destructive,
    },
    versionText: {
      textAlign: "center",
      fontSize: 12,
      fontFamily: "Inter_400Regular",
      color: colors.mutedForeground,
      marginBottom: 4,
    },
  });
}
