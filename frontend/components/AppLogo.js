import React from 'react';
import { View, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const COIN_STACKS = [
  { color: '#B87333', edge: '#7A4F2D', count: 3 },  // copper (shortest)
  { color: '#B8B8C0', edge: '#787880', count: 5 },  // silver (mid)
  { color: '#FFD700', edge: '#B8860B', count: 7 },  // gold (tallest)
];

function CoinStack({ color, edge, count, coinW }) {
  return (
    <View style={{ alignItems: 'center' }}>
      {Array.from({ length: count }).map((_, i) => {
        const isTop = i === 0;
        const shade = isTop ? color : i === count - 1 ? edge : color;
        return (
          <View
            key={i}
            style={{
              width: coinW,
              height: 4,
              borderRadius: 2,
              backgroundColor: shade,
              marginBottom: i < count - 1 ? 1.5 : 0,
              opacity: isTop ? 1 : 0.9 - i * 0.04,
            }}
          />
        );
      })}
    </View>
  );
}

export default function AppLogo({ size = 90 }) {
  const coinW = Math.round(size * 0.18);
  return (
    <View style={{ alignItems: 'center' }}>
      <LinearGradient
        colors={['#FFF9E6', '#FFE066']}
        start={{ x: 0.3, y: 0 }}
        end={{ x: 0.7, y: 1 }}
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: '#FFD700',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
          elevation: 8,
        }}
      >
        <Text style={{ fontSize: Math.round(size * 0.58), lineHeight: Math.round(size * 0.72) }}>
          🪺
        </Text>
      </LinearGradient>

      {/* Coin stacks: copper | silver | gold */}
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6, marginTop: 10 }}>
        {COIN_STACKS.map((stack) => (
          <CoinStack key={stack.color} {...stack} coinW={coinW} />
        ))}
      </View>
    </View>
  );
}
