import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { meta } from '../data/features';
import { colors, spacing } from '../theme';

type Props = {
  unlocked: boolean;
};

type Download = {
  id: string;
  platform: string;
  label: string;
  file: string;
  size?: string;
};

const downloads: Download[] = [
  {
    id: 'linux-deb',
    platform: 'Linux',
    label: 'Debian / Ubuntu (.deb)',
    file: `/downloads/WI-Rec-${meta.version}-amd64.deb`,
    size: '~85 MB',
  },
  {
    id: 'linux-appimage',
    platform: 'Linux',
    label: 'AppImage (universal)',
    file: `/downloads/WI-Rec-${meta.version}-x86_64.AppImage`,
    size: '~108 MB',
  },
  {
    id: 'win-portable',
    platform: 'Windows',
    label: 'Portable (.exe x64)',
    file: `/downloads/WI-Rec-${meta.version}-x64.exe`,
    size: '~95 MB',
  },
];

function openDownload(url: string) {
  if (typeof window !== 'undefined') {
    window.open(url, '_blank', 'noopener,noreferrer');
    return;
  }
  void Linking.openURL(url);
}

export function DownloadSection({ unlocked }: Props) {
  return (
    <View style={styles.wrap}>
      <View style={styles.grid}>
        {downloads.map((item) => (
          <Pressable
            key={item.id}
            disabled={!unlocked}
            onPress={() => openDownload(item.file)}
            style={({ pressed }) => [
              styles.card,
              !unlocked && styles.cardLocked,
              unlocked && pressed && styles.cardPressed,
            ]}
          >
            <Text style={styles.platform}>{item.platform}</Text>
            <Text style={styles.label}>{item.label}</Text>
            {item.size ? <Text style={styles.size}>{item.size}</Text> : null}
            <Text style={[styles.action, !unlocked && styles.actionLocked]}>
              {unlocked ? 'Descargar' : 'Bloqueado'}
            </Text>
          </Pressable>
        ))}
      </View>
      <Text style={styles.note}>
        v{meta.version} · Licencia {meta.license} ·{' '}
        <Text
          style={styles.link}
          onPress={() => void Linking.openURL(meta.repo)}
        >
          código abierto en GitHub
        </Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.md, width: '100%', maxWidth: 720, alignSelf: 'center' },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    justifyContent: 'center',
  },
  card: {
    flexGrow: 1,
    minWidth: 200,
    maxWidth: 220,
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: 6,
  },
  cardLocked: { opacity: 0.45 },
  cardPressed: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  platform: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  label: { color: colors.text, fontSize: 15, fontWeight: '600' },
  size: { color: colors.muted, fontSize: 12 },
  action: {
    marginTop: spacing.sm,
    color: colors.accent,
    fontSize: 13,
    fontWeight: '700',
  },
  actionLocked: { color: colors.muted },
  note: { color: colors.muted, fontSize: 12, textAlign: 'center' },
  link: { color: colors.primary, textDecorationLine: 'underline' },
});
