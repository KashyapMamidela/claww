import React, { useCallback, useState } from 'react';
import { RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HEADER_CONTENT_HEIGHT } from './theme';
import { success } from './haptics';

/**
 * Premium D10: pull a tab down to reload it. Everything on a tab loads when it mounts, so a refresh is a short wait
 * (so the spinner is seen) and then a new `key` on the ScrollView, which remounts the screen's content and its loads.
 * Spread the result onto the ScrollView: `<ScrollView {...pull.props} />`.
 */
export function usePullToRefresh(accent: string) {
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  const [key, setKey] = useState(0);
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => {
      setKey((k) => k + 1);
      setRefreshing(false);
      success();
    }, 650);
  }, []);
  const refreshControl = (
      <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={accent} colors={[accent]} progressBackgroundColor="#1A1A1D" progressViewOffset={insets.top + HEADER_CONTENT_HEIGHT} />
  );
  return { key, refreshControl };
}
