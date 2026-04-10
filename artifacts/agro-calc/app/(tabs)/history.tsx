import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { loadHistory, clearHistory } from "@/utils/storage";
import { formatCurrency, formatDate, type CalculationResult } from "@/utils/calculator";

export default function HistoryScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const [history, setHistory] = useState<CalculationResult[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    const data = await loadHistory();
    setHistory(data);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchHistory();
    }, [fetchHistory])
  );

  const handleClear = () => {
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
            setHistory([]);
          },
        },
      ]
    );
  };

  const styles = makeStyles(colors, isWeb, insets);

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.emptyText}>Загрузка...</Text>
      </View>
    );
  }

  if (history.length === 0) {
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
        data={history}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.listHeader}>
            <Text style={styles.countText}>{history.length} расчётов</Text>
            <TouchableOpacity onPress={handleClear} activeOpacity={0.7}>
              <Text style={styles.clearText}>Очистить</Text>
            </TouchableOpacity>
          </View>
        }
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        renderItem={({ item }) => <HistoryItem item={item} colors={colors} />}
      />
    </View>
  );
}

function HistoryItem({
  item,
  colors,
}: {
  item: CalculationResult;
  colors: ReturnType<typeof useColors>;
}) {
  const isEgalis = item.product.id === "egalis";

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
            {item.product.name}
          </Text>
        </View>
      </View>

      <Text style={{ fontSize: 16, fontFamily: "Inter_700Bold", color: colors.foreground, marginBottom: 4 }}>
        {item.input.culture}
      </Text>

      <View style={{ flexDirection: "row", gap: 16, marginBottom: 10 }}>
        <InfoChip label="Масса" value={`${item.input.mass} т`} colors={colors} />
        <InfoChip label="Влажность" value={`${item.input.moisture}%`} colors={colors} />
        <InfoChip label="Скорость" value={`${item.input.speed} т/ч`} colors={colors} />
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
        <View style={{ alignItems: "flex-end" }}>
          <Text style={{ fontSize: 11, color: colors.mutedForeground, fontFamily: "Inter_400Regular" }}>
            Стоимость
          </Text>
          <Text style={{ fontSize: 16, fontFamily: "Inter_700Bold", color: colors.foreground }}>
            {formatCurrency(item.totalCost)} BYN
          </Text>
        </View>
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
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
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
    countText: {
      fontSize: 14,
      fontFamily: "Inter_500Medium",
      color: colors.mutedForeground,
    },
    clearText: {
      fontSize: 14,
      fontFamily: "Inter_500Medium",
      color: colors.destructive,
    },
    centerContainer: {
      flex: 1,
      backgroundColor: colors.background,
      alignItems: "center",
      justifyContent: "center",
      padding: 32,
      gap: 12,
    },
    emptyTitle: {
      fontSize: 18,
      fontFamily: "Inter_600SemiBold",
      color: colors.foreground,
    },
    emptyText: {
      fontSize: 14,
      fontFamily: "Inter_400Regular",
      color: colors.mutedForeground,
      textAlign: "center",
    },
  });
}
