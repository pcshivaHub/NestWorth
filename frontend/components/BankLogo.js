import React, { useMemo, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { FONTS, RADIUS } from '../utils/theme';
import { useTheme } from '../context/ThemeContext';
import { getInitials } from '../utils/helpers';

const LOCAL_LOGOS = {
  'hdfcbank.com':             require('../assets/logos/hdfc.png'),
  'icicibank.com':            require('../assets/logos/icici.png'),
  'sbi.co.in':                require('../assets/logos/sbi.png'),
  'axisbank.com':             require('../assets/logos/axis.png'),
  'kotak.com':                require('../assets/logos/kotak.png'),
  'idfcfirstbank.com':        require('../assets/logos/idfc.png'),
  'indusind.com':             require('../assets/logos/indusind.png'),
  'yesbank.in':               require('../assets/logos/yes.png'),
  'federalbank.co.in':        require('../assets/logos/federal.png'),
  'pnbindia.in':              require('../assets/logos/pnb.png'),
  'bankofbaroda.in':          require('../assets/logos/bob.png'),
  'canarabank.com':           require('../assets/logos/canara.png'),
  'unionbankofindia.co.in':   require('../assets/logos/union.png'),
  'indianbank.in':            require('../assets/logos/indian.png'),
  'bankofindia.co.in':        require('../assets/logos/boi.png'),
  'rblbank.com':              require('../assets/logos/rbl.png'),
  'aubank.in':                require('../assets/logos/au.png'),
};

const BANK_MAP = [
  { match: ['hdfc'],                        domain: 'hdfcbank.com' },
  { match: ['icici'],                       domain: 'icicibank.com' },
  { match: ['sbi', 'state bank'],           domain: 'sbi.co.in' },
  { match: ['axis'],                        domain: 'axisbank.com' },
  { match: ['kotak'],                       domain: 'kotak.com' },
  { match: ['idfc'],                        domain: 'idfcfirstbank.com' },
  { match: ['indusind'],                    domain: 'indusind.com' },
  { match: ['yes bank', 'yesbank'],         domain: 'yesbank.in' },
  { match: ['federal'],                     domain: 'federalbank.co.in' },
  { match: ['pnb', 'punjab national'],      domain: 'pnbindia.in' },
  { match: ['bank of baroda', 'bob'],       domain: 'bankofbaroda.in' },
  { match: ['canara'],                      domain: 'canarabank.com' },
  { match: ['union bank'],                  domain: 'unionbankofindia.co.in' },
  { match: ['indian bank'],                 domain: 'indianbank.in' },
  { match: ['bank of india'],               domain: 'bankofindia.co.in' },
  { match: ['rbl'],                         domain: 'rblbank.com' },
  { match: ['au bank', 'au small'],         domain: 'aubank.in' },
];

const getBank = (name = '') => {
  const normalized = name.toLowerCase();
  return BANK_MAP.find((item) =>
    item.match.some((keyword) => normalized.includes(keyword))
  ) || null;
};

export default function BankLogo({ name, fallback, size = 28, style, textStyle }) {
  const { colors: C } = useTheme();
  const bank = useMemo(() => getBank(name), [name]);
  const [remoteError, setRemoteError] = useState(false);
  const [remoteFallback, setRemoteFallback] = useState(false);

  const localSource = bank ? LOCAL_LOGOS[bank.domain] : null;

  const remoteUri = useMemo(() => {
    if (!bank || localSource) return null;
    if (!remoteError) return `https://logo.clearbit.com/${bank.domain}`;
    if (!remoteFallback) return `https://www.google.com/s2/favicons?sz=256&domain=${bank.domain}`;
    return null;
  }, [bank, localSource, remoteError, remoteFallback]);

  const imgSize = size - 4;

  return (
    <View style={[
      styles.logoFrame,
      { width: size, height: size, borderRadius: Math.min(size / 2, RADIUS.md), backgroundColor: C.surfaceHigh, borderColor: C.border },
      style,
    ]}>
      {localSource ? (
        <Image
          source={localSource}
          style={{ width: imgSize, height: imgSize, borderRadius: Math.max(imgSize / 2, 1) }}
          resizeMode="contain"
        />
      ) : remoteUri ? (
        <Image
          source={{ uri: remoteUri }}
          style={{ width: imgSize, height: imgSize, borderRadius: Math.max(imgSize / 2, 1) }}
          resizeMode="contain"
          onError={() => remoteError ? setRemoteFallback(true) : setRemoteError(true)}
        />
      ) : (
        <Text style={[styles.fallbackText, { fontSize: Math.max(size * 0.34, FONTS.sizes.xs), color: C.primaryLight }, textStyle]}>
          {fallback || getInitials(name || '?')}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  logoFrame: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    overflow: 'hidden',
  },
  fallbackText: { fontWeight: '800' },
});
