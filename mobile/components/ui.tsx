import type { ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
  type TextStyle,
} from "react-native";
import { colors, MIN_TOUCH } from "@/lib/theme";

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[s.card, style]}>{children}</View>;
}

export function H2({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[s.h2, style]}>{children}</Text>;
}

export function Body({ children, muted, style }: { children: ReactNode; muted?: boolean; style?: StyleProp<TextStyle> }) {
  return <Text style={[s.body, muted && { color: colors.muted }, style]}>{children}</Text>;
}

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "danger";
  busy?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Button({ label, onPress, variant = "primary", busy, disabled, style }: ButtonProps) {
  const inactive = disabled || busy;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!inactive, busy: !!busy }}
      onPress={onPress}
      disabled={inactive}
      style={({ pressed }) => [
        s.btn,
        style,
        variant === "primary" && { backgroundColor: colors.accent },
        variant === "secondary" && { borderWidth: 1, borderColor: colors.border },
        variant === "danger" && { borderWidth: 1, borderColor: colors.danger },
        inactive && { opacity: 0.5 },
        pressed && { opacity: 0.8 },
      ]}
    >
      {busy ? (
        <ActivityIndicator color={variant === "primary" ? colors.accentText : colors.text} />
      ) : (
        <Text
          style={[
            s.btnLabel,
            { color: variant === "primary" ? colors.accentText : colors.text },
            variant === "danger" && { color: colors.danger },
          ]}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}

export function ErrorBox({ message }: { message: string }) {
  return (
    <View style={[s.notice, { backgroundColor: colors.dangerBg, borderColor: colors.danger }]}>
      <Text
        accessibilityRole="alert"
        style={{ color: colors.danger, fontSize: 15, lineHeight: 22 }}
      >
        {message}
      </Text>
    </View>
  );
}

export function Mono({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[s.mono, style]}>{children}</Text>;
}

const s = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 16,
    padding: 18,
    gap: 10,
  },
  h2: { color: colors.text, fontSize: 20, fontWeight: "600" },
  body: { color: colors.textSoft, fontSize: 16, lineHeight: 24 },
  mono: { fontFamily: 'monospace', fontSize: 14 },
  btn: {
    minHeight: MIN_TOUCH + 4,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
  },
  btnLabel: { fontSize: 17, fontWeight: "700" },
  notice: { borderWidth: 1, borderRadius: 12, padding: 14 },
});
