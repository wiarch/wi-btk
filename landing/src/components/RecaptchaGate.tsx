import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from '../theme';

type Props = {
  verified: boolean;
  onVerify: (token: string | null) => void;
};

export function RecaptchaGate({ verified, onVerify }: Props) {
  void onVerify;
  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Descargar WI-Rec</Text>
      <Text style={styles.hint}>Abre esta página en el navegador para descargar.</Text>
      {verified ? null : (
        <Text style={styles.note}>reCAPTCHA disponible solo en web.</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: spacing.sm },
  title: { color: colors.text, fontSize: 22, fontWeight: '700' },
  hint: { color: colors.muted, fontSize: 14, textAlign: 'center' },
  note: { color: colors.muted, fontSize: 12 },
});
