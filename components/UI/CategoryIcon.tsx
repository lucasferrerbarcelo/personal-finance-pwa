'use client';

import React from 'react';
import {
  ShoppingCart,
  Utensils,
  Receipt,
  Car,
  Shirt,
  Laptop,
  HeartPulse,
  Tv,
  GraduationCap,
  Briefcase,
  Code,
  TrendingUp,
  DollarSign,
  Tag,
  CreditCard,
  Coffee,
  Plane,
  Home,
  AlertCircle,
  HelpCircle,
  MoreHorizontal,
} from 'lucide-react';

const ICON_MAP: Record<string, React.ElementType> = {
  ShoppingCart,
  Utensils,
  Receipt,
  Car,
  Shirt,
  Laptop,
  HeartPulse,
  Tv,
  GraduationCap,
  Briefcase,
  Code,
  TrendingUp,
  DollarSign,
  Tag,
  CreditCard,
  Coffee,
  Plane,
  Home,
  MoreHorizontal,
};

interface CategoryIconProps {
  name?: string | null;
  color?: string | null;
  className?: string;
  size?: number;
}

export function CategoryIcon({
  name,
  color = '#10b981',
  className = 'w-5 h-5',
  size,
}: CategoryIconProps) {
  const IconComponent = (name && ICON_MAP[name]) ? ICON_MAP[name] : Tag;

  return (
    <div
      className={`flex items-center justify-center rounded-xl p-2 shrink-0 ${className}`}
      style={{
        backgroundColor: color ? `${color}20` : '#10b98120',
        color: color || '#10b981',
      }}
    >
      <IconComponent size={size || 20} />
    </div>
  );
}
