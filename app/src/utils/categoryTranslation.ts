/**
 * Utility for translating category names
 * Maps English category names (from API) to translation keys
 */

export const CATEGORY_TRANSLATION_MAP: Record<string, string> = {
  // Sims, Ages, Body
  'Adult': 'adult',
  'Teen': 'teen',
  'Toddler': 'toddler',
  'Infant': 'infant',
  'Child': 'child',
  'Elder': 'elder',
  'Young Adult': 'young_adult',
  'Masculine': 'masculine',
  'Feminine': 'feminine',
  'Body': 'body',
  'Body Sliders': 'body_sliders',
  'Body Accessories': 'body_accessories',
  'Body and Face Presets': 'body_and_face_presets',
  'Facial / Body Hair': 'facial_body_hair',
  'Face Sliders': 'face_sliders',
  'Skin Details': 'skin_details',
  'Skins': 'skins',
  'Skintones': 'skintones',
  'Eye Color': 'eye_color',
  'Hairstyles': 'hairstyles',
  'Makeup': 'makeup',
  'Likes/Dislikes': 'likes_dislikes',
  'Traits': 'traits',
  'Aspirations': 'aspirations',
  'Activities and Skills': 'activities_and_skills',
  'Career': 'career',
  'Careers': 'careers',
  'Club': 'club',
  'Community': 'community',
  'Roommates': 'roommates',
  'Default': 'default',
  'Overrides': 'overrides',
  'Bug Fixes': 'bug_fixes',
  'Gameplay': 'gameplay',
  'Misc': 'misc',

  // Clothing and Style
  'Clothing': 'clothing',
  'Shirts': 'shirts',
  'Pants': 'pants',
  'Skirts': 'skirts',
  'Swimwear': 'swimwear',
  'Sleepwear': 'sleepwear',
  'Underwear and Socks': 'underwear_and_socks',
  'Shoes': 'shoes',
  'Styled Looks': 'styled_looks',
  'Head Accessories': 'head_accessories',
  'Pet Accessories': 'pet_accessories',
  'Jewelry': 'jewelry',
  'Occult': 'occult',
  'Costumes': 'costumes',

  // Interior Construction
  'Rooms': 'rooms',
  'Living Room': 'living_room',
  'Dining Room': 'dining_room',
  'Kitchen': 'kitchen',
  'Bathroom': 'bathroom',
  'Bedroom': 'bedroom',
  'Kids Room': 'kids_room',
  'Study': 'study',
  'Office': 'office',
  'Build Mode': 'build_mode',
  'Buy Mode': 'buy_mode',
  'Furniture': 'furniture',
  'Decor': 'decor',
  'Functional Objects': 'functional_objects',
  'Comfort': 'comfort',
  'Electronics': 'electronics',
  'Appliances': 'appliances',
  'Entertainment': 'entertainment',
  'Floor Tiles': 'floor_tiles',
  'Walls': 'walls',
  'Wallpapers': 'wallpapers',
  'Doors': 'doors',
  'Windows': 'windows',
  'Stairs': 'stairs',
  'Roof': 'roof',
  'Roofing': 'roofing',
  'Platform Trim': 'platform_trim',
  'Lighting': 'lighting',
  'Lighting and Shaders': 'lighting_and_shaders',
  'Storage': 'storage',
  'House': 'house',
  'Household': 'household',
  'Households': 'households',

  // Exterior Construction and Worlds
  'Outdoors': 'outdoors',
  'Landscaping': 'landscaping',
  'Park': 'park',
  'Venue': 'venue',
  'Bar': 'bar',
  'Shop': 'shop',
  'Recreation Center': 'recreation_center',
  'Worlds': 'worlds',
  'World Replacements': 'world_replacements',
  'Terrain Paints': 'terrain_paints',
  'Water Overlays': 'water_overlays',
  'Map Replacements': 'map_replacements',
  'Lots': 'lots',
  'Foundation': 'foundation',

  // Animals and Creatures
  'Pets': 'pets',
  'Cats': 'cats',
  'Dogs': 'dogs',
  'Other Pets': 'other_pets',
  'Pet Care': 'pet_care',
  'Occult Creatures': 'occult_creatures',

  // Languages and Culture
  'Translations': 'translations',
  'French': 'french',
  'German': 'german',
  'Chinese': 'chinese',
  'Czech': 'czech',
  'Polish': 'polish',
  'Portuguese': 'portuguese',
  'Russian': 'russian',
  'Spanish': 'spanish',
  'Thai': 'thai',
  'Highschool': 'highschool',

  // Files, Scenarios and Misc
  'Mods': 'mods',
  'Save Files': 'save_files',
  'Scenarios': 'scenarios',
  'Events': 'events',
  'Recipes': 'recipes',
  'Poses and Animations': 'poses_and_animations',
  'Create a Sim': 'create_a_sim',
  'Other': 'other',
};

/**
 * Get translation key for an English category name
 * @param englishName - The English category name from the API
 * @returns Translation key or the original name if not found
 */
export function getCategoryTranslationKey(englishName: string): string {
  return CATEGORY_TRANSLATION_MAP[englishName] || englishName;
}

/**
 * Hook to get localized category names
 * Usage: const localizeCategory = useCategoryLocalization();
 *        const translated = localizeCategory('Adult');
 */
export function useCategoryLocalization() {
  const { t } = require('react-i18next').useTranslation();

  return (englishName: string): string => {
    const key = getCategoryTranslationKey(englishName);
    if (key === englishName) {
      // Not found in map, return as is
      return englishName;
    }
    return t(`mods.filter.categories.${key}`) || englishName;
  };
}
