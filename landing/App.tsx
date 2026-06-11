import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import {
  Image,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { DownloadSection } from './src/components/DownloadSection';
import { RecaptchaGate } from './src/components/RecaptchaGate';
import { UiMockups } from './src/components/UiMockups';
import { features, hotkeys, meta } from './src/data/features';
import { colors, spacing } from './src/theme';

export default function App() {
  const [captchaOk, setCaptchaOk] = useState(false);

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <View style={styles.heroBadge}>
            <Text style={styles.heroBadgeText}>Open Source · {meta.license}</Text>
          </View>
          <Image source={require('./assets/icon.png')} style={styles.logo} />
          <Text style={styles.title}>{meta.name}</Text>
          <Text style={styles.tagline}>{meta.tagline}</Text>
          <Text style={styles.version}>Versión {meta.version}</Text>
          <View style={styles.heroActions}>
            <Pressable
              style={styles.primaryBtn}
              onPress={() => {
                if (Platform.OS === 'web' && typeof document !== 'undefined') {
                  document.getElementById('download')?.scrollIntoView({ behavior: 'smooth' });
                }
              }}
            >
              <Text style={styles.primaryBtnText}>Descargar gratis</Text>
            </Pressable>
            <Pressable
              style={styles.secondaryBtn}
              onPress={() => void Linking.openURL(meta.repo)}
            >
              <Text style={styles.secondaryBtnText}>Ver repositorio</Text>
            </Pressable>
          </View>
        </View>

        <Section title="Interfaz">
          <UiMockups />
        </Section>

        <Section title="Funcionalidades">
          <View style={styles.featureGrid}>
            {features.map((f) => (
              <View key={f.title} style={styles.featureCard}>
                <Text style={styles.featureIcon}>{f.icon}</Text>
                <Text style={styles.featureTitle}>{f.title}</Text>
                <Text style={styles.featureDesc}>{f.description}</Text>
              </View>
            ))}
          </View>
        </Section>

        <Section title="Atajos por defecto">
          <View style={styles.hotkeyTable}>
            {hotkeys.map((h) => (
              <View key={h.action} style={styles.hotkeyRow}>
                <Text style={styles.hotkeyAction}>{h.action}</Text>
                <Text style={styles.hotkeyKeys}>{h.keys}</Text>
              </View>
            ))}
          </View>
        </Section>

        <Section title="Plataformas">
          <Text style={styles.platformText}>
            Windows 10/11 (x64) y Linux (Debian/Ubuntu, Arch, AppImage). Electron +
            TypeScript. Sin telemetría, sin cuenta, 100% local.
          </Text>
        </Section>

        <View nativeID="download" style={styles.downloadBlock}>
          <RecaptchaGate
            verified={captchaOk}
            onVerify={(token) => setCaptchaOk(Boolean(token))}
          />
          <DownloadSection unlocked={captchaOk} />
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Desarrollado por{' '}
            <Text
              style={styles.footerLink}
              onPress={() => void Linking.openURL(meta.authorUrl)}
            >
              {meta.author}
            </Text>
          </Text>
          <Text style={styles.footerSub}>
            Zero-Knowledge Architecture ·{' '}
            <Text
              style={styles.footerLink}
              onPress={() => void Linking.openURL(meta.authorUrl)}
            >
              wiarch.williamache.dev
            </Text>
          </Text>
          <Text style={styles.footerSub}>
            <Text style={styles.footerLink} onPress={() => void Linking.openURL(meta.repo)}>
              github.com/wiarch/wi-rec
            </Text>
            {' · '}
            Licencia libre {meta.license}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
    ...(Platform.OS === 'web' ? { minHeight: '100vh' as unknown as number } : {}),
  },
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xxl,
    gap: spacing.xxl,
    maxWidth: 960,
    width: '100%',
    alignSelf: 'center',
  },
  hero: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingTop: spacing.lg,
  },
  heroBadge: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  heroBadgeText: {
    color: '#c4b5fd',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  logo: {
    width: 72,
    height: 72,
    borderRadius: 16,
    marginTop: spacing.sm,
  },
  title: {
    color: colors.text,
    fontSize: 42,
    fontWeight: '800',
    letterSpacing: -1,
  },
  tagline: {
    color: colors.muted,
    fontSize: 17,
    textAlign: 'center',
    maxWidth: 520,
  },
  version: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '600',
  },
  heroActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    justifyContent: 'center',
    marginTop: spacing.md,
  },
  primaryBtn: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  primaryBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  secondaryBtn: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: colors.card,
  },
  secondaryBtnText: {
    color: colors.text,
    fontWeight: '600',
    fontSize: 14,
  },
  section: { gap: spacing.md },
  sectionTitle: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
  },
  featureGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    justifyContent: 'center',
  },
  featureCard: {
    flexGrow: 1,
    minWidth: 260,
    maxWidth: 300,
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: 6,
  },
  featureIcon: { fontSize: 22 },
  featureTitle: { color: colors.text, fontSize: 16, fontWeight: '700' },
  featureDesc: { color: colors.muted, fontSize: 13, lineHeight: 20 },
  hotkeyTable: {
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    maxWidth: 480,
    alignSelf: 'center',
    width: '100%',
  },
  hotkeyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  hotkeyAction: { color: colors.text, fontSize: 14 },
  hotkeyKeys: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
    fontFamily: Platform.OS === 'web' ? 'ui-monospace, monospace' : undefined,
  },
  platformText: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
    maxWidth: 640,
    alignSelf: 'center',
  },
  downloadBlock: {
    gap: spacing.lg,
    padding: spacing.lg,
    backgroundColor: colors.bgElevated,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  footer: {
    alignItems: 'center',
    gap: 6,
    paddingBottom: spacing.xxl,
  },
  footerText: { color: colors.text, fontSize: 14 },
  footerSub: { color: colors.muted, fontSize: 12, textAlign: 'center' },
  footerLink: { color: colors.primary, textDecorationLine: 'underline' },
});
