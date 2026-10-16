import React from 'react'
import {
    User,
    MapPin,
    Building,
    BookOpen,
    Package,
    Sparkles,
    Crown,
    Scroll,
    Zap,
    Sword,
    Shield,
    Heart,
    Skull,
    Globe,
    Compass,
    Feather,
    Flag,
    Key,
    Tag,
    Flame,
    Coins,
    Wand2
} from 'lucide-react'

export const AVAILABLE_CODEX_ICONS: { name: string; label: string; component: React.ComponentType<{ size?: number; color?: string; style?: React.CSSProperties; className?: string }> }[] = [
    { name: 'User', label: 'Person / Character', component: User },
    { name: 'MapPin', label: 'Location / Place', component: MapPin },
    { name: 'Building', label: 'Organization / Faction', component: Building },
    { name: 'BookOpen', label: 'Lore / Document', component: BookOpen },
    { name: 'Package', label: 'Item / Object', component: Package },
    { name: 'Sparkles', label: 'Creature / Wonder', component: Sparkles },
    { name: 'Crown', label: 'Culture / Royalty', component: Crown },
    { name: 'Scroll', label: 'Event / History', component: Scroll },
    { name: 'Zap', label: 'Technology / Power', component: Zap },
    { name: 'Wand2', label: 'Magic / Ability', component: Wand2 },
    { name: 'Sword', label: 'Weapon / Combat', component: Sword },
    { name: 'Shield', label: 'Defense / Armor', component: Shield },
    { name: 'Heart', label: 'Bond / Emotion', component: Heart },
    { name: 'Flame', label: 'Elemental / Fire', component: Flame },
    { name: 'Coins', label: 'Economy / Currency', component: Coins },
    { name: 'Skull', label: 'Hazard / Danger', component: Skull },
    { name: 'Globe', label: 'World / Realm', component: Globe },
    { name: 'Compass', label: 'Navigation / Travel', component: Compass },
    { name: 'Feather', label: 'Writing / Art', component: Feather },
    { name: 'Flag', label: 'Nation / Banner', component: Flag },
    { name: 'Key', label: 'Secret / Artifact', component: Key },
    { name: 'Tag', label: 'General / Concept', component: Tag }
]

export const CODEX_COLOR_PALETTE = [
    { label: 'Purple', hex: '#8b5cf6' },
    { label: 'Indigo', hex: '#6366f1' },
    { label: 'Blue', hex: '#3b82f6' },
    { label: 'Cyan', hex: '#06b6d4' },
    { label: 'Teal', hex: '#14b8a6' },
    { label: 'Green', hex: '#10b981' },
    { label: 'Amber', hex: '#f59e0b' },
    { label: 'Orange', hex: '#f97316' },
    { label: 'Rose', hex: '#f43f5e' },
    { label: 'Pink', hex: '#ec4899' }
]

interface CodexIconProps {
    name?: string;
    size?: number;
    color?: string;
    style?: React.CSSProperties;
    className?: string;
}

export function CodexIcon({ name = 'Tag', size = 16, color, style, className }: CodexIconProps) {
    const found = AVAILABLE_CODEX_ICONS.find(i => i.name.toLowerCase() === name.toLowerCase())
    const IconComponent = found ? found.component : Tag
    return <IconComponent size={size} color={color} style={style} className={className} />
}
