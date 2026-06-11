import { useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import ReCAPTCHA from 'react-google-recaptcha';
import { colors, spacing } from '../theme';

const SITE_KEY =
  process.env.EXPO_PUBLIC_RECAPTCHA_SITE_KEY ??
  '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI';

type Props = {
  verified: boolean;
  onVerify: (token: string | null) => void;
};

export function RecaptchaGate({ verified, onVerify }: Props) {
  const ref = useRef<ReCAPTCHA>(null);

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Descargar WI-Rec</Text>
      <Text style={styles.hint}>
        Completa la verificación para desbloquear los instaladores.
      </Text>
      <View style={styles.captchaBox}>
        <ReCAPTCHA
          ref={ref}
          sitekey={SITE_KEY}
          onChange={onVerify}
          onExpired={() => onVerify(null)}
        />
      </View>
      {verified ? (
        <Text style={styles.ok}>Verificado — elige tu plataforma abajo.</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '700',
  },
  hint: {
    color: colors.muted,
    fontSize: 14,
    textAlign: 'center',
    maxWidth: 420,
  },
  captchaBox: {
    marginTop: spacing.sm,
  },
  ok: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: '600',
  },
});
