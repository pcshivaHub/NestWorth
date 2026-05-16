import React from 'react';
import { View } from 'react-native';

// left-to-right: gold (tallest) → silver → bronze (shortest)
const COIN_STACKS = [
  { topFace: '#FFE566', side: '#FFD700', edge: '#B8860B', count: 7 },  // gold
  { topFace: '#D8D8E0', side: '#C0C0C0', edge: '#787880', count: 5 },  // silver
  { topFace: '#D4804A', side: '#B87333', edge: '#7A4F2D', count: 3 },  // bronze
];

// [lengthRatio, angleDeg, cxRatio, cyRatio, color]
// cx/cy are the twig's CENTER as fractions of nestW / nestH
const TWIG_DEFS = [
  // left wall — steep at top, flattening toward floor
  [0.54, -62, 0.12, 0.22, '#6B3A2A'],
  [0.50, -50, 0.09, 0.40, '#8B5E1A'],
  [0.46, -36, 0.14, 0.58, '#7A4F2D'],
  [0.42, -20, 0.19, 0.76, '#A0722D'],
  // right wall — mirror
  [0.54,  62, 0.88, 0.22, '#6B3A2A'],
  [0.50,  50, 0.91, 0.40, '#8B5E1A'],
  [0.46,  36, 0.86, 0.58, '#7A4F2D'],
  [0.42,  20, 0.81, 0.76, '#A0722D'],
  // floor — near-horizontal crossing at the base
  [0.68,   6, 0.46, 0.88, '#8B5E1A'],
  [0.62,  -8, 0.54, 0.94, '#6B3A2A'],
  [0.56,  14, 0.40, 0.80, '#7A4F2D'],
  // rim crossings — shallow diagonals near the opening
  [0.52, -22, 0.31, 0.12, '#A0722D'],
  [0.52,  22, 0.69, 0.12, '#8B5E1A'],
  [0.48,   4, 0.50, 0.07, '#6B3A2A'],
  // interior crossing (extra weave density)
  [0.42,  40, 0.27, 0.44, '#7A4F2D'],
  [0.42, -40, 0.73, 0.44, '#A0722D'],
  // wild rim twigs sticking out beyond the edges
  [0.38, -70, 0.03, 0.17, '#6B3A2A'],
  [0.38,  70, 0.97, 0.17, '#8B5E1A'],
];

function NestTwigs({ nestW, nestH }) {
  const twigH = Math.max(2, Math.round(nestW * 0.032));

  return (
    <View style={{ width: nestW, height: nestH }}>
      {TWIG_DEFS.map(([lenR, angle, cxR, cyR, color], i) => {
        const len = Math.round(nestW * lenR);
        return (
          <View
            key={i}
            style={{
              position: 'absolute',
              width: len,
              height: twigH,
              borderRadius: twigH / 2,
              backgroundColor: color,
              // place the twig's centre at (cxR*nestW, cyR*nestH)
              top:  cyR * nestH - twigH / 2,
              left: cxR * nestW - len / 2,
              transform: [{ rotate: `${angle}deg` }],
              opacity: 0.85 + (i % 3) * 0.05,
            }}
          />
        );
      })}
    </View>
  );
}

function CoinStack({ topFace, side, edge, count, coinW, coinH, coinGap }) {
  const topH = Math.max(3, Math.round(coinW * 0.38));
  return (
    <View style={{ alignItems: 'center' }}>
      <View
        style={{
          width: coinW,
          height: topH,
          borderRadius: coinW / 2,
          backgroundColor: topFace,
          marginBottom: coinGap,
        }}
      />
      {Array.from({ length: count }).map((_, i) => (
        <View
          key={i}
          style={{
            width: coinW,
            height: coinH,
            borderRadius: 1,
            backgroundColor: i === count - 1 ? edge : side,
            marginBottom: i < count - 1 ? coinGap : 0,
            opacity: 1 - i * 0.04,
          }}
        />
      ))}
    </View>
  );
}

export default function AppLogo({ size = 90, compact = false }) {
  const coinW    = Math.max(10, Math.round(size * 0.22));
  const coinH    = Math.max(3,  Math.round(size * 0.046));
  const coinGap  = Math.max(1,  Math.round(size * 0.018));
  const stackGap = Math.max(5,  Math.round(size * 0.09));

  const nestW = Math.round(size * 0.96);
  const nestH = Math.round(size * 0.46);
  // how far the nest overlaps up into the coin stacks
  const nestOverlap = Math.round(nestH * 0.55);

  return (
    <View style={{ alignItems: 'center' }}>
      {/* Coin stacks: gold | silver | bronze */}
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: stackGap }}>
        {COIN_STACKS.map((stack) => (
          <CoinStack
            key={stack.side}
            {...stack}
            coinW={coinW}
            coinH={coinH}
            coinGap={coinGap}
          />
        ))}
      </View>

      {/* Twig nest — pulled up so coins sit inside the opening */}
      <View style={{ marginTop: -nestOverlap }}>
        <NestTwigs nestW={nestW} nestH={nestH} />
      </View>
    </View>
  );
}
