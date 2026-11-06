import { Linking, StyleSheet, Text, View } from 'react-native';
import { meta } from '../data/features';
import { colors, spacing } from '../theme';

type Props = {
  unlocked: boolean;
};

export function DownloadSection({ unlocked }: Props) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Instala solo lo que necesitas</Text>
      <Text style={styles.description}>
        WI-BTK está diseñado para instalar herramientas bajo demanda desde su propio panel.
        El catálogo modular y el instalador de módulos todavía están en desarrollo.
      </Text>
      <Text style={styles.note}>
        La distribución de WI-BTK para Windows y Linux se publicará cuando el paquete base y
        el flujo de instalación modular estén preparados.
      </Text>
      <Text
        style={styles.link}
        onPress={() => void Linking.openURL(meta.repo)}
      >
        Consultar el proyecto en GitHub
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.md,
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  title: { color: colors.text, fontSize: 20, fontWeight: '700', textAlign: 'center' },
  description: { color: colors.muted, fontSize: 14, lineHeight: 22, textAlign: 'center' },
  note: { color: colors.muted, fontSize: 12, lineHeight: 18, textAlign: 'center' },
  link: { color: colors.primary, fontSize: 13, fontWeight: '700', textDecorationLine: 'underline' },
});
