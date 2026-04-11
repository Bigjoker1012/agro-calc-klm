import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";

import { useColors } from "@/hooks/useColors";
import { PRODUCTS, RULES } from "@/constants/mockData";
import { clearHistory } from "@/utils/storage";
import {
  syncSheetData,
  flushHistoryToSheets,
  getSyncStatus,
  type SyncStatus,
} from "@/services/sheetsApi";

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [cleared, setCleared] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    connected: false,
    lastSync: null,
    unsyncedCount: 0,
    lastError: null,
  });

  const styles = makeStyles(colors, isWeb, insets);

  const loadStatus = useCallback(async () => {
    const s = await getSyncStatus();
    setSyncStatus(s);
  }, []);

  useFocusEffect(useCallback(() => {
    setConfirmClear(false);
    setCleared(false);
    setSyncMessage(null);
    loadStatus();
  }, [loadStatus]));

  const handleSync = async () => {
    setSyncing(true);
    setSyncMessage(null);
    try {
      const dataOk = await syncSheetData();
      const { sent } = await flushHistoryToSheets();
      await loadStatus();
      if (dataOk) {
        setSyncMessage({
          ok: true,
          text: sent > 0
            ? `Справочники обновлены. Отправлено расчётов: ${sent}`
            : "Справочники обновлены из Google Sheets",
        });
      } else {
        setSyncMessage({ ok: false, text: "Нет связи с Google Sheets. Используются локальные данные КЛМ." });
      }
    } catch {
      setSyncMessage({ ok: false, text: "Синхронизация не удалась" });
    } finally {
      setSyncing(false);
    }
  };

  const doClearHistory = async () => {
    await clearHistory();
    await loadStatus();
    setConfirmClear(false);
    setCleared(true);
  };

  const formatLastSync = (iso: string | null): string => {
    if (!iso) return "Нет данных";
    const d = new Date(iso);
    return d.toLocaleDateString("ru-RU", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
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
            <Text style={styles.syncValue}>Google Sheets КЛМ</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: syncStatus.connected ? "#F0FDF4" : "#FFF7ED" }]}>
            <View style={[styles.statusDot, { backgroundColor: syncStatus.connected ? "#16A34A" : "#D97706" }]} />
            <Text style={[styles.statusText, { color: syncStatus.connected ? "#16A34A" : "#D97706" }]}>
              {syncStatus.connected ? "Активна" : "Офлайн"}
            </Text>
          </View>
        </View>

        <View style={styles.syncInfoGrid}>
          <View style={styles.syncInfoCell}>
            <Text style={styles.syncInfoLabel}>Последняя синхр.</Text>
            <Text style={styles.syncInfoValue}>{formatLastSync(syncStatus.lastSync)}</Text>
          </View>
          <View style={styles.syncInfoCell}>
            <Text style={styles.syncInfoLabel}>Не отправлено</Text>
            <Text style={[styles.syncInfoValue, syncStatus.unsyncedCount > 0 && { color: colors.warning }]}>
              {syncStatus.unsyncedCount > 0 ? `${syncStatus.unsyncedCount} расчётов` : "Все отправлены"}
            </Text>
          </View>
        </View>

        {syncStatus.lastError && (
          <View style={styles.errorBox}>
            <Feather name="alert-circle" size={13} color="#B91C1C" />
            <Text style={styles.errorText} numberOfLines={2}>{syncStatus.lastError}</Text>
          </View>
        )}

        {syncMessage && (
          <View style={[styles.msgBox, { backgroundColor: syncMessage.ok ? "#F0FDF4" : "#FFF7ED" }]}>
            <Feather name={syncMessage.ok ? "check-circle" : "alert-circle"} size={13} color={syncMessage.ok ? "#16A34A" : "#D97706"} />
            <Text style={[styles.msgText, { color: syncMessage.ok ? "#16A34A" : "#92400E" }]}>{syncMessage.text}</Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.syncBtn, syncing && { opacity: 0.7 }]}
          onPress={handleSync}
          disabled={syncing}
          activeOpacity={0.8}
        >
          <Feather name={syncing ? "loader" : "refresh-cw"} size={16} color={colors.primary} />
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
          Управление правилами — через Google Sheets (после синхронизации)
        </Text>

        <View style={styles.tableHeader}>
          <Text style={[styles.tableCell, { flex: 2, color: "#FFFFFF" }]}>Культура</Text>
          <Text style={[styles.tableCell, { width: 80, textAlign: "center", color: "#FFFFFF" }]}>Влажность</Text>
          <Text style={[styles.tableCell, { width: 80, textAlign: "right", color: "#FFFFFF" }]}>Доза</Text>
        </View>

        {RULES.map((rule, i) => {
          const product = PRODUCTS.find((p) => p.id === rule.productId);
          const isEgalis = rule.productId === "egalis";
          return (
            <View key={rule.id}>
              <View style={[
                styles.tableRow,
                i % 2 === 0 && { backgroundColor: colors.muted },
                isEgalis && { backgroundColor: "#F0F7FF" },
              ]}>
                <Text style={[styles.tableCell, { flex: 2, fontSize: 12 }]}>
                  {rule.culture}
                </Text>
                <Text style={[styles.tableCell, { width: 80, textAlign: "center", fontSize: 12 }]}>
                  {rule.moistureMin === 0 && rule.moistureMax === 100
                    ? "Любая"
                    : `${rule.moistureMin}–${rule.moistureMax}%`}
                </Text>
                <Text style={[styles.tableCell, { width: 80, textAlign: "right", fontSize: 12 }]}>
                  {rule.doseMin === rule.doseMax ? `${rule.doseMin}` : `${rule.doseMin}–${rule.doseMax}`}{" "}
                  {rule.unit}
                </Text>
              </View>
              <View style={{
                paddingHorizontal: 8, paddingBottom: 4,
                backgroundColor: i % 2 === 0 ? colors.muted : isEgalis ? "#F0F7FF" : "transparent",
              }}>
                <Text style={{ fontSize: 10, color: isEgalis ? "#2563EB" : colors.primary, fontFamily: "Inter_500Medium" }}>
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
        {cleared ? (
          <View style={styles.msgBox}>
            <Feather name="check-circle" size={13} color="#16A34A" />
            <Text style={[styles.msgText, { color: "#16A34A" }]}>История очищена</Text>
          </View>
        ) : confirmClear ? (
          <View>
            <Text style={styles.confirmLabel}>Удалить всю историю на этом устройстве?</Text>
            <View style={styles.confirmBtns}>
              <TouchableOpacity style={styles.confirmYes} onPress={doClearHistory} activeOpacity={0.8}>
                <Feather name="trash-2" size={14} color="#fff" />
                <Text style={styles.confirmYesText}>Удалить</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmNo} onPress={() => setConfirmClear(false)} activeOpacity={0.8}>
                <Text style={styles.confirmNoText}>Отмена</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <TouchableOpacity style={styles.dangerBtn} onPress={() => setConfirmClear(true)} activeOpacity={0.8}>
            <Feather name="trash-2" size={16} color={colors.destructive} />
            <Text style={styles.dangerBtnText}>Очистить историю расчётов</Text>
          </TouchableOpacity>
        )}
      </View>

      <Text style={styles.versionText}>AgroCalc КЛМ • Версия 1.1.0</Text>
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
    container: { flex: 1, backgroundColor: colors.background },
    scrollContent: {
      padding: 16,
      paddingTop: isWeb ? Math.max(insets.top, 67) + 8 : 8,
      paddingBottom: isWeb ? 34 + 84 : 100,
    },
    card: {
      backgroundColor: colors.card, borderRadius: 16,
      padding: 16, marginBottom: 12,
      borderWidth: 1, borderColor: colors.border,
    },
    sectionTitle: {
      fontSize: 13, fontFamily: "Inter_600SemiBold",
      color: colors.mutedForeground, textTransform: "uppercase",
      letterSpacing: 0.8, marginBottom: 14,
    },
    divider: { height: 1, backgroundColor: colors.border, marginVertical: 10 },
    syncRow: {
      flexDirection: "row", justifyContent: "space-between",
      alignItems: "center", marginBottom: 12,
    },
    syncLabel: { fontSize: 12, fontFamily: "Inter_400Regular", color: colors.mutedForeground },
    syncValue: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: colors.foreground },
    statusBadge: {
      flexDirection: "row", alignItems: "center", gap: 5,
      paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
    },
    statusDot: { width: 7, height: 7, borderRadius: 4 },
    statusText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
    syncInfoGrid: { flexDirection: "row", gap: 12, marginBottom: 12 },
    syncInfoCell: { flex: 1, backgroundColor: colors.muted, borderRadius: 8, padding: 10 },
    syncInfoLabel: { fontSize: 11, fontFamily: "Inter_400Regular", color: colors.mutedForeground, marginBottom: 3 },
    syncInfoValue: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: colors.foreground },
    errorBox: {
      flexDirection: "row", alignItems: "center", gap: 6,
      backgroundColor: "#FEF2F2", borderRadius: 8,
      padding: 8, marginBottom: 10,
    },
    errorText: { fontSize: 11, fontFamily: "Inter_400Regular", color: "#B91C1C", flex: 1 },
    msgBox: {
      flexDirection: "row", alignItems: "center", gap: 6,
      backgroundColor: "#F0FDF4", borderRadius: 8,
      padding: 10, marginBottom: 10,
    },
    msgText: { fontSize: 12, fontFamily: "Inter_500Medium", flex: 1 },
    syncBtn: {
      height: 44, borderRadius: 10, borderWidth: 1.5,
      borderColor: colors.primary,
      flexDirection: "row", alignItems: "center",
      justifyContent: "center", gap: 8,
    },
    syncBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: colors.primary },
    productRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 4 },
    productIcon: {
      width: 38, height: 38, borderRadius: 10,
      backgroundColor: colors.secondary,
      alignItems: "center", justifyContent: "center",
    },
    productName: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: colors.foreground, marginBottom: 2 },
    productDetail: { fontSize: 12, fontFamily: "Inter_400Regular", color: colors.mutedForeground },
    rulesNote: {
      fontSize: 12, fontFamily: "Inter_400Regular",
      color: colors.mutedForeground, marginBottom: 12, fontStyle: "italic",
    },
    tableHeader: {
      flexDirection: "row", paddingHorizontal: 8, paddingVertical: 8,
      backgroundColor: colors.primary, borderRadius: 8, marginBottom: 2,
    },
    tableRow: { flexDirection: "row", paddingHorizontal: 8, paddingTop: 6 },
    tableCell: { fontSize: 13, fontFamily: "Inter_500Medium", color: colors.foreground },
    dangerBtn: {
      height: 44, borderRadius: 10, borderWidth: 1.5,
      borderColor: colors.destructive,
      flexDirection: "row", alignItems: "center",
      justifyContent: "center", gap: 8,
    },
    dangerBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: colors.destructive },
    confirmLabel: {
      fontSize: 14, fontFamily: "Inter_500Medium",
      color: colors.foreground, marginBottom: 12,
    },
    confirmBtns: { flexDirection: "row", gap: 10 },
    confirmYes: {
      flex: 1, height: 42, borderRadius: 10,
      backgroundColor: colors.destructive,
      flexDirection: "row", alignItems: "center",
      justifyContent: "center", gap: 6,
    },
    confirmYesText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#fff" },
    confirmNo: {
      flex: 1, height: 42, borderRadius: 10,
      borderWidth: 1.5, borderColor: colors.border,
      alignItems: "center", justifyContent: "center",
    },
    confirmNoText: { fontSize: 14, fontFamily: "Inter_500Medium", color: colors.mutedForeground },
    versionText: {
      textAlign: "center", fontSize: 12,
      fontFamily: "Inter_400Regular", color: colors.mutedForeground, marginBottom: 4,
    },
  });
}
