import React, { useMemo, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { FONTS, RADIUS } from '../utils/theme';
import { useTheme } from '../context/ThemeContext';
import { getInitials } from '../utils/helpers';

const BANK_LOGOS = [
  { match: ['hdfc'], domain: 'hdfcbank.com' },
  { match: ['icici'], domain: 'icicibank.com' },
  { match: ['sbi', 'state bank of india'], domain: 'sbi.co.in' },
  { match: ['axis'], domain: 'axisbank.com' },
  { match: ['kotak'], domain: 'kotak.com' },
  { match: ['idfc'], domain: 'idfcfirstbank.com' },
  { match: ['indusind'], domain: 'indusind.com' },
  { match: ['yes bank', 'yesbank'], domain: 'yesbank.in' },
  { match: ['federal'], domain: 'federalbank.co.in' },
  { match: ['pnb', 'punjab national'], domain: 'pnbindia.in' },
  { match: ['bank of baroda', 'bob'], domain: 'bankofbaroda.in' },
  { match: ['canara'], domain: 'canarabank.com' },
  { match: ['union bank'], domain: 'unionbankofindia.co.in' },
  { match: ['indian bank'], domain: 'indianbank.in' },
  { match: ['bank of india'], domain: 'bankofindia.co.in' },
  { match: ['central bank'], domain: 'centralbankofindia.co.in' },
  { match: ['uco'], domain: 'ucobank.com' },
  { match: ['indian overseas', 'iob'], domain: 'iob.in' },
  { match: ['rbl'], domain: 'rblbank.com' },
  { match: ['au bank', 'au small'], domain: 'aubank.in' },
  { match: ['chase'], domain: 'chase.com' },
  { match: ['bank of america', 'bofa'], domain: 'bankofamerica.com' },
  { match: ['wells fargo'], domain: 'wellsfargo.com' },
  { match: ['citi', 'citibank'], domain: 'citibank.com' },
  { match: ['capital one'], domain: 'capitalone.com' },
];

const getBank = (name = '') => {
  const normalized = name.toLowerCase();
  return BANK_LOGOS.find((item) =>
    item.match.some((keyword) => normalized.includes(keyword))
  ) || null;
};

export default function BankLogo({ name, fallback, size = 28, style, textStyle }) {
  const { colors: C } = useTheme();
  const bank = useMemo(() => getBank(name), [name]);
  // 0 = try Clearbit, 1 = try Google favicon, 2 = show fallback text
  const [failCount, setFailCount] = useState(0);

  const uri = useMemo(() => {
    if (!bank) return null;
    if (failCount === 0) return `https://logo.clearbit.com/${bank.domain}`;
    if (failCount === 1) return `https://www.google.com/s2/favicons?sz=256&domain=${bank.domain}`;
    return null;
  }, [bank, failCount]);

  const imgSize = size - 4;

  return (
    <View style={[
      styles.logoFrame,
      { width: size, height: size, borderRadius: Math.min(size / 2, RADIUS.md), backgroundColor: C.surfaceHigh, borderColor: C.border },
      style,
    ]}>
      {uri ? (
        <Image
          source={{ uri }}
          style={{ width: imgSize, height: imgSize, borderRadius: Math.max(imgSize / 2, 1) }}
          resizeMode="contain"
          onError={() => setFailCount((n) => n + 1)}
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
