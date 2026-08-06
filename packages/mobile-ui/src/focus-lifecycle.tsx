import { useRef, useState, type PropsWithChildren } from 'react';
import {
  AccessibilityInfo,
  Modal as NativeModal,
  Pressable,
  StyleSheet,
  Text,
  View,
  findNodeHandle,
} from 'react-native';
import {
  lightTheme,
  radius,
  spacing,
  touchTargets,
} from '@atlas/design-tokens';
export { FocusLifecycle } from './focus-model';

interface OverlayProps {
  readonly visible: boolean;
  readonly title: string;
  readonly description?: string;
  readonly onClose: () => void;
  readonly triggerRef?: React.RefObject<View | null>;
  readonly loading?: boolean;
}

function AccessibleOverlay({
  visible,
  title,
  description,
  onClose,
  triggerRef,
  loading,
  children,
}: PropsWithChildren<OverlayProps>) {
  const titleRef = useRef<Text>(null);
  const focusTitle = () => {
    const target = findNodeHandle(titleRef.current);
    if (target) AccessibilityInfo.setAccessibilityFocus(target);
    void AccessibilityInfo.announceForAccessibility(`${title} açıldı`);
  };
  const restoreFocus = () => {
    const target = triggerRef?.current
      ? findNodeHandle(triggerRef.current)
      : null;
    if (target) AccessibilityInfo.setAccessibilityFocus(target);
  };
  const requestClose = () => {
    onClose();
  };
  return (
    <NativeModal
      accessibilityViewIsModal
      animationType="fade"
      onDismiss={restoreFocus}
      onRequestClose={requestClose}
      onShow={focusTitle}
      transparent
      visible={visible}
    >
      <View
        accessibilityLiveRegion="polite"
        importantForAccessibility="yes"
        style={styles.backdrop}
      >
        <View
          accessibilityLabel={`${title}${description ? `. ${description}` : ''}`}
          accessibilityViewIsModal
          onAccessibilityEscape={requestClose}
          accessibilityRole="alert"
          style={styles.dialog}
          testID="atlas-overlay-surface"
        >
          <Text
            accessibilityRole="header"
            ref={titleRef}
            style={styles.title}
            testID="atlas-overlay-title"
          >
            {title}
          </Text>
          {description ? <Text>{description}</Text> : null}
          {loading ? (
            <Text accessibilityLiveRegion="polite">İşlem sürüyor</Text>
          ) : null}
          {children}
          <Pressable
            accessibilityLabel="Kapat"
            accessibilityRole="button"
            onPress={requestClose}
            style={styles.action}
          >
            <Text>Kapat</Text>
          </Pressable>
        </View>
      </View>
    </NativeModal>
  );
}

export function BottomSheet(
  props: PropsWithChildren<
    OverlayProps & { readonly hasUnsavedChanges?: boolean }
  >,
) {
  return <AccessibleOverlay {...props} />;
}

export function Modal(props: PropsWithChildren<OverlayProps>) {
  return <AccessibleOverlay {...props} />;
}

export function ConfirmationDialog({
  confirmLabel,
  cancelLabel = 'Vazgeç',
  destructive = false,
  onConfirm,
  ...props
}: PropsWithChildren<
  OverlayProps & {
    readonly confirmLabel: string;
    readonly cancelLabel?: string;
    readonly destructive?: boolean;
    readonly onConfirm: () => Promise<void> | void;
  }
>) {
  const [submitting, setSubmitting] = useState(false);
  const cancel = () => {
    props.onClose();
  };
  const confirm = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      await onConfirm();
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <AccessibleOverlay {...props} loading={submitting}>
      <Pressable
        accessibilityLabel={cancelLabel}
        accessibilityRole="button"
        onPress={cancel}
        style={styles.action}
      >
        <Text>{cancelLabel}</Text>
      </Pressable>
      <Pressable
        accessibilityLabel={confirmLabel}
        accessibilityRole="button"
        accessibilityState={{ disabled: submitting }}
        disabled={submitting}
        onPress={() => void confirm()}
        style={[styles.action, destructive && styles.destructive]}
      >
        <Text>{confirmLabel}</Text>
      </Pressable>
    </AccessibleOverlay>
  );
}

const styles = StyleSheet.create({
  action: {
    alignItems: 'center',
    borderColor: lightTheme.border,
    borderRadius: radius.button,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: touchTargets.minimum,
    padding: spacing[12],
  },
  backdrop: {
    backgroundColor: 'rgba(7,20,38,0.48)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  destructive: { borderColor: lightTheme.financial.negative },
  dialog: {
    backgroundColor: lightTheme.surface,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    gap: spacing[12],
    padding: spacing[24],
  },
  title: { color: lightTheme.textPrimary, fontSize: 20, fontWeight: '700' },
});
