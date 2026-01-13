'use client';

import { useState, useRef, useEffect } from 'react';
import { CaretDown, WarningCircle, LockKey, CaretRight } from '@phosphor-icons/react';
import ViewToggle from '@/components/mod/ViewToggle';
import { ViewMode } from '@/hooks/useViewMode';

interface FilterBarProps {
  onSortChange: (sort: 'downloads' | 'date' | 'trending' | 'relevance') => void;
  activeSort: 'downloads' | 'date' | 'trending' | 'relevance';
  onFilterChange: (filter: 'all' | 'updates' | 'early-access' | 'installed') => void;
  activeFilter: 'all' | 'updates' | 'early-access' | 'installed';
  onCategoryChange: (category: string) => void;
  selectedCategory: string;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}

interface CategoryGroup {
  name: string;
  description: string;
  subcategories: string[];
}

const CATEGORY_GROUPS: CategoryGroup[] = [
  {
    name: 'Sims, âges, corps',
    description: 'Tout ce qui touche au Sim lui-même',
    subcategories: [
      'Adult', 'Teen', 'Toddler', 'Infant', 'Child', 'Elder', 'Young Adult',
      'Masculine', 'Feminine',
      'Body', 'Body Sliders', 'Body Accessories', 'Body and Face Presets', 'Facial / Body Hair',
      'Face Sliders', 'Skin Details', 'Skins', 'Skintones', 'Eye Color', 'Hairstyles', 'Makeup',
      'Likes/Dislikes', 'Traits', 'Aspirations', 'Activities and Skills', 'Career', 'Careers',
      'Club', 'Community', 'Roommates', 'Default', 'Overrides', 'Bug Fixes', 'Gameplay', 'Misc'
    ]
  },
  {
    name: 'Vêtements et style',
    description: 'Tout ce qui est porté par le Sim',
    subcategories: [
      'Clothing', 'Shirts', 'Pants', 'Skirts', 'Swimwear', 'Sleepwear',
      'Underwear and Socks', 'Shoes', 'Styled Looks',
      'Head Accessories', 'Pet Accessories', 'Jewelry', 'Occult', 'Costumes'
    ]
  },
  {
    name: 'Construction intérieure',
    description: 'Tout ce qui est à l\'intérieur de la maison',
    subcategories: [
      'Rooms', 'Living Room', 'Dining Room', 'Kitchen', 'Bathroom', 'Bedroom',
      'Kids Room', 'Study', 'Office',
      'Build Mode', 'Buy Mode', 'Furniture', 'Decor', 'Functional Objects',
      'Comfort', 'Electronics', 'Appliances', 'Entertainment',
      'Floor Tiles', 'Walls', 'Wallpapers', 'Doors', 'Windows', 'Stairs',
      'Roof', 'Roofing', 'Platform Trim', 'Lighting', 'Lighting and Shaders',
      'Storage', 'House', 'Household', 'Households'
    ]
  },
  {
    name: 'Construction extérieure et mondes',
    description: 'Ce qui touche aux terrains, jardins et mondes',
    subcategories: [
      'Outdoors', 'Landscaping', 'Park', 'Venue', 'Bar', 'Shop',
      'Recreation Center', 'Worlds', 'World Replacements', 'Terrain Paints',
      'Water Overlays', 'Map Replacements', 'Lots', 'Foundation'
    ]
  },
  {
    name: 'Animaux et créatures',
    description: 'Tout ce qui concerne les animaux',
    subcategories: [
      'Pets', 'Cats', 'Dogs', 'Other Pets', 'Pet Care', 'Occult Creatures'
    ]
  },
  {
    name: 'Langues et culture',
    description: 'Localisation et thèmes culturels',
    subcategories: [
      'Translations', 'French', 'German', 'Chinese', 'Czech', 'Polish',
      'Portuguese', 'Russian', 'Spanish', 'Thai', 'Highschool', 'Entertainment'
    ]
  },
  {
    name: 'Fichiers, scénarios et divers',
    description: 'Tout ce qui ne rentre pas ailleurs',
    subcategories: [
      'Mods', 'Save Files', 'Scenarios', 'Events', 'Recipes', 'Poses and Animations',
      'Create a Sim', 'Other'
    ]
  }
];

const SORT_OPTIONS = [
  { value: 'relevance' as const, label: 'Pertinence' },
  { value: 'trending' as const, label: 'Tendances' },
  { value: 'date' as const, label: 'Récents' },
  { value: 'downloads' as const, label: 'Populaires' },
];

const FILTER_CHIPS = [
  { id: 'all', label: 'Tout voir' },
  { id: 'updates', label: 'Mises à jour', icon: WarningCircle },
  { id: 'early-access', label: 'Early Access', icon: LockKey },
  { id: 'installed', label: 'Installés' },
];

