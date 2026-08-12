import {
  ScrollScreen,
  AppHeader,
  BottomSheet,
  Button,
  Card,
  ConfirmationDialog,
  DataFreshnessBadge,
  DemoBadge,
  ErrorState,
  FinancialChange,
  FinancialValue,
  OfflineState,
  ProviderRequiredState,
} from '@atlas/mobile-ui';
import { Redirect, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
export default function Catalog() {
  if (!__DEV__) return <Redirect href="/" />;
  return <DevelopmentCatalog />;
}

function DevelopmentCatalog() {
  const parameters = useLocalSearchParams<{ mode?: string }>();
  const [sheetVisible, setSheetVisible] = useState(false);
  const [dialogVisible, setDialogVisible] = useState(false);
  const sheetTrigger = useRef<View>(null);
  const dialogTrigger = useRef<View>(null);

  return (
    <ScrollScreen>
      <AppHeader title="Component Catalog" subtitle="Development only" />
      <Pressable
        accessibilityLabel="Bottom sheet aç"
        accessibilityRole="button"
        onPress={() => setSheetVisible(true)}
        ref={sheetTrigger}
        testID="catalog-open-bottom-sheet"
      >
        <Text>Bottom sheet aç</Text>
      </Pressable>
      <Pressable
        accessibilityLabel="Onay penceresini aç"
        accessibilityRole="button"
        onPress={() => setDialogVisible(true)}
        ref={dialogTrigger}
        testID="catalog-open-dialog"
      >
        <Text>Onay penceresini aç</Text>
      </Pressable>
      <DemoBadge />
      <Card>
        <FinancialValue value={1248560.35} currency />
        <FinancialChange value={0.0406} />
        <DataFreshnessBadge status="demo" timestamp="23 May 2026 15:32" />
      </Card>
      <Button label="Primary action" />
      <OfflineState />
      <ErrorState />
      <ProviderRequiredState />
      {parameters.mode !== 'dialog' ? (
        <BottomSheet
          description="Focus yaşam döngüsü doğrulama yüzeyi"
          onClose={() => setSheetVisible(false)}
          title="Filtre seçenekleri"
          triggerRef={sheetTrigger}
          visible={sheetVisible}
        >
          <Text accessibilityLabel="Sheet ilk kontrolü">
            Sheet ilk kontrolü
          </Text>
        </BottomSheet>
      ) : null}
      {parameters.mode !== 'sheet' ? (
        <ConfirmationDialog
          cancelLabel="Vazgeç"
          confirmLabel="Test işlemini onayla"
          description="Güvenli başlangıç odağı doğrulanır"
          onClose={() => setDialogVisible(false)}
          onConfirm={() => setDialogVisible(false)}
          title="İşlemi onayla"
          triggerRef={dialogTrigger}
          visible={dialogVisible}
        />
      ) : null}
    </ScrollScreen>
  );
}
