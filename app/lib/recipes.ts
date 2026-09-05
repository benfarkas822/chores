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
