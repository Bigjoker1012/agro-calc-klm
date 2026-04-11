import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
  ActivityIndicator,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { loadHistory, clearHistory } from "@/utils/storage";
import { fetchServerHistory, type ServerHistoryRecord } from "@/services/sheetsApi";
import { formatDate } from "@/utils/calculator";

type HistoryEntry =
  | { source: "local"; id: string; timestamp: string; productId: string; productName: string; culture: string; mass: number; moisture: number; speed: number; pumpLPH: number; pumpUnit: string; totalCost: number }
  | { source: "server"; id: string; timestamp: string; productId: string; productName: string; culture: string; mass: number; moisture: number; method: string; pumpLPH: number; totalCost: number };

function mapProductCode(code: string): { id: string; name: string } {
  const c = (code ?? "").toUpperCase();
  if (c.includes("EGALIS") || c === "EGALIS_FERMENT") return { id: "egalis", name: "EGALIS Ferment" };
  if (c.includes("SILKORM") || c.includes("СИЛКОРМ")) return { id: "silkorm", name: "СилКорм® Про" };
  return { id: "unknown", name: code || "—" };
}

export default function HistoryScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState<"server" | "local" | "none">("none");

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      // Try server first (Google Sheets)
      const serverRecords = await fetchServerHistory(100);
      if (serverRecords.length > 0) {
        const mapped: HistoryEntry[] = serverRecords.map((r, i) => {
          const prod = mapProductCode(r.productCode);
          return {
            source: "server" as const,
            id: `srv_${r.dateTime}_${i}`,
            timestamp: r.dateTime,
            productId: prod.id,
            productName: prod.name,
            culture: r.cultureCode,
            mass: r.mass,
            moisture: r.moisture,
            method: r.method,
            pumpLPH: r.pumpLPH ?? 0,
            totalCost: r.totalPrice ?? 0,
          };
        });
        setEntries(mapped);
        setSource("server");
        setLoading(false);
        return;
      }
    } catch {}

    // Fallback to local AsyncStorage
    try {
      const local = await loadHistory();
      if (local.length > 0) {
        const mapped: HistoryEntry[] = local.map((r) => ({
          source: "local" as const,
          id: r.id,
          timestamp: r.timestamp,
          productId: r.product.id,
          productName: r.product.name,
          culture: r.input.culture,
          mass: r.input.mass,
          moisture: r.input.moisture,
          speed: r.input.speed,
          pumpLPH: r.pumpLPH,
          pumpUnit: r.pumpUnit,
          totalCost: r.totalCost,
        }));
        setEntries(mapped);
        setSource("local");
      } else {
        setEntries([]);
        setSource("none");
      }
    } catch {
      setEntries([]);
      setSource("none");
    }
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchHistory();
    }, [fetchHistory])
  );

  const handleClear = () => {
    Alert.alert(
      "Очистить локальную историю",
      "Локальные расчёты будут удалены. Данные в Google Sheets сохранятся. Продолжить?",
      [
        { text: "Отмена", style: "cancel" },
        {
          text: "Удалить",
          style: "destructive",
          onPress: async () => {
            await clearHistory();
            fetchHistory();
          },
        },
      ]
    );
  };

  const styles = makeStyles(colors, isWeb, insets);

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.emptyText}>Загрузка истории...</Text>
      </View>
    );
  }

  if (entries.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Feather name="clock" size={48} color={colors.border} />
        <Text style={styles.emptyTitle}>История пуста</Text>
        <Text style={styles.emptyText}>
          Выполните расчёт и нажмите «Сохранить в историю»
        </Text>
        <TouchableOpacity
          style={[styles.refreshBtn, { marginTop: 16 }]}
          onPress={fetchHistory}
          activeOpacity={0.7}
        >
          <Feather name="refresh-cw" size={14} color={colors.primary} />
          <Text style={styles.refreshTxt}>Обновить</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={entries}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.listHeader}>
            <View style={{ gap: 2 }}>
              <Text style={styles.countText}>{entries.length} расчётов</Text>
              <Text style={styles.sourceText}>
                {source === "server" ? "✓ из Google Sheets" : "из локального хранилища"}
              </Text>
            </View>
            <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
              <TouchableOpacity onPress={fetchHistory} activeOpacity={0.7}>
                <Feather name="refresh-cw" size={16} color={colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleClear} activeOpacity={0.7}>
                <Text style={styles.clearText}>Очистить</Text>
              </TouchableOpacity>
            </View>
          </View>
        }
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        renderItem={({ item }) => <HistoryCard item={item} colors={colors} />}
      />
    </View>
  );
}

