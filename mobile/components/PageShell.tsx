import type { ReactNode } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { View } from "react-native";

interface PageShellProps {
  title: string;
  children: ReactNode;
  className?: string;
}

export function PageShell({ title, children, className }: PageShellProps) {
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <View className={`page-container ${className || ""}`}>
        <header className="flex items-center gap-3 mb-2">
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-50">{title}</h1>
        </header>
        {children}
      </View>
    </SafeAreaView>
  );
}
