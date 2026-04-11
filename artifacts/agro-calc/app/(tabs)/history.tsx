import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ActivityIndicator,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { loadHistory, clearHistory } from "@/utils/storage";
import { formatDate } from "@/utils/calculator";

interface LocalEntry {
  id: string;
  timestamp: string;
  productId: string;
  productName: string;
  culture: string;
  mass: number;
  moisture: number;
  speed: number;
  pumpLPH: number;
  pumpUnit: string;
  totalCost: number;
  method?: string;
}

export default function HistoryScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const [entries, setEntries] = useState<LocalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmClear, setConfirmClear] = useState(false);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const local = await loadHistory();
      setEntries(local.map((r) => ({
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
        method: r.input.method,
      })));
    } catch {
      setEntries([]);
    }
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      setConfirmClear(false);
      fetchHistory();
    }, [fetchHistory])
  );

  const doClear = async () => {
    await clearHistory();
    setEntries([]);
    setConfirmClear(false);
  };

  const styles = makeStyles(colors, isWeb, insets);

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
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
            <Text style={styles.countText}>{entries.length} расчётов</Text>
            {confirmClear ? (
              <View style={styles.confirmRow}>
                <Text style={styles.confirmText}>Удалить всё?</Text>
                <TouchableOpacity style={styles.confirmYes} onPress={doClear} activeOpacity={0.7}>
                  <Text style={styles.confirmYesText}>Да</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.confirmNo} onPress={() => setConfirmClear(false)} activeOpacity={0.7}>
                  <Text style={styles.confirmNoText}>Нет</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={styles.clearBtn} onPress={() => setConfirmClear(true)} activeOpacity={0.7}>
                <Feather name="trash-2" size={13} color={colors.destructive} />
                <Text style={styles.clearText}>Очистить</Text>
              </TouchableOpacity>
            )}
          </View>
        }
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        renderItem={({ item }) => <HistoryCard item={item} colors={colors} />}
      />
    </View>
  );
}

const METHOD_LABELS: Record<string, string> = {
  combine: "через комбайн",
  sprayer: "опрыскиватель",
  manual: "ручное",
};

function HistoryCard({
  item,
  colors,
}: {
  item: LocalEntry;
  colors: ReturnType<typeof useColors>;
}) {
  const isEgalis = item.productId === "egalis";
  const methodLabel = item.method ? (METHOD_LABELS[item.method] ?? item.method) : null;

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

      <Text style={{ fontSize: 16, fontFamily: "Inter_700Bold", color: colors.foreground, marginBottom: 8 }}>
        {item.culture}
      </Text>

      <View style={{ flexDirection: "row", gap: 16, marginBottom: 10 }}>
        <InfoChip label="Масса" value={`${item.mass} т`} colors={colors} />
        <InfoChip label="Влажность" value={`${item.moisture}%`} colors={colors} />
        {item.speed > 0 && (
          <InfoChip label="Скорость" value={`${item.speed} т/ч`} colors={colors} />
        )}
        {methodLabel && (
          <InfoChip label="Внесение" value={methodLabel} colors={colors} />
        )}
      </View>

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
            {item.pumpLPH} {item.pumpUnit}
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
    clearBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 8,
      borderWidth: 1.5,
      borderColor: colors.destructive,
    },
    clearText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: colors.destructive },
    confirmRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    confirmText: {
      fontSize: 13,
      fontFamily: "Inter_400Regular",
      color: colors.mutedForeground,
    },
    confirmYes: {
      paddingHorizontal: 12,
      paddingVertical: 5,
      borderRadius: 7,
      backgroundColor: colors.destructive,
    },
    confirmYesText: {
      fontSize: 13,
      fontFamily: "Inter_600SemiBold",
      color: "#fff",
    },
    confirmNo: {
      paddingHorizontal: 12,
      paddingVertical: 5,
      borderRadius: 7,
      borderWidth: 1,
      borderColor: colors.border,
    },
    confirmNoText: {
      fontSize: 13,
      fontFamily: "Inter_500Medium",
      color: colors.mutedForeground,
    },
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
  });
}