function HistoryCard({
  item,
  colors,
}: {
  item: HistoryEntry;
  colors: ReturnType<typeof useColors>;
}) {
  const isEgalis = item.productId === "egalis";
  const pumpStr = item.source === "local" && "pumpUnit" in item
    ? `${item.pumpLPH} ${item.pumpUnit}`
    : `${item.pumpLPH} л/ч`;

  return (
    <View
      style={{
        backgroundColor: colors.card,
        borderRadius: 14,
        padding: 14,
        borderWidth: 1,
        borderColor: colors.border,
      }}
    >
      {/* Row 1: date + product badge */}
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
        <Text style={{ fontSize: 12, color: colors.mutedForeground, fontFamily: "Inter_400Regular" }}>
          {formatDate(item.timestamp)}
        </Text>
        <View
          style={{
            backgroundColor: isEgalis ? "#F0F7FF" : colors.secondary,
            paddingHorizontal: 8,
            paddingVertical: 2,
            borderRadius: 6,
          }}
        >
          <Text
            style={{
              fontSize: 11,
              fontFamily: "Inter_600SemiBold",
              color: isEgalis ? "#2563EB" : colors.primary,
            }}
          >
            {item.productName}
          </Text>
        </View>
      </View>

      {/* Culture */}
      <Text style={{ fontSize: 16, fontFamily: "Inter_700Bold", color: colors.foreground, marginBottom: 8 }}>
        {item.culture}
      </Text>

      {/* Chips row */}
      <View style={{ flexDirection: "row", gap: 16, marginBottom: 10 }}>
        <InfoChip label="Масса" value={`${item.mass} т`} colors={colors} />
        <InfoChip label="Влажность" value={`${item.moisture}%`} colors={colors} />
        {item.source === "local" && "speed" in item && (
          <InfoChip label="Скорость" value={`${item.speed} т/ч`} colors={colors} />
        )}
        {item.source === "server" && item.method && (
          <InfoChip label="Внесение" value={item.method} colors={colors} />
        )}
      </View>

      {/* Bottom: pump + cost */}
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          paddingTop: 10,
          borderTopWidth: 1,
          borderTopColor: colors.border,
        }}
      >
        <View>
          <Text style={{ fontSize: 11, color: colors.mutedForeground, fontFamily: "Inter_400Regular" }}>
            Дозатор
          </Text>
          <Text style={{ fontSize: 20, fontFamily: "Inter_700Bold", color: colors.primary }}>
            {pumpStr}
          </Text>
        </View>
        {item.totalCost > 0 && (
          <View style={{ alignItems: "flex-end" }}>
            <Text style={{ fontSize: 11, color: colors.mutedForeground, fontFamily: "Inter_400Regular" }}>
              Стоимость
            </Text>
            <Text style={{ fontSize: 16, fontFamily: "Inter_700Bold", color: colors.foreground }}>
              {item.totalCost.toFixed(2)} BYN
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

function InfoChip({
  label,
  value,
  colors,
}: {
  label: string;
  value: string;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View>
      <Text style={{ fontSize: 11, color: colors.mutedForeground, fontFamily: "Inter_400Regular" }}>
        {label}
      </Text>
      <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: colors.foreground }}>
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
    container: { flex: 1, backgroundColor: colors.background },
    listContent: {
      padding: 16,
      paddingTop: isWeb ? Math.max(insets.top, 67) + 8 : 8,
      paddingBottom: isWeb ? 34 + 84 : 100,
    },
    listHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 14,
    },
    countText: { fontSize: 14, fontFamily: "Inter_500Medium", color: colors.mutedForeground },
    sourceText: { fontSize: 11, fontFamily: "Inter_400Regular", color: colors.primary },
    clearText: { fontSize: 14, fontFamily: "Inter_500Medium", color: colors.destructive },
    centerContainer: {
      flex: 1,
      backgroundColor: colors.background,
      alignItems: "center",
      justifyContent: "center",
      padding: 32,
      gap: 12,
    },
    emptyTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold", color: colors.foreground },
    emptyText: { fontSize: 14, fontFamily: "Inter_400Regular", color: colors.mutedForeground, textAlign: "center" },
    refreshBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: colors.primary },
    refreshTxt: { fontSize: 14, fontFamily: "Inter_500Medium", color: colors.primary },
  });
}
