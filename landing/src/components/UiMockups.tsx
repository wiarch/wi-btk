import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from '../theme';

function SnipToolbarMock() {
  return (
    <View style={styles.mockFrame}>
      <View style={styles.snipBar}>
        <View style={styles.snipModes}>
          <View style={[styles.snipMode, styles.snipModeActive]}>
            <Text style={styles.snipEmoji}>📷</Text>
          </View>
          <View style={styles.snipMode}>
            <Text style={styles.snipEmoji}>🎥</Text>
          </View>
        </View>
        <View style={styles.snipDivider} />
        <View style={styles.snipBtn}>
          <Text style={styles.snipBtnText}>▭ ▾</Text>
        </View>
        <View style={styles.snipDivider} />
        <View style={styles.snipBtn}>
          <Text style={styles.snipEmoji}>🔊</Text>
        </View>
        <View style={styles.snipSpacer} />
        <View style={styles.snipClose}>
          <Text style={styles.snipBtnText}>✕</Text>
        </View>
      </View>
      <View style={styles.regionBox}>
        <View style={styles.regionBorder} />
      </View>
      <View style={styles.recordChip}>
        <View style={styles.recordDot} />
        <Text style={styles.recordTime}>00:42</Text>
        <Text style={styles.recordChevron}>▾</Text>
      </View>
    </View>
  );
}

function SettingsMock() {
  return (
    <View style={[styles.mockFrame, styles.settingsFrame]}>
      <Text style={styles.settingsTitle}>Ajustes</Text>
      <Text style={styles.settingsSub}>Atajos, inicio y idioma</Text>
      <View style={styles.settingsCard}>
        <Text style={styles.cardLabel}>Idioma</Text>
        <View style={styles.select}>
          <Text style={styles.selectText}>Español</Text>
        </View>
        <View style={styles.checkRow}>
          <View style={styles.checkBox} />
          <Text style={styles.checkLabel}>Iniciar con el sistema</Text>
        </View>
        <View style={styles.checkRow}>
          <View style={[styles.checkBox, styles.checkBoxOn]} />
          <Text style={styles.checkLabel}>Sonido al capturar</Text>
        </View>
      </View>
      <View style={styles.settingsCard}>
        <Text style={styles.cardLabel}>Atajos globales</Text>
        <View style={styles.hotkeyRow}>
          <Text style={styles.hotkeyLabel}>Captura</Text>
          <View style={styles.hotkeyPill}>
            <Text style={styles.hotkeyPillText}>Alt+Shift+S</Text>
          </View>
        </View>
        <View style={styles.hotkeyRow}>
          <Text style={styles.hotkeyLabel}>Grabación</Text>
          <View style={styles.hotkeyPill}>
            <Text style={styles.hotkeyPillText}>Alt+Shift+R</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

export function UiMockups() {
  return (
    <View style={styles.grid}>
      <View style={styles.col}>
        <Text style={styles.caption}>Barra Snipping Tool + región</Text>
        <SnipToolbarMock />
      </View>
      <View style={styles.col}>
        <Text style={styles.caption}>Panel de ajustes</Text>
        <SettingsMock />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.lg,
    justifyContent: 'center',
  },
  col: {
    flexGrow: 1,
    minWidth: 280,
    maxWidth: 420,
    gap: spacing.sm,
  },
  caption: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  mockFrame: {
    backgroundColor: '#1a1d28',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    minHeight: 220,
    overflow: 'hidden',
  },
  snipBar: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.snipBar,
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
    gap: 2,
  },
  snipModes: { flexDirection: 'row', gap: 1 },
  snipMode: {
    width: 36,
    height: 32,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  snipModeActive: { backgroundColor: 'rgba(0,0,0,0.04)' },
  snipEmoji: { fontSize: 15 },
  snipDivider: {
    width: 1,
    height: 22,
    backgroundColor: 'rgba(0,0,0,0.1)',
    marginHorizontal: 3,
  },
  snipBtn: {
    height: 32,
    paddingHorizontal: 8,
    justifyContent: 'center',
    borderRadius: 6,
  },
  snipBtnText: { color: colors.snipText, fontSize: 12, fontWeight: '500' },
  snipSpacer: { width: 40 },
  snipClose: {
    width: 28,
    height: 28,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  regionBox: {
    marginTop: spacing.lg,
    flex: 1,
    minHeight: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  regionBorder: {
    width: '70%',
    height: 90,
    borderWidth: 2,
    borderColor: colors.accent,
    borderRadius: 4,
    shadowColor: colors.accent,
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  recordChip: {
    position: 'absolute',
    bottom: 16,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(20,22,32,0.92)',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  recordDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.danger,
  },
  recordTime: { color: colors.text, fontSize: 13, fontWeight: '600', fontVariant: ['tabular-nums'] },
  recordChevron: { color: colors.muted, fontSize: 10 },
  settingsFrame: { gap: spacing.sm },
  settingsTitle: { color: colors.text, fontSize: 18, fontWeight: '700' },
  settingsSub: { color: colors.muted, fontSize: 12, marginBottom: spacing.xs },
  settingsCard: {
    backgroundColor: colors.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
  },
  cardLabel: { color: colors.muted, fontSize: 12, fontWeight: '600' },
  select: {
    backgroundColor: colors.bgElevated,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  selectText: { color: colors.text, fontSize: 13 },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  checkBox: {
    width: 16,
    height: 16,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgElevated,
  },
  checkBoxOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  checkLabel: { color: colors.text, fontSize: 13 },
  hotkeyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  hotkeyLabel: { color: colors.text, fontSize: 13 },
  hotkeyPill: {
    backgroundColor: colors.bgElevated,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  hotkeyPillText: { color: colors.muted, fontSize: 11, fontWeight: '600' },
});
