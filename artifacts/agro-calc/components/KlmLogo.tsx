import React from "react";
import Svg, { Path, Rect, Text, TSpan, Circle, Line, G } from "react-native-svg";

interface KlmLogoProps {
  height?: number;
}

const ORANGE = "#FF5900";
const GRAY   = "#4D4D4D";

export function KlmLogo({ height = 38 }: KlmLogoProps) {
  const scale = height / 38;
  const W = Math.round(116 * scale);
  const H = height;

  return (
    <Svg width={W} height={H} viewBox="0 0 116 38">
      {/* ── Wheat ear icon ── */}
      <G>
        {/* stem */}
        <Line x1="10" y1="34" x2="10" y2="8" stroke={ORANGE} strokeWidth="1.8" strokeLinecap="round" />
        {/* top kernel */}
        <Rect x="6.5" y="5" width="7" height="9" rx="3.5" fill={ORANGE} />
        {/* left kernels */}
        <Rect x="2" y="11" width="7" height="8" rx="3.5" fill={ORANGE} transform="rotate(-30 5.5 15)" />
        <Rect x="2" y="18" width="7" height="8" rx="3.5" fill={ORANGE} transform="rotate(-35 5.5 22)" />
        {/* right kernels */}
        <Rect x="7" y="11" width="7" height="8" rx="3.5" fill={ORANGE} transform="rotate(30 14.5 15)" />
        <Rect x="7" y="18" width="7" height="8" rx="3.5" fill={ORANGE} transform="rotate(35 14.5 22)" />
        {/* base leaves */}
        <Path d="M10 30 Q4 26 5 20" stroke={ORANGE} strokeWidth="1.4" fill="none" strokeLinecap="round" />
        <Path d="M10 30 Q16 26 15 20" stroke={ORANGE} strokeWidth="1.4" fill="none" strokeLinecap="round" />
      </G>

      {/* ── КЛМ text ── */}
      <Text
        x="24"
        y="21"
        fontFamily="Inter_700Bold, Arial, sans-serif"
        fontWeight="700"
        fontSize="18"
        fill={ORANGE}
        letterSpacing="0.5"
      >
        КЛМ
      </Text>

      {/* ── divider line ── */}
      <Line x1="24" y1="24" x2="112" y2="24" stroke={GRAY} strokeWidth="0.8" opacity="0.5" />

      {/* ── subtitle ── */}
      <Text
        x="24"
        y="34"
        fontFamily="Inter_500Medium, Arial, sans-serif"
        fontWeight="500"
        fontSize="9"
        fill={GRAY}
        letterSpacing="1.5"
      >
        АГРОСЕРВИС
      </Text>
    </Svg>
  );
}
