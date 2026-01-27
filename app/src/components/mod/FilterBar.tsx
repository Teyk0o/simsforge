'use client';

import { useState, useRef, useEffect } from 'react';
import { CaretDown, WarningCircle, LockKey, CaretRight } from '@phosphor-icons/react';
import ViewToggle from '@/components/mod/ViewToggle';
import { ViewMode } from '@/hooks/useViewMode';
import { useTranslation } from 'react-i18next';
import { useCategoryLocalization } from '@/utils/categoryTranslation';

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
  id: string;
  subcategories: Array<{ key: string; displayName: string }>;
}

// Maps category group IDs to their translation keys and display names
// displayName is the actual CurseForge category name (what the API expects)
const CATEGORY_GROUPS: CategoryGroup[] = [
  {
    id: 'sims_ages_body',
    subcategories: [
      { key: 'adult', displayName: 'Adult' },
      { key: 'teen', displayName: 'Teen' },
      { key: 'toddler', displayName: 'Toddler' },
      { key: 'infant', displayName: 'Infant' },
      { key: 'child', displayName: 'Child' },
      { key: 'elder', displayName: 'Elder' },
      { key: 'young_adult', displayName: 'Young Adult' },
      { key: 'masculine', displayName: 'Masculine' },
      { key: 'feminine', displayName: 'Feminine' },
      { key: 'body', displayName: 'Body' },
      { key: 'body_sliders', displayName: 'Body Sliders' },
      { key: 'body_accessories', displayName: 'Body Accessories' },
      { key: 'body_and_face_presets', displayName: 'Body and Face Presets' },
      { key: 'facial_body_hair', displayName: 'Facial / Body Hair' },
      { key: 'face_sliders', displayName: 'Face Sliders' },
      { key: 'skin_details', displayName: 'Skin Details' },
      { key: 'skins', displayName: 'Skins' },
      { key: 'skintones', displayName: 'Skintones' },
      { key: 'eye_color', displayName: 'Eye Color' },
      { key: 'hairstyles', displayName: 'Hairstyles' },
      { key: 'makeup', displayName: 'Makeup' },
      { key: 'likes_dislikes', displayName: 'Likes/Dislikes' },
      { key: 'traits', displayName: 'Traits' },
      { key: 'aspirations', displayName: 'Aspirations' },
      { key: 'activities_and_skills', displayName: 'Activities and Skills' },
      { key: 'career', displayName: 'Career' },
      { key: 'careers', displayName: 'Careers' },
      { key: 'club', displayName: 'Club' },
      { key: 'community', displayName: 'Community' },
      { key: 'roommates', displayName: 'Roommates' },
      { key: 'default', displayName: 'Default' },
      { key: 'overrides', displayName: 'Overrides' },
      { key: 'bug_fixes', displayName: 'Bug Fixes' },
      { key: 'gameplay', displayName: 'Gameplay' },
      { key: 'misc', displayName: 'Misc' }
    ]
  },
  {
    id: 'clothing_style',
    subcategories: [
      { key: 'clothing', displayName: 'Clothing' },
      { key: 'shirts', displayName: 'Shirts' },
      { key: 'pants', displayName: 'Pants' },
      { key: 'skirts', displayName: 'Skirts' },
      { key: 'swimwear', displayName: 'Swimwear' },
      { key: 'sleepwear', displayName: 'Sleepwear' },
      { key: 'underwear_and_socks', displayName: 'Underwear and Socks' },
      { key: 'shoes', displayName: 'Shoes' },
      { key: 'styled_looks', displayName: 'Styled Looks' },
      { key: 'head_accessories', displayName: 'Head Accessories' },
      { key: 'pet_accessories', displayName: 'Pet Accessories' },
      { key: 'jewelry', displayName: 'Jewelry' },
      { key: 'occult', displayName: 'Occult' },
      { key: 'costumes', displayName: 'Costumes' }
    ]
  },
  {
    id: 'interior_construction',
    subcategories: [
      { key: 'rooms', displayName: 'Rooms' },
      { key: 'living_room', displayName: 'Living Room' },
      { key: 'dining_room', displayName: 'Dining Room' },
      { key: 'kitchen', displayName: 'Kitchen' },
      { key: 'bathroom', displayName: 'Bathroom' },
      { key: 'bedroom', displayName: 'Bedroom' },
      { key: 'kids_room', displayName: 'Kids Room' },
      { key: 'study', displayName: 'Study' },
      { key: 'office', displayName: 'Office' },
      { key: 'build_mode', displayName: 'Build Mode' },
      { key: 'buy_mode', displayName: 'Buy Mode' },
      { key: 'furniture', displayName: 'Furniture' },
      { key: 'decor', displayName: 'Decor' },
      { key: 'functional_objects', displayName: 'Functional Objects' },
      { key: 'comfort', displayName: 'Comfort' },
      { key: 'electronics', displayName: 'Electronics' },
      { key: 'appliances', displayName: 'Appliances' },
      { key: 'entertainment', displayName: 'Entertainment' },
      { key: 'floor_tiles', displayName: 'Floor Tiles' },
      { key: 'walls', displayName: 'Walls' },
      { key: 'wallpapers', displayName: 'Wallpapers' },
      { key: 'doors', displayName: 'Doors' },
      { key: 'windows', displayName: 'Windows' },
      { key: 'stairs', displayName: 'Stairs' },
      { key: 'roof', displayName: 'Roof' },
      { key: 'roofing', displayName: 'Roofing' },
      { key: 'platform_trim', displayName: 'Platform Trim' },
      { key: 'lighting', displayName: 'Lighting' },
      { key: 'lighting_and_shaders', displayName: 'Lighting and Shaders' },
      { key: 'storage', displayName: 'Storage' },
      { key: 'house', displayName: 'House' },
      { key: 'household', displayName: 'Household' },
      { key: 'households', displayName: 'Households' }
    ]
  },
  {
    id: 'exterior_worlds',
    subcategories: [
      { key: 'outdoors', displayName: 'Outdoors' },
      { key: 'landscaping', displayName: 'Landscaping' },
      { key: 'park', displayName: 'Park' },
      { key: 'venue', displayName: 'Venue' },
      { key: 'bar', displayName: 'Bar' },
      { key: 'shop', displayName: 'Shop' },
      { key: 'recreation_center', displayName: 'Recreation Center' },
      { key: 'worlds', displayName: 'Worlds' },
      { key: 'world_replacements', displayName: 'World Replacements' },
      { key: 'terrain_paints', displayName: 'Terrain Paints' },
      { key: 'water_overlays', displayName: 'Water Overlays' },
      { key: 'map_replacements', displayName: 'Map Replacements' },
      { key: 'lots', displayName: 'Lots' },
      { key: 'foundation', displayName: 'Foundation' }
    ]
  },
  {
    id: 'animals_creatures',
    subcategories: [
      { key: 'pets', displayName: 'Pets' },
      { key: 'cats', displayName: 'Cats' },
      { key: 'dogs', displayName: 'Dogs' },
      { key: 'other_pets', displayName: 'Other Pets' },
      { key: 'pet_care', displayName: 'Pet Care' },
      { key: 'occult_creatures', displayName: 'Occult Creatures' }
    ]
  },
  {
    id: 'languages_culture',
    subcategories: [
      { key: 'translations', displayName: 'Translations' },
      { key: 'french', displayName: 'French' },
      { key: 'german', displayName: 'German' },
      { key: 'chinese', displayName: 'Chinese' },
      { key: 'czech', displayName: 'Czech' },
      { key: 'polish', displayName: 'Polish' },
      { key: 'portuguese', displayName: 'Portuguese' },
      { key: 'russian', displayName: 'Russian' },
      { key: 'spanish', displayName: 'Spanish' },
      { key: 'thai', displayName: 'Thai' },
      { key: 'highschool', displayName: 'Highschool' },
      { key: 'entertainment', displayName: 'Entertainment' }
    ]
  },
  {
    id: 'files_scenarios_misc',
    subcategories: [
      { key: 'mods', displayName: 'Mods' },
      { key: 'save_files', displayName: 'Save Files' },
      { key: 'scenarios', displayName: 'Scenarios' },
      { key: 'events', displayName: 'Events' },
      { key: 'recipes', displayName: 'Recipes' },
      { key: 'poses_and_animations', displayName: 'Poses and Animations' },
      { key: 'create_a_sim', displayName: 'Create a Sim' },
      { key: 'other', displayName: 'Other' }
    ]
  }
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
  const { t } = useTranslation();
  const localizeCategory = useCategoryLocalization();
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [activeGroup, setActiveGroup] = useState<string | null>(CATEGORY_GROUPS[0]?.id || null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Helper function to get category name and description from translations
  const getCategoryGroupName = (groupId: string) => t(`mods.filter.category_groups.${groupId}.name`);
  const getCategoryGroupDescription = (groupId: string) => t(`mods.filter.category_groups.${groupId}.description`);

  const SORT_OPTIONS = [
    { value: 'relevance' as const, label: t('mods.filter.relevance') },
    { value: 'trending' as const, label: t('mods.filter.trending') },
    { value: 'date' as const, label: t('mods.filter.recent') },
    { value: 'downloads' as const, label: t('mods.filter.popular') },
  ];

  const handleCategorySelect = (cat: string) => {
    if (typeof onCategoryChange !== 'function') {
      return;
    }
    onCategoryChange(cat);
    setOpenDropdown(null);
  };

  const handleSortSelect = (value: 'relevance' | 'downloads' | 'date' | 'trending') => {
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
    <div className="px-8 py-4 flex flex-col md:flex-row md:items-center gap-4 border-b sticky top-0 z-10 backdrop-blur-md" style={{ backgroundColor: 'var(--ui-panel)', borderColor: 'var(--ui-border)' }}>
      {/* Dropdowns */}
      <div className="flex items-center gap-2" ref={dropdownRef}>
        {/* Category Dropdown */}
        <div className="relative">
          <button
            onClick={() => setOpenDropdown(openDropdown === 'category' ? null : 'category')}
            className="flex items-center gap-2 px-3 h-10 border rounded-lg text-sm font-medium hover:border-brand-green transition-colors cursor-pointer"
            style={{ backgroundColor: 'var(--ui-panel)', borderColor: 'var(--ui-border)' }}
          >
            <span>{t('mods.filter.category_label')}</span>
            <span className="text-brand-green">
              {selectedCategory ? localizeCategory(selectedCategory) : t('mods.filter.none')}
            </span>
            <CaretDown size={16} className={`transition-transform ${openDropdown === 'category' ? 'rotate-180' : ''}`} style={{ color: 'var(--text-secondary)' }} />
          </button>
          {openDropdown === 'category' && (
            <div className="absolute left-0 mt-1 border rounded-lg shadow-lg z-20 flex h-96 overflow-hidden" style={{ backgroundColor: 'var(--ui-panel)', borderColor: 'var(--ui-border)' }}>
              {/* Left: Category Groups */}
              <div className="w-80 border-r overflow-y-auto" style={{ borderColor: 'var(--ui-border)' }}>
                {/* None option */}
                <button
                  onClick={() => handleCategorySelect('')}
                  className={`w-full text-left px-3 py-2 border-b transition-colors ${
                    selectedCategory === ''
                      ? 'bg-brand-green/10 text-brand-green font-medium'
                      : ''
                  }`}
                  style={{
                    borderColor: 'var(--ui-border)',
                    backgroundColor: selectedCategory === '' ? undefined : 'transparent',
                    color: selectedCategory === '' ? undefined : 'var(--text-primary)',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => {
                    if (selectedCategory !== '') {
                      e.currentTarget.style.backgroundColor = 'var(--ui-hover)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedCategory !== '') {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }
                  }}
                >
                  <div className="text-sm font-medium">{t('mods.filter.no_category')}</div>
                </button>

                {CATEGORY_GROUPS.map((group) => (
                  <button
                    key={group.id}
                    onClick={() => setActiveGroup(group.id)}
                    className={`w-full text-left px-3 py-2 border-b transition-colors ${
                      activeGroup === group.id
                        ? 'font-medium'
                        : ''
                    }`}
                    style={{
                      borderColor: 'var(--ui-border)',
                      backgroundColor: activeGroup === group.id ? 'var(--ui-hover)' : 'transparent',
                      color: activeGroup === group.id ? 'var(--text-primary)' : 'var(--text-primary)',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={(e) => {
                      if (activeGroup !== group.id) {
                        e.currentTarget.style.backgroundColor = 'var(--ui-hover)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (activeGroup !== group.id) {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }
                    }}
                  >
                    <div className="text-sm font-medium truncate">{getCategoryGroupName(group.id)}</div>
                    <div className="text-xs truncate" style={{ color: 'var(--text-tertiary)' }}>{getCategoryGroupDescription(group.id)}</div>
                  </button>
                ))}
              </div>

              {/* Right: Subcategories */}
              <div className="flex-1 overflow-y-auto p-3">
                {activeGroup && (
                  <div className="space-y-1">
                    {CATEGORY_GROUPS.find(g => g.id === activeGroup)?.subcategories.map((subcat) => {
                      const localizedName = t(`mods.filter.categories.${subcat.key}`);
                      return (
                        <button
                          key={subcat.key}
                          onClick={() => handleCategorySelect(subcat.displayName)}
                          className={`block text-left px-3 py-2 text-sm rounded transition-colors whitespace-nowrap ${
                            selectedCategory === subcat.displayName
                              ? 'bg-brand-green/10 text-brand-green'
                              : ''
                          }`}
                          style={{
                            backgroundColor: selectedCategory === subcat.displayName ? undefined : 'transparent',
                            color: selectedCategory === subcat.displayName ? undefined : 'var(--text-primary)',
                            cursor: 'pointer',
                          }}
                          onMouseEnter={(e) => {
                            if (selectedCategory !== subcat.displayName) {
                              e.currentTarget.style.backgroundColor = 'var(--ui-hover)';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (selectedCategory !== subcat.displayName) {
                              e.currentTarget.style.backgroundColor = 'transparent';
                            }
                          }}
                        >
                          {localizedName}
                        </button>
                      );
                    })}
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
            className="flex items-center gap-2 px-3 h-10 border rounded-lg text-sm font-medium hover:border-brand-green transition-colors cursor-pointer"
            style={{ backgroundColor: 'var(--ui-panel)', borderColor: 'var(--ui-border)' }}
          >
            <span>{t('mods.filter.sort_label')}</span>
            <span className="text-brand-green">
              {SORT_OPTIONS.find((o) => o.value === activeSort)?.label}
            </span>
            <CaretDown size={16} className={`transition-transform ${openDropdown === 'sort' ? 'rotate-180' : ''}`} style={{ color: 'var(--text-secondary)' }} />
          </button>
          {openDropdown === 'sort' && (
            <div className="absolute left-0 mt-1 w-40 border rounded-lg shadow-lg z-20" style={{ backgroundColor: 'var(--ui-panel)', borderColor: 'var(--ui-border)' }}>
              {SORT_OPTIONS.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => handleSortSelect(value)}
                  className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                    activeSort === value ? 'bg-brand-green/10 text-brand-green' : ''
                  }`}
                  style={{
                    backgroundColor: activeSort === value ? undefined : 'transparent',
                    color: activeSort === value ? undefined : 'var(--text-primary)',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => {
                    if (activeSort !== value) {
                      e.currentTarget.style.backgroundColor = 'var(--ui-hover)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (activeSort !== value) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Spacer - Push ViewToggle to the right */}
      <div className="flex-1 hidden md:block" />

      {/* View Mode Toggle */}
      <ViewToggle viewMode={viewMode} onViewModeChange={onViewModeChange} />
    </div>
  );
}
