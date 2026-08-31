// ===== IMPORT =====
const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');


// ===== FUNZIONE: raccogli i link delle ricette da più sottocategorie =====
async function getRecipeLinks() {
  // lista delle sottocategorie di dolci da cui raccogliere ricette
  const sottocategorie = [
    'Dolci-e-Desserts',
    'Dolci-e-Desserts/Torte',
    'Dolci-e-Desserts/Biscotti',
    'Dolci-e-Desserts/Cheesecakes',
    'Dolci-e-Desserts/Gelati-e-Semifreddi',
    'Dolci-e-Desserts/Al-cucchiaio',
    'Dolci-e-Desserts/piccola-pasticceria',
  ];

  const tuttiLink = [];

  for (const cat of sottocategorie) {
    const url = `https://www.giallozafferano.it/ricette-cat/${cat}/`;
    try {
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.4389.82 Safari/537.36'
        }
      });
      const $ = cheerio.load(response.data);

      $('a[href^="https://ricette.giallozafferano.it/"]').each((i, element) => {
        const link = $(element).attr('href');
        if (link.endsWith('.html')) {
          tuttiLink.push(link);
        }
      });

      console.log(`Categoria ${cat}: raccolti link (totale finora ${tuttiLink.length})`);
    } catch (error) {
      console.log(`Errore su categoria ${cat}:`, error.message);
    }
  }

  const uniqueLinks = [...new Set(tuttiLink)];
  console.log('Link unici totali:', uniqueLinks.length);
  return uniqueLinks;
}


// ===== FUNZIONE: estrai i dati di una singola ricetta dal JSON-LD =====
async function scrapeRecipe(link) {
  const response = await axios.get(link, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.4389.82 Safari/537.36'
    }
  });
  const $ = cheerio.load(response.data);

  const jsonLd = $('script[type="application/ld+json"]').html();
  const data = JSON.parse(jsonLd);

  const recipe = {
    name: data.name,
    ingredients: data.recipeIngredient,
    prepTime: data.prepTime,
    cookTime: data.cookTime,
    instructions: data.recipeInstructions,
    seasonality: [],
  };

  return recipe;
}


// ===== FUNZIONE PRINCIPALE =====
async function main() {
  const links = await getRecipeLinks();
  const recipes = [];

  for (const link of links) {
    try {
      const recipe = await scrapeRecipe(link);
      recipes.push(recipe);
      console.log('Scrapata:', recipe.name);
    } catch (error) {
      console.log('Errore su', link, '-', error.message);
    }
  }

  fs.writeFileSync('recipes.json', JSON.stringify(recipes, null, 2));
  console.log('Fatto! Salvate', recipes.length, 'ricette.');
}

main();