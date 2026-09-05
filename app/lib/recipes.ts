export type Recipe = {
  id: string;
  name: string;
  thumbnail: string;
  category: string;
  area: string;
  instructions: string;
  ingredients: { name: string; measure: string }[];
};

type MealDbMeal = Record<string, string | null> & {
  idMeal: string;
  strMeal: string;
  strMealThumb: string;
  strCategory: string;
  strArea: string;
  strInstructions: string;
};

function parseMeal(meal: MealDbMeal): Recipe {
  const ingredients: { name: string; measure: string }[] = [];
  for (let i = 1; i <= 20; i++) {
    const name = meal[`strIngredient${i}`];
    const measure = meal[`strMeasure${i}`];
    if (name && name.trim()) {
      ingredients.push({ name: name.trim(), measure: (measure ?? "").trim() });
    }
  }
  return {
    id: meal.idMeal,
    name: meal.strMeal,
    thumbnail: meal.strMealThumb,
    category: meal.strCategory,
    area: meal.strArea,
    instructions: meal.strInstructions,
    ingredients,
  };
}

const MEALDB_BASE = "https://www.themealdb.com/api/json/v1/1";

/**
 * TheMealDB's free tier has no bulk "N random meals" endpoint, so this fires
 * several single-random requests in parallel and dedupes by id.
 */
export async function fetchRandomRecipes(count: number): Promise<Recipe[]> {
  const responses = await Promise.all(
    Array.from({ length: count }, () =>
      fetch(`${MEALDB_BASE}/random.php`).then((r) => r.json())
    )
  );

  const seen = new Set<string>();
  const recipes: Recipe[] = [];
  for (const res of responses) {
    const meal: MealDbMeal | undefined = res?.meals?.[0];
    if (meal && !seen.has(meal.idMeal)) {
      seen.add(meal.idMeal);
      recipes.push(parseMeal(meal));
    }
  }
  return recipes;
}

/**
 * TheMealDB's list.php?a=list now returns every country in the world (most
 * with zero recipes), not just areas with actual data, so this is the fixed
 * set of areas confirmed to return results from filter.php.
 */
export const CUISINES = [
  "American",
  "British",
  "Canadian",
  "Chinese",
  "Croatian",
  "Dutch",
  "Egyptian",
  "French",
  "Greek",
  "Indian",
  "Irish",
  "Italian",
  "Jamaican",
  "Japanese",
  "Kenyan",
  "Malaysian",
  "Mexican",
  "Moroccan",
  "Polish",
  "Portuguese",
  "Russian",
  "Spanish",
  "Thai",
  "Tunisian",
  "Turkish",
  "Ukrainian",
  "Uruguayan",
  "Vietnamese",
];

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * filter.php only returns id/name/thumbnail, so this picks a random subset
 * of that cuisine and then looks up full details (ingredients etc.) for
 * just those picks.
 */
export async function fetchRecipesByCuisine(cuisine: string, count: number): Promise<Recipe[]> {
  const filterRes = await fetch(
    `${MEALDB_BASE}/filter.php?a=${encodeURIComponent(cuisine)}`
  ).then((r) => r.json());
  const candidates: { idMeal: string }[] = filterRes?.meals ?? [];
  const picks = shuffle(candidates).slice(0, count);

  const details = await Promise.all(
    picks.map((p) => fetch(`${MEALDB_BASE}/lookup.php?i=${p.idMeal}`).then((r) => r.json()))
  );

  return details
    .map((res) => res?.meals?.[0] as MealDbMeal | undefined)
    .filter((meal): meal is MealDbMeal => !!meal)
    .map(parseMeal);
}