export default function FilterBar({
  onSortChange,
  activeSort,
  onFilterChange,
  activeFilter,
  onCategoryChange,
  selectedCategory,
  viewMode,
  onViewModeChange,
}: FilterBarProps) {
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [activeGroup, setActiveGroup] = useState<string | null>(CATEGORY_GROUPS[0]?.name || null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleCategorySelect = (cat: string) => {
    if (typeof onCategoryChange !== 'function') {
      return;
    }
    onCategoryChange(cat);
    setOpenDropdown(null);
  };

  const handleSortSelect = (value: 'downloads' | 'date' | 'trending') => {
    onSortChange(value);
    setOpenDropdown(null);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpenDropdown(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="px-8 py-4 flex flex-col md:flex-row md:items-center gap-4 bg-white/50 dark:bg-ui-dark border-b border-gray-200 dark:border-ui-border sticky top-0 z-10 backdrop-blur-md">
      {/* Dropdowns */}
      <div className="flex items-center gap-2" ref={dropdownRef}>
        {/* Category Dropdown */}
        <div className="relative">
          <button
            onClick={() => setOpenDropdown(openDropdown === 'category' ? null : 'category')}
            className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-ui-panel border border-gray-300 dark:border-gray-700 rounded-lg text-sm font-medium hover:border-brand-green dark:hover:border-brand-green transition-colors"
          >
            <span>Catégorie:</span>
            <span className="text-brand-green">{selectedCategory || 'Aucune'}</span>
            <CaretDown size={16} className={`text-gray-400 transition-transform ${openDropdown === 'category' ? 'rotate-180' : ''}`} />
          </button>
          {openDropdown === 'category' && (
            <div className="absolute left-0 mt-1 bg-white dark:bg-ui-panel border border-gray-300 dark:border-gray-700 rounded-lg shadow-lg z-20 flex h-96 overflow-hidden">
              {/* Left: Category Groups */}
              <div className="w-80 border-r border-gray-300 dark:border-gray-700 overflow-y-auto">
                {/* None option */}
                <button
                  onClick={() => handleCategorySelect('')}
                  className={`w-full text-left px-3 py-2 border-b border-gray-200 dark:border-gray-700 transition-colors ${
                    selectedCategory === ''
                      ? 'bg-brand-green/10 text-brand-green font-medium'
                      : 'hover:bg-gray-50 dark:hover:bg-ui-hover text-gray-900 dark:text-gray-300'
                  }`}
                >
                  <div className="text-sm font-medium">Aucune catégorie</div>
                </button>

                {CATEGORY_GROUPS.map((group) => (
                  <button
                    key={group.name}
                    onClick={() => setActiveGroup(group.name)}
                    className={`w-full text-left px-3 py-2 border-b border-gray-200 dark:border-gray-700 transition-colors ${
                      activeGroup === group.name
                        ? 'bg-gray-100/10 text-white font-medium'
                        : 'hover:bg-gray-50 dark:hover:bg-ui-hover text-gray-900 dark:text-gray-300'
                    }`}
                  >
                    <div className="text-sm font-medium truncate">{group.name}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{group.description}</div>
                  </button>
                ))}
              </div>

              {/* Right: Subcategories */}
              <div className="flex-1 overflow-y-auto p-3">
                {activeGroup && (
                  <div className="space-y-1">
                    {CATEGORY_GROUPS.find(g => g.name === activeGroup)?.subcategories.map((subcat) => (
                      <button
                        key={subcat}
                        onClick={() => handleCategorySelect(subcat)}
                        className={`block text-left px-3 py-2 text-sm rounded transition-colors whitespace-nowrap ${
                          selectedCategory === subcat
                            ? 'bg-brand-green/10 text-brand-green'
                            : 'hover:bg-gray-100 dark:hover:bg-ui-hover text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        {subcat}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Sort Dropdown */}
        <div className="relative">
          <button
            onClick={() => setOpenDropdown(openDropdown === 'sort' ? null : 'sort')}
            className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-ui-panel border border-gray-300 dark:border-gray-700 rounded-lg text-sm font-medium hover:border-brand-green dark:hover:border-brand-green transition-colors"
          >
            <span>Trier par:</span>
            <span className="text-brand-green">
              {SORT_OPTIONS.find((o) => o.value === activeSort)?.label}
            </span>
            <CaretDown size={16} className={`text-gray-400 transition-transform ${openDropdown === 'sort' ? 'rotate-180' : ''}`} />
          </button>
          {openDropdown === 'sort' && (
            <div className="absolute left-0 mt-1 w-40 bg-white dark:bg-ui-panel border border-gray-300 dark:border-gray-700 rounded-lg shadow-lg z-20">
              {SORT_OPTIONS.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => handleSortSelect(value)}
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-ui-hover transition-colors ${
                    activeSort === value ? 'bg-brand-green/10 text-brand-green' : 'text-gray-700 dark:text-gray-300'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="w-px h-6 bg-gray-300 dark:bg-gray-700 hidden md:block mx-2" />

      {/* Quick Filter Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
        {FILTER_CHIPS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => onFilterChange(id as any)}
            className={`filter-chip px-3 py-1.5 rounded-full border text-xs font-bold whitespace-nowrap transition-colors flex items-center gap-1 ${
              activeFilter === id
                ? 'active border-brand-green bg-brand-green/10 text-brand-green'
                : 'border-gray-300 dark:border-gray-700 bg-white dark:bg-ui-panel text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-ui-hover'
            }`}
          >
            {Icon && <Icon size={16} />}
            {label}
          </button>
        ))}
      </div>

      {/* Spacer - Push ViewToggle to the right */}
      <div className="flex-1 hidden md:block" />

      {/* View Mode Toggle */}
      <ViewToggle viewMode={viewMode} onViewModeChange={onViewModeChange} />
    </div>
  );
}
