import React from 'react';
import {
  Bank, CreditCard, Money, Vault, ArrowsClockwise,
  ChartPieSlice, TrendUp, ShieldCheck, Buildings, Target,
  House, Coins, Diamond, Car, Briefcase,
} from 'phosphor-react-native';

const ICON_MAP = {
  savings: Bank,
  checking: CreditCard,
  cash: Money,
  credit: CreditCard,
  fd: Vault,
  rd: ArrowsClockwise,
  mutual_fund: ChartPieSlice,
  equity: TrendUp,
  lic: ShieldCheck,
  ppf: Buildings,
  nps: Target,
  real_estate: House,
  gold: Coins,
  jewelry: Diamond,
  vehicle: Car,
  stocks: TrendUp,
  fixed_deposit: Vault,
  other: Briefcase,
};

export default function TypeIcon({ type, size = 24, color = '#fff', weight = 'regular' }) {
  const Icon = ICON_MAP[type] || Briefcase;
  return <Icon size={size} color={color} weight={weight} />;
}
