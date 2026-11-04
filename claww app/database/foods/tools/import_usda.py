"""Builds database/foods/*.csv from USDA FoodData Central SR Legacy plus authored household recipes (NG PHASE 4).

Usage (from the "claww app" folder):

    python database/foods/tools/import_usda.py <folder with the extracted SR Legacy CSV files>

The USDA download is FoodData_Central_sr_legacy_food_csv_2018-04.zip from https://fdc.nal.usda.gov/download-datasets
(public domain, CC0 1.0). Extract it and pass the folder that holds food.csv and food_nutrient.csv.

What is copied and what is authored:
- INGREDIENT values (per 100 g) are copied from the USDA row named in USDA_MAP; nothing is typed by hand. Where USDA has no
  exact equivalent the row uses the nearest USDA food and says so in source_ref (PROXY). Foods with no usable USDA row
  (paneer, jaggery, curry leaves, ...) are NOT included; they are listed in docs/food-review.md as missing.
- DISH values are never typed: a dish is a list of ingredients with grams for one standard serving (RECIPES below). The
  recipe grams are authored estimates of a typical home or mess recipe. They are the part the nutritionist must review.
- Household units (katori 150, roti 40 g, ...) are standard sizes, stated assumptions.

Every row is unreviewed (reviewed_by stays NULL in the database).
"""

import csv
import sys
from pathlib import Path

NUTRIENT_IDS = {
    'kcal_100g': '1008', 'protein_100g': '1003', 'fat_100g': '1004', 'carbs_100g': '1005', 'fibre_100g': '1079',
    'sugar_100g': '2000', 'calcium_mg_100g': '1087', 'iron_mg_100g': '1089', 'vitc_mg_100g': '1162',
    'b12_ug_100g': '1178', 'sodium_mg_100g': '1093',
}
COLUMNS = ['kcal_100g', 'protein_100g', 'carbs_100g', 'fat_100g', 'fibre_100g', 'iron_mg_100g', 'calcium_mg_100g', 'vitc_mg_100g',
           'b12_ug_100g', 'sodium_mg_100g', 'sugar_100g', 'cost_inr_100g']

# name | aliases | diet | jain_ok | USDA description (exact, or prefix) | proxy note ('' when it is the same food)
V, VG, E, N = 'veg', 'vegan', 'egg', 'nonveg'
USDA_MAP = [
    # cereals and flours
    ('Rice, white, raw', 'rice|chawal|basmati rice', VG, 1, 'Rice, white, long-grain, regular, raw, enriched', 'long-grain stands in for basmati and sona masuri'),
    ('Rice, brown, raw', 'brown rice', VG, 1, 'Rice, brown, long-grain, raw (Includes foods for USDA\'s Food Distribution Program)', ''),
    ('Wheat flour, atta', 'atta|whole wheat flour|chapati flour', VG, 1, 'Wheat flour, whole-grain (Includes foods for USDA\'s Food Distribution Program)', ''),
    ('Maida', 'refined flour|all purpose flour', VG, 1, 'Wheat flour, white, all-purpose, enriched, bleached', ''),
    ('Rava, semolina', 'rava|sooji|semolina', VG, 1, 'Semolina, unenriched', ''),
    ('Rice flour', 'chawal ka atta', VG, 1, 'Rice flour, white, unenriched', ''),
    ('Poha, flattened rice', 'poha|aval|beaten rice', VG, 1, 'Rice, white, long-grain, regular, raw, enriched', 'PROXY: dry flattened rice is composed like raw rice; replace with a poha value from the nutritionist'),
    ('Oats, rolled', 'oats|oatmeal', VG, 1, 'Cereals, oats, regular and quick, not fortified, dry', ''),
    ('Bajra, pearl millet', 'bajra|pearl millet|kambu', VG, 1, 'Millet, raw', ''),
    ('Jowar, sorghum', 'jowar|sorghum|cholam', VG, 1, 'Sorghum grain', ''),
    ('Cornmeal', 'makki ka atta|corn flour', VG, 1, 'Corn flour, yellow, degermed, unenriched', ''),
    ('Bread, white', 'white bread|bread slice', V, 1, 'Bread, white, commercially prepared (includes soft bread crumbs)', ''),
    ('Bread, whole wheat', 'brown bread|wheat bread', V, 1, 'Bread, whole-wheat, commercially prepared', ''),
    ('Vermicelli, dry', 'semiya|seviyan|pasta', VG, 1, 'Pasta, dry, enriched', 'dry pasta stands in for vermicelli'),
    ('Chinese noodles, dry', 'noodles|hakka noodles', VG, 1, 'Noodles, chinese, chow mein', 'USDA chow mein noodles stand in for hakka noodles'),
    ('Besan, gram flour', 'besan|chickpea flour', VG, 1, 'Chickpea flour (besan)', ''),
    # pulses and legumes
    ('Toor dal, raw', 'toor dal|arhar dal|tuvar|pigeon pea', VG, 1, 'Pigeon peas (red gram), mature seeds, raw', ''),
    ('Moong dal, raw', 'moong dal|green gram|mung beans', VG, 1, 'Mung beans, mature seeds, raw', ''),
    ('Masoor dal, raw', 'masoor dal|red lentils', VG, 1, 'Lentils, pink or red, raw', ''),
    ('Urad dal, raw', 'urad dal|black gram|ulundu', VG, 1, 'Mungo beans, mature seeds, raw', 'USDA "mungo beans" are black gram'),
    ('Chana, chickpeas raw', 'chana|chole|kabuli chana|chickpeas', VG, 1, 'Chickpeas (garbanzo beans, bengal gram), mature seeds, raw', ''),
    ('Rajma, kidney beans raw', 'rajma|kidney beans', VG, 1, 'Beans, kidney, all types, mature seeds, raw', ''),
    ('Lobia, black-eyed peas raw', 'lobia|chawli|cowpeas', VG, 1, 'Cowpeas, common (blackeyes, crowder, southern), mature seeds, raw', ''),
    ('Moong sprouts', 'sprouts|sprouted moong', VG, 1, 'Mung beans, mature seeds, sprouted, raw', ''),
    ('Green peas, raw', 'matar|peas', VG, 1, 'Peas, green, raw', ''),
    ('Soya chunks, dry', 'soya chunks|soy chunks|meal maker|nutrela', VG, 1, 'Soy protein concentrate, produced by alcohol extraction', 'PROXY: nearest USDA equivalent of textured soy chunks; check against the pack label'),
    ('Tofu, firm', 'tofu', VG, 1, 'Tofu, raw, firm, prepared with calcium sulfate', ''),
    ('Peanuts, raw', 'peanuts|groundnuts|moongphali', VG, 1, 'Peanuts, all types, raw', ''),
    ('Peanut butter', 'peanut butter', VG, 1, 'Peanut butter, smooth style, without salt', ''),
    # dairy and eggs
    ('Milk, whole', 'milk|full cream milk|doodh', V, 1, 'Milk, whole, 3.25% milkfat, without added vitamin A and vitamin D', 'cow milk; buffalo milk is richer'),
    ('Milk, toned (2%)', 'toned milk|double toned milk', V, 1, 'Milk, reduced fat, fluid, 2% milkfat, with added vitamin A and vitamin D', 'USDA 2% milk stands in for toned milk'),
    ('Curd, plain', 'curd|dahi|yogurt|yoghurt', V, 1, 'Yogurt, plain, whole milk', ''),
    ('Buttermilk', 'chaas|majjiga|mor|buttermilk', V, 1, 'Milk, buttermilk, fluid, cultured, lowfat', ''),
    ('Ghee', 'ghee|clarified butter', V, 1, 'Butter oil, anhydrous', 'USDA anhydrous butter oil is clarified butter fat, composed like ghee'),
    ('Butter', 'makhan|butter', V, 1, 'Butter, salted', ''),
    ('Cheddar cheese', 'cheese|processed cheese', V, 1, 'Cheese, cheddar, sharp, sliced', 'cheddar stands in for processed cheese slices'),
    ('Whey protein isolate', 'whey|whey protein|protein powder', V, 1, 'Beverages, Whey protein powder isolate', 'powder values vary by brand; check the label'),
    ('Skim milk powder', 'milk powder|dried milk', V, 1, 'Milk, dry, nonfat, regular, without added vitamin A and vitamin D', ''),
    ('Egg, whole', 'egg|anda|eggs', E, 0, 'Egg, whole, raw, fresh', ''),
    ('Egg white', 'egg white|egg whites', E, 0, 'Egg, white, raw, fresh', ''),
    # meat and fish
    ('Chicken breast, raw', 'chicken breast|boneless chicken', N, 0, 'Chicken, broiler or fryers, breast, skinless, boneless, meat only, raw', ''),
    ('Chicken thigh with skin, raw', 'chicken thigh|chicken curry cut|chicken', N, 0, 'Chicken, broilers or fryers, thigh, meat and skin, raw', 'curry-cut chicken is a mix of cuts; thigh with skin is the usual'),
    ('Mutton (goat), raw', 'mutton|goat meat', N, 0, 'Game meat, goat, raw', ''),
    ('Fish, carp (rohu), raw', 'rohu|fish|catla', N, 0, 'Fish, carp, raw', 'carp stands in for rohu and catla'),
    ('Fish, tilapia, raw', 'tilapia', N, 0, 'Fish, tilapia, raw', ''),
    ('Prawns, raw', 'prawns|shrimp', N, 0, 'Crustaceans, shrimp, mixed species, raw (may contain additives to retain moisture)', ''),
    ('Tuna, canned in water', 'tuna', N, 0, 'Fish, tuna, light, canned in water, drained solids (Includes foods for USDA\'s Food Distribution Program)', ''),
    # oils
    ('Oil, groundnut', 'groundnut oil|peanut oil|oil', VG, 1, 'Oil, peanut, salad or cooking', ''),
    ('Oil, sunflower', 'sunflower oil|refined oil', VG, 1, 'Oil, sunflower, linoleic (less than 60%)', ''),
    ('Oil, coconut', 'coconut oil', VG, 1, 'Oil, coconut', ''),
    ('Oil, mustard', 'mustard oil|sarson ka tel', VG, 1, 'Oil, mustard', ''),
    ('Oil, sesame', 'gingelly oil|til oil|sesame oil', VG, 1, 'Oil, sesame, salad or cooking', ''),
    ('Oil, soybean', 'soybean oil', VG, 1, 'Oil, vegetable, soybean, refined', ''),
    # vegetables
    ('Onion', 'onion|pyaz|ulli', VG, 0, 'Onions, raw', ''),
    ('Tomato', 'tomato|tamatar', VG, 1, 'Tomatoes, red, ripe, raw, year round average', ''),
    ('Potato', 'potato|aloo|batata', VG, 0, 'Potatoes, flesh and skin, raw', ''),
    ('Carrot', 'carrot|gajar', VG, 0, 'Carrots, raw', ''),
    ('Cauliflower', 'gobi|cauliflower|phool gobi', VG, 1, 'Cauliflower, raw', ''),
    ('Cabbage', 'cabbage|patta gobi', VG, 1, 'Cabbage, raw', ''),
    ('Spinach', 'palak|spinach|keerai', VG, 1, 'Spinach, raw', ''),
    ('Brinjal, eggplant', 'brinjal|baingan|eggplant|vankaya', VG, 1, 'Eggplant, raw', ''),
    ('Okra, bhindi', 'bhindi|okra|ladies finger|dherosh', VG, 1, 'Okra, raw', ''),
    ('Capsicum, green', 'capsicum|bell pepper|shimla mirch', VG, 1, 'Peppers, sweet, green, raw', ''),
    ('Green chilli', 'green chilli|mirchi|hari mirch', VG, 1, 'Peppers, hot chili, green, raw', ''),
    ('Cucumber', 'cucumber|kheera', VG, 1, 'Cucumber, with peel, raw', ''),
    ('Green beans', 'beans|french beans|green beans', VG, 1, 'Beans, snap, green, raw', ''),
    ('Beetroot', 'beetroot|chukandar', VG, 0, 'Beets, raw', ''),
    ('Radish', 'mooli|radish', VG, 0, 'Radishes, raw', ''),
    ('Bitter gourd', 'karela|bitter gourd|bitter melon', VG, 1, 'Balsam-pear (bitter gourd), pods, raw', ''),
    ('Drumstick leaves', 'moringa leaves|murungai keerai', VG, 1, 'Drumstick leaves, raw', ''),
    ('Coriander leaves', 'coriander|dhania|cilantro', VG, 1, 'Coriander (cilantro) leaves, raw', ''),
    ('Garlic', 'garlic|lehsun|velluli', VG, 0, 'Garlic, raw', ''),
    ('Ginger', 'ginger|adrak|allam', VG, 0, 'Ginger root, raw', ''),
    ('Mushroom', 'mushroom', VG, 0, 'Mushrooms, white, raw', ''),
    ('Pumpkin', 'pumpkin|kaddu', VG, 1, 'Pumpkin, raw', ''),
    ('Sweet potato', 'sweet potato|shakarkandi', VG, 0, 'Sweet potato, raw, unprepared (Includes foods for USDA\'s Food Distribution Program)', ''),
    ('Sweet corn', 'corn|bhutta|makka', VG, 1, 'Corn, sweet, yellow, raw', ''),
    ('Lemon juice', 'lemon juice|nimbu', VG, 1, 'Lemon juice, raw', ''),
    ('Tamarind', 'imli|tamarind|pulusu', VG, 1, 'Tamarinds, raw', ''),
    ('Coconut, fresh', 'coconut|nariyal|kobbari', VG, 1, 'Nuts, coconut meat, raw', ''),
    ('Coconut milk', 'coconut milk', VG, 1, 'Nuts, coconut milk, raw (liquid expressed from grated meat and water)', ''),
    ('Tomato puree', 'tomato puree', VG, 1, 'Tomato products, canned, puree, without salt added', ''),
    # fruit
    ('Banana', 'banana|kela|arati', VG, 1, 'Bananas, raw', ''),
    ('Apple', 'apple|seb', VG, 1, 'Apples, raw, with skin (Includes foods for USDA\'s Food Distribution Program)', ''),
    ('Orange', 'orange|santra', VG, 1, 'Oranges, raw, all commercial varieties', ''),
    ('Mango', 'mango|aam', VG, 1, 'Mangos, raw', ''),
    ('Papaya', 'papaya|papita', VG, 1, 'Papayas, raw', ''),
    ('Watermelon', 'watermelon|tarbooz', VG, 1, 'Watermelon, raw', ''),
    ('Guava', 'guava|amrud', VG, 1, 'Guavas, common, raw', ''),
    ('Pomegranate', 'pomegranate|anar', VG, 1, 'Pomegranates, raw', ''),
    ('Grapes', 'grapes|angoor', VG, 1, 'Grapes, red or green (European type, such as Thompson seedless), raw', ''),
    ('Pineapple', 'pineapple|ananas', VG, 1, 'Pineapple, raw, all varieties', ''),
    ('Dates', 'dates|khajoor', VG, 1, 'Dates, deglet noor', ''),
    ('Raisins', 'raisins|kishmish', VG, 1, 'Raisins, dark, seedless (Includes foods for USDA\'s Food Distribution Program)', ''),
    # nuts and seeds
    ('Cashew nuts, raw', 'cashew|kaju', VG, 1, 'Nuts, cashew nuts, raw', ''),
    ('Walnuts', 'walnut|akhrot', VG, 1, 'Nuts, walnuts, english', ''),
    ('Sesame seeds', 'til|sesame|nuvvulu', VG, 1, 'Seeds, sesame seeds, whole, dried', ''),
    # sweet and spice
    ('Sugar', 'sugar|cheeni|chini', VG, 1, 'Sugars, granulated', ''),
    ('Brown sugar', 'brown sugar', VG, 1, 'Sugars, brown', 'USDA brown sugar stands in for jaggery-like sweetness; jaggery itself is not in the USDA data'),
    ('Salt', 'salt|namak', VG, 1, 'Salt, table', ''),
    ('Turmeric powder', 'turmeric|haldi', VG, 1, 'Spices, turmeric, ground', ''),
    ('Cumin seeds', 'jeera|cumin', VG, 1, 'Spices, cumin seed', ''),
    ('Coriander seeds', 'dhania seeds|coriander seeds', VG, 1, 'Spices, coriander seed', ''),
    ('Red chilli powder', 'red chilli|mirchi powder|chilli powder', VG, 1, 'Spices, pepper, red or cayenne', ''),
    ('Mustard seeds', 'mustard|rai|aavalu', VG, 1, 'Spices, mustard seed, ground', ''),
    ('Fenugreek seeds', 'methi seeds|menthulu|fenugreek', VG, 1, 'Spices, fenugreek seed', ''),
    ('Black pepper', 'pepper|kali mirch', VG, 1, 'Spices, pepper, black', ''),
    ('Cardamom', 'elaichi|cardamom', VG, 1, 'Spices, cardamom', ''),
    ('Cinnamon', 'dalchini|cinnamon', VG, 1, 'Spices, cinnamon, ground', ''),
    ('Curry powder', 'garam masala|curry masala|masala powder', VG, 1, 'Spices, curry powder', 'USDA curry powder stands in for garam masala and sambar powder'),
    ('Soy sauce', 'soy sauce', VG, 1, 'Soy sauce made from soy and wheat (shoyu), low sodium', ''),
    ('Papad', 'papad|appalam|pappadam', VG, 1, 'Papad', ''),
]

# A zero-nutrient filler so a serving's grams match its household unit (a roti is 40 g, an idli 40 g).
WATER = ('Water', 'water|paani', VG, 1)

# Household units for ingredients (assumptions, standard sizes): name -> [(unit, grams, default)]
ING_UNITS = {
    'Egg, whole': [('egg', 50, 1)], 'Egg white': [('egg white', 33, 1)],
    'Milk, whole': [('glass', 250, 1), ('katori', 150, 0)], 'Milk, toned (2%)': [('glass', 250, 1)],
    'Curd, plain': [('katori', 150, 1), ('tbsp', 15, 0)], 'Buttermilk': [('glass', 250, 1)],
    'Banana': [('banana', 118, 1)], 'Apple': [('apple', 182, 1)], 'Orange': [('orange', 131, 1)],
    'Mango': [('mango', 200, 1)], 'Guava': [('guava', 100, 1)], 'Papaya': [('katori', 150, 1)], 'Watermelon': [('katori', 150, 1)],
    'Pomegranate': [('katori', 100, 1)], 'Grapes': [('katori', 100, 1)], 'Pineapple': [('katori', 100, 1)],
    'Dates': [('date', 8, 1)], 'Raisins': [('tbsp', 10, 1)],
    'Oil, groundnut': [('tsp', 5, 1), ('tbsp', 15, 0)], 'Oil, sunflower': [('tsp', 5, 1), ('tbsp', 15, 0)], 'Oil, coconut': [('tsp', 5, 1)],
    'Oil, mustard': [('tsp', 5, 1)], 'Oil, sesame': [('tsp', 5, 1)], 'Oil, soybean': [('tsp', 5, 1)],
    'Ghee': [('tsp', 5, 1), ('tbsp', 15, 0)], 'Butter': [('tsp', 5, 1), ('tbsp', 14, 0)],
    'Sugar': [('tsp', 4, 1)], 'Brown sugar': [('tsp', 4, 1)], 'Salt': [('pinch', 1, 1), ('tsp', 6, 0)],
    'Bread, white': [('slice', 28, 1)], 'Bread, whole wheat': [('slice', 28, 1)],
    'Peanuts, raw': [('handful', 30, 1), ('tbsp', 10, 0)], 'Peanut butter': [('tbsp', 16, 1)],
    'Cashew nuts, raw': [('handful', 30, 1)], 'Walnuts': [('handful', 30, 1)],
    'Whey protein isolate': [('scoop', 30, 1)], 'Skim milk powder': [('tbsp', 7, 1)],
    'Papad': [('papad', 12, 1)], 'Cheddar cheese': [('slice', 20, 1)],
    'Onion': [('onion', 100, 1)], 'Tomato': [('tomato', 100, 1)], 'Potato': [('potato', 150, 1)], 'Carrot': [('carrot', 70, 1)],
    'Green chilli': [('chilli', 5, 1)], 'Lemon juice': [('tsp', 5, 1)], 'Cucumber': [('katori', 100, 1)],
    'Moong sprouts': [('katori', 100, 1)], 'Soya chunks, dry': [('katori', 30, 1)],
    'Sweet corn': [('katori', 100, 1)], 'Tofu, firm': [('katori', 100, 1)],
}

# Dishes: name | aliases | cuisine | unit and grams for ONE serving | items (ingredient, grams); water fills up to the unit grams.
# jain_ok and diet are derived from the items. extra units: [(unit, grams)].
RECIPES = [
    # --- breads ---
    ('Roti', 'chapati|phulka|fulka', 'North Indian', ('roti', 40), [('Wheat flour, atta', 32)], []),
    ('Roti with ghee', 'ghee roti|ghee chapati', 'North Indian', ('roti', 45), [('Wheat flour, atta', 32), ('Ghee', 5)], []),
    ('Paratha, plain', 'plain paratha|paratha', 'North Indian', ('paratha', 70), [('Wheat flour, atta', 50), ('Oil, sunflower', 6)], []),
    ('Aloo paratha', 'potato paratha', 'North Indian', ('paratha', 110), [('Wheat flour, atta', 50), ('Potato', 40), ('Oil, sunflower', 7), ('Green chilli', 2), ('Salt', 1)], []),
    ('Puri', 'poori', 'North Indian', ('puri', 30), [('Wheat flour, atta', 22), ('Oil, sunflower', 5)], []),
    ('Naan', 'butter naan|plain naan', 'North Indian', ('naan', 90), [('Maida', 55), ('Curd, plain', 10), ('Sugar', 2), ('Oil, sunflower', 4), ('Salt', 1)], []),
    ('Jowar roti', 'jolada rotti|bhakri', 'Mess', ('roti', 45), [('Jowar, sorghum', 35)], []),
    ('Bajra roti', 'bajra rotla|sajje roti', 'North Indian', ('roti', 45), [('Bajra, pearl millet', 35)], []),
    # --- rice ---
    ('Rice, cooked', 'steamed rice|plain rice|annam|chawal', 'South Indian', ('katori', 150), [('Rice, white, raw', 50)], [('plate', 300)]),
    ('Curd rice', 'thayir sadam|perugu annam|dahi chawal', 'South Indian', ('katori', 180), [('Rice, white, raw', 40), ('Curd, plain', 70), ('Oil, groundnut', 3), ('Mustard seeds', 1), ('Salt', 1)], []),
    ('Jeera rice', 'cumin rice', 'North Indian', ('katori', 150), [('Rice, white, raw', 50), ('Ghee', 4), ('Cumin seeds', 2), ('Salt', 1)], [('plate', 300)]),
    ('Lemon rice', 'chitranna|nimmakaya pulihora', 'South Indian', ('katori', 150), [('Rice, white, raw', 50), ('Oil, groundnut', 5), ('Peanuts, raw', 8), ('Mustard seeds', 1), ('Turmeric powder', 0.5), ('Lemon juice', 10), ('Salt', 1)], [('plate', 300)]),
    ('Tamarind rice', 'pulihora|puliyogare|puliyodharai', 'Andhra/Telangana', ('katori', 150), [('Rice, white, raw', 50), ('Oil, groundnut', 6), ('Peanuts, raw', 8), ('Tamarind', 10), ('Mustard seeds', 1), ('Red chilli powder', 1), ('Salt', 1)], [('plate', 300)]),
    ('Vegetable pulao', 'veg pulao|pulav', 'North Indian', ('plate', 300), [('Rice, white, raw', 80), ('Oil, sunflower', 8), ('Onion', 30), ('Carrot', 20), ('Green peas, raw', 20), ('Green beans', 20), ('Curry powder', 2), ('Salt', 2)], []),
    ('Chicken biryani', 'biryani|dum biryani', 'Andhra/Telangana', ('plate', 350), [('Rice, white, raw', 90), ('Chicken thigh with skin, raw', 110), ('Oil, sunflower', 12), ('Ghee', 5), ('Onion', 40), ('Curd, plain', 25), ('Tomato', 25), ('Ginger', 4), ('Garlic', 4), ('Curry powder', 3), ('Red chilli powder', 2), ('Salt', 3)], []),
    ('Vegetable biryani', 'veg biryani', 'Andhra/Telangana', ('plate', 330), [('Rice, white, raw', 90), ('Oil, sunflower', 12), ('Ghee', 4), ('Onion', 40), ('Carrot', 25), ('Green peas, raw', 25), ('Green beans', 25), ('Curd, plain', 25), ('Curry powder', 3), ('Salt', 3)], []),
    ('Egg biryani', 'egg dum biryani', 'Andhra/Telangana', ('plate', 330), [('Rice, white, raw', 90), ('Egg, whole', 100), ('Oil, sunflower', 12), ('Ghee', 4), ('Onion', 40), ('Curd, plain', 20), ('Curry powder', 3), ('Salt', 3)], []),
    ('Chicken fried rice', 'chicken fried rice|indo chinese fried rice', 'Indo-Chinese', ('plate', 300), [('Rice, white, raw', 75), ('Chicken breast, raw', 70), ('Egg, whole', 25), ('Oil, sunflower', 8), ('Onion', 20), ('Carrot', 15), ('Green beans', 15), ('Soy sauce', 5), ('Black pepper', 0.5), ('Salt', 1)], []),
    ('Egg fried rice', 'egg fried rice', 'Indo-Chinese', ('plate', 280), [('Rice, white, raw', 75), ('Egg, whole', 50), ('Oil, sunflower', 8), ('Onion', 20), ('Carrot', 15), ('Green beans', 15), ('Soy sauce', 5), ('Salt', 1)], []),
    ('Vegetable fried rice', 'veg fried rice', 'Indo-Chinese', ('plate', 280), [('Rice, white, raw', 75), ('Oil, sunflower', 8), ('Onion', 20), ('Carrot', 20), ('Green beans', 20), ('Cabbage', 20), ('Soy sauce', 5), ('Salt', 1)], []),
    ('Hakka noodles, veg', 'veg noodles|chowmein|chow mein', 'Indo-Chinese', ('plate', 250), [('Chinese noodles, dry', 70), ('Oil, sunflower', 10), ('Cabbage', 30), ('Carrot', 20), ('Capsicum, green', 20), ('Onion', 20), ('Soy sauce', 6), ('Salt', 1)], []),
    ('Khichdi', 'moong dal khichdi|pongal|khichri', 'South Indian', ('katori', 200), [('Rice, white, raw', 35), ('Moong dal, raw', 20), ('Ghee', 5), ('Cumin seeds', 1), ('Turmeric powder', 0.5), ('Salt', 1.5)], []),
    # --- dals and legumes (per katori, 150 g cooked) ---
    ('Dal tadka', 'dal|toor dal|tadka dal|dal fry|pappu', 'North Indian', ('katori', 150), [('Toor dal, raw', 25), ('Oil, sunflower', 4), ('Onion', 15), ('Tomato', 20), ('Garlic', 2), ('Cumin seeds', 0.5), ('Turmeric powder', 0.5), ('Red chilli powder', 0.5), ('Salt', 1)], []),
    ('Moong dal', 'moong dal curry|pesara pappu', 'North Indian', ('katori', 150), [('Moong dal, raw', 25), ('Oil, sunflower', 4), ('Cumin seeds', 0.5), ('Turmeric powder', 0.5), ('Tomato', 15), ('Salt', 1)], []),
    ('Masoor dal', 'red lentil dal', 'North Indian', ('katori', 150), [('Masoor dal, raw', 25), ('Oil, sunflower', 4), ('Onion', 10), ('Tomato', 15), ('Turmeric powder', 0.5), ('Salt', 1)], []),
    ('Palak dal', 'dal palak|spinach dal|pappu koora', 'Andhra/Telangana', ('katori', 150), [('Toor dal, raw', 22), ('Spinach', 30), ('Oil, sunflower', 4), ('Garlic', 2), ('Turmeric powder', 0.5), ('Salt', 1)], []),
    ('Sambar', 'sambhar|sambar', 'South Indian', ('katori', 150), [('Toor dal, raw', 20), ('Tomato', 20), ('Onion', 15), ('Brinjal, eggplant', 15), ('Tamarind', 4), ('Oil, groundnut', 3), ('Mustard seeds', 0.5), ('Curry powder', 1.5), ('Turmeric powder', 0.5), ('Salt', 1)], []),
    ('Rasam', 'charu|saaru|pepper rasam', 'South Indian', ('katori', 150), [('Toor dal, raw', 6), ('Tomato', 25), ('Tamarind', 4), ('Oil, groundnut', 2), ('Mustard seeds', 0.5), ('Black pepper', 0.5), ('Cumin seeds', 0.5), ('Salt', 1)], []),
    ('Rajma masala', 'rajma|rajma curry|kidney bean curry', 'North Indian', ('katori', 150), [('Rajma, kidney beans raw', 30), ('Onion', 25), ('Tomato', 30), ('Oil, sunflower', 6), ('Ginger', 2), ('Garlic', 2), ('Curry powder', 2), ('Salt', 1)], []),
    ('Chole masala', 'chana masala|chole|chickpea curry', 'North Indian', ('katori', 150), [('Chana, chickpeas raw', 35), ('Onion', 25), ('Tomato', 30), ('Oil, sunflower', 6), ('Ginger', 2), ('Garlic', 2), ('Curry powder', 2), ('Salt', 1)], []),
    ('Dal makhani', 'maa ki dal|black dal', 'North Indian', ('katori', 150), [('Urad dal, raw', 25), ('Rajma, kidney beans raw', 5), ('Butter', 8), ('Onion', 15), ('Tomato', 25), ('Milk, whole', 10), ('Curry powder', 1.5), ('Salt', 1)], []),
    ('Lobia curry', 'black eyed peas curry|chawli', 'North Indian', ('katori', 150), [('Lobia, black-eyed peas raw', 30), ('Onion', 20), ('Tomato', 25), ('Oil, sunflower', 5), ('Curry powder', 1.5), ('Salt', 1)], []),
    ('Sundal, chana', 'chana sundal|boiled chana|sundal', 'South Indian', ('katori', 120), [('Chana, chickpeas raw', 35), ('Coconut, fresh', 8), ('Oil, groundnut', 3), ('Mustard seeds', 0.5), ('Salt', 1)], []),
    ('Sprouts salad', 'sprouts chaat|moong sprouts salad', 'Street food', ('katori', 150), [('Moong sprouts', 100), ('Onion', 15), ('Tomato', 15), ('Cucumber', 10), ('Lemon juice', 5), ('Salt', 1)], []),
    ('Soya chunks curry', 'soya curry|meal maker curry', 'North Indian', ('katori', 150), [('Soya chunks, dry', 30), ('Onion', 25), ('Tomato', 30), ('Oil, sunflower', 6), ('Curry powder', 2), ('Salt', 1)], []),
    ('Soya chunks fry', 'soya fry|soya 65', 'Mess', ('katori', 100), [('Soya chunks, dry', 30), ('Oil, sunflower', 6), ('Onion', 20), ('Green chilli', 3), ('Curry powder', 1.5), ('Salt', 1)], []),
    ('Kadhi', 'punjabi kadhi|majjiga pulusu', 'North Indian', ('katori', 150), [('Curd, plain', 60), ('Besan, gram flour', 12), ('Oil, sunflower', 4), ('Turmeric powder', 0.5), ('Mustard seeds', 0.5), ('Salt', 1)], []),
    # --- vegetable dishes (per katori) ---
    ('Aloo gobi', 'potato cauliflower curry', 'North Indian', ('katori', 150), [('Potato', 50), ('Cauliflower', 60), ('Onion', 15), ('Oil, sunflower', 7), ('Turmeric powder', 0.5), ('Curry powder', 1.5), ('Salt', 1)], []),
    ('Aloo sabzi', 'potato fry|bangaladumpa|aloo fry', 'North Indian', ('katori', 120), [('Potato', 100), ('Oil, sunflower', 7), ('Cumin seeds', 0.5), ('Turmeric powder', 0.5), ('Salt', 1)], []),
    ('Bhindi fry', 'okra fry|bendakaya fry|bhindi masala', 'North Indian', ('katori', 120), [('Okra, bhindi', 100), ('Oil, sunflower', 7), ('Onion', 15), ('Curry powder', 1), ('Salt', 1)], []),
    ('Baingan bharta', 'brinjal bharta|vankaya', 'North Indian', ('katori', 150), [('Brinjal, eggplant', 120), ('Onion', 20), ('Tomato', 20), ('Oil, sunflower', 7), ('Curry powder', 1), ('Salt', 1)], []),
    ('Cabbage poriyal', 'cabbage fry|cabbage thoran|cabbage palya', 'South Indian', ('katori', 100), [('Cabbage', 100), ('Coconut, fresh', 8), ('Oil, groundnut', 4), ('Mustard seeds', 0.5), ('Green chilli', 2), ('Salt', 1)], []),
    ('Beans poriyal', 'beans fry|green beans curry', 'South Indian', ('katori', 100), [('Green beans', 100), ('Coconut, fresh', 8), ('Oil, groundnut', 4), ('Mustard seeds', 0.5), ('Salt', 1)], []),
    ('Mixed vegetable curry', 'mixed veg|veg curry|veg kurma|kurma', 'South Indian', ('katori', 150), [('Carrot', 25), ('Green beans', 25), ('Green peas, raw', 20), ('Potato', 25), ('Onion', 15), ('Coconut, fresh', 10), ('Oil, sunflower', 6), ('Curry powder', 2), ('Salt', 1)], []),
    ('Palak, spinach sabzi', 'spinach curry|palak sabzi|keerai poriyal', 'North Indian', ('katori', 120), [('Spinach', 100), ('Oil, sunflower', 5), ('Garlic', 2), ('Onion', 10), ('Salt', 1)], []),
    ('Tomato curry', 'tomato pachadi|tamatar sabzi|tomato pappu', 'Andhra/Telangana', ('katori', 150), [('Tomato', 120), ('Oil, groundnut', 5), ('Onion', 15), ('Red chilli powder', 1), ('Turmeric powder', 0.5), ('Salt', 1)], []),
    ('Pumpkin sabzi', 'kaddu sabzi|gummadikaya', 'North Indian', ('katori', 120), [('Pumpkin', 100), ('Oil, sunflower', 5), ('Mustard seeds', 0.5), ('Salt', 1)], []),
    ('Coconut chutney', 'nariyal chutney|kobbari pachadi', 'South Indian', ('tbsp', 30), [('Coconut, fresh', 15), ('Green chilli', 2), ('Oil, groundnut', 1), ('Mustard seeds', 0.3), ('Salt', 0.5)], [('katori', 60)]),
    ('Peanut chutney', 'groundnut chutney|palli chutney', 'Andhra/Telangana', ('tbsp', 30), [('Peanuts, raw', 12), ('Green chilli', 2), ('Tamarind', 2), ('Oil, groundnut', 2), ('Salt', 0.5)], []),
    ('Raita', 'curd raita|boondi raita', 'North Indian', ('katori', 120), [('Curd, plain', 100), ('Cucumber', 15), ('Onion', 5), ('Cumin seeds', 0.3), ('Salt', 0.7)], []),
    # --- eggs, chicken, fish, mutton ---
    ('Egg bhurji', 'egg burji|scrambled eggs indian|egg podimas', 'Street food', ('serving', 120), [('Egg, whole', 100), ('Onion', 25), ('Tomato', 20), ('Oil, sunflower', 5), ('Green chilli', 2), ('Turmeric powder', 0.5), ('Salt', 1)], []),
    ('Omelette', 'masala omelette|egg omelette|omlet', 'Street food', ('serving', 120), [('Egg, whole', 100), ('Oil, sunflower', 5), ('Onion', 10), ('Green chilli', 2), ('Salt', 1)], []),
    ('Egg curry', 'anda curry|egg masala|kodi guddu pulusu', 'Andhra/Telangana', ('serving', 220), [('Egg, whole', 100), ('Onion', 40), ('Tomato', 40), ('Oil, sunflower', 8), ('Ginger', 2), ('Garlic', 2), ('Curry powder', 2), ('Salt', 1.5)], []),
    ('Boiled eggs', 'boiled egg|hard boiled egg', 'Mess', ('egg', 50), [('Egg, whole', 50)], []),
    ('Chicken curry', 'chicken gravy|kodi kura|chicken masala', 'Andhra/Telangana', ('katori', 200), [('Chicken thigh with skin, raw', 120), ('Onion', 40), ('Tomato', 40), ('Oil, sunflower', 10), ('Curd, plain', 10), ('Ginger', 3), ('Garlic', 3), ('Curry powder', 3), ('Red chilli powder', 2), ('Salt', 2)], []),
    ('Chicken fry', 'chicken 65|chicken vepudu|dry chicken', 'Andhra/Telangana', ('serving', 150), [('Chicken thigh with skin, raw', 130), ('Oil, sunflower', 12), ('Besan, gram flour', 6), ('Ginger', 3), ('Garlic', 3), ('Red chilli powder', 2), ('Salt', 1.5)], []),
    ('Grilled chicken breast', 'tandoori chicken|chicken tikka|grilled chicken', 'North Indian', ('serving', 150), [('Chicken breast, raw', 150), ('Curd, plain', 15), ('Oil, sunflower', 4), ('Red chilli powder', 1), ('Salt', 1.5)], []),
    ('Fish curry', 'chepala pulusu|meen kuzhambu|fish gravy', 'Andhra/Telangana', ('katori', 200), [('Fish, carp (rohu), raw', 110), ('Onion', 30), ('Tomato', 30), ('Oil, groundnut', 8), ('Tamarind', 6), ('Red chilli powder', 2), ('Salt', 2)], []),
    ('Fish fry', 'chepala vepudu|meen varuval', 'South Indian', ('serving', 130), [('Fish, tilapia, raw', 120), ('Oil, groundnut', 10), ('Red chilli powder', 1.5), ('Turmeric powder', 0.5), ('Salt', 1.5)], []),
    ('Mutton curry', 'goat curry|mutton gravy|mamsam', 'Andhra/Telangana', ('katori', 200), [('Mutton (goat), raw', 110), ('Onion', 40), ('Tomato', 30), ('Oil, sunflower', 12), ('Ginger', 3), ('Garlic', 3), ('Curry powder', 3), ('Salt', 2)], []),
    ('Prawn fry', 'royyala vepudu|prawn masala', 'Andhra/Telangana', ('serving', 120), [('Prawns, raw', 100), ('Oil, groundnut', 10), ('Onion', 15), ('Red chilli powder', 1.5), ('Salt', 1)], []),
    # --- south indian tiffin ---
    ('Idli', 'idly|steamed rice cake', 'South Indian', ('idli', 40), [('Rice, white, raw', 12), ('Urad dal, raw', 4)], []),
    ('Plain dosa', 'dosa|dose|sada dosa', 'South Indian', ('dosa', 80), [('Rice, white, raw', 25), ('Urad dal, raw', 8), ('Oil, groundnut', 4)], []),
    ('Masala dosa', 'potato dosa', 'South Indian', ('dosa', 200), [('Rice, white, raw', 30), ('Urad dal, raw', 10), ('Oil, groundnut', 7), ('Potato', 60), ('Onion', 20), ('Mustard seeds', 0.5), ('Turmeric powder', 0.5), ('Salt', 1)], []),
    ('Uttapam', 'onion uttapam|oothappam', 'South Indian', ('uttapam', 120), [('Rice, white, raw', 25), ('Urad dal, raw', 8), ('Onion', 20), ('Tomato', 10), ('Oil, groundnut', 5)], []),
    ('Upma', 'rava upma|uppittu', 'South Indian', ('katori', 150), [('Rava, semolina', 35), ('Oil, groundnut', 5), ('Onion', 15), ('Mustard seeds', 0.5), ('Green chilli', 2), ('Salt', 1)], []),
    ('Poha', 'kanda poha|aval upma|pohe', 'North Indian', ('katori', 150), [('Poha, flattened rice', 40), ('Oil, groundnut', 5), ('Onion', 20), ('Peanuts, raw', 8), ('Mustard seeds', 0.5), ('Turmeric powder', 0.5), ('Lemon juice', 3), ('Salt', 1)], []),
    ('Ven pongal', 'pongal|khara pongal', 'South Indian', ('katori', 150), [('Rice, white, raw', 30), ('Moong dal, raw', 15), ('Ghee', 5), ('Black pepper', 0.5), ('Cumin seeds', 0.5), ('Cashew nuts, raw', 3), ('Salt', 1)], []),
    ('Medu vada', 'vada|ulundu vada|garelu', 'South Indian', ('vada', 50), [('Urad dal, raw', 25), ('Oil, groundnut', 7), ('Green chilli', 1), ('Salt', 0.5)], []),
    ('Besan chilla', 'cheela|besan cheela|pudla', 'North Indian', ('chilla', 90), [('Besan, gram flour', 30), ('Onion', 15), ('Tomato', 10), ('Oil, sunflower', 4)], []),
    ('Oats porridge with milk', 'oats|oatmeal|oats upma', 'Continental', ('katori', 250), [('Oats, rolled', 40), ('Milk, whole', 150), ('Sugar', 4)], []),
    ('Bread omelette', 'bread egg|egg sandwich', 'Street food', ('serving', 150), [('Egg, whole', 100), ('Bread, white', 56), ('Oil, sunflower', 5), ('Onion', 10), ('Salt', 1)], []),
    # --- street food and snacks ---
    ('Samosa', 'aloo samosa', 'Street food', ('samosa', 80), [('Maida', 25), ('Oil, sunflower', 12), ('Potato', 35), ('Green peas, raw', 6), ('Curry powder', 1), ('Salt', 0.5)], []),
    ('Vada pav', 'wada pav|batata vada pav', 'Street food', ('vada pav', 150), [('Potato', 60), ('Besan, gram flour', 12), ('Oil, sunflower', 12), ('Bread, white', 56), ('Green chilli', 2), ('Salt', 1)], []),
    ('Pav bhaji', 'bhaji pav', 'Street food', ('plate', 300), [('Potato', 80), ('Cauliflower', 40), ('Green peas, raw', 25), ('Tomato', 50), ('Onion', 30), ('Butter', 12), ('Bread, white', 56), ('Curry powder', 3), ('Salt', 2)], []),
    ('Peanut chaat', 'boiled peanuts chaat|groundnut salad', 'Street food', ('katori', 100), [('Peanuts, raw', 40), ('Onion', 15), ('Tomato', 15), ('Lemon juice', 5), ('Salt', 1)], []),
    ('Roasted peanuts', 'peanuts snack|verusenaga', 'Mess', ('handful', 30), [('Peanuts, raw', 30)], []),
    ('Papad, roasted', 'appalam|pappadam|papad', 'Mess', ('papad', 12), [('Papad', 12)], []),
    # --- drinks ---
    ('Chai with sugar', 'chai|tea|milk tea|cutting chai|sweet tea', 'Street food', ('cup', 150), [('Milk, whole', 100), ('Sugar', 8)], []),
    ('Chai without sugar', 'unsweetened tea|sugarless chai', 'Street food', ('cup', 150), [('Milk, whole', 100)], []),
    ('Coffee with milk and sugar', 'filter coffee|coffee|kaapi', 'South Indian', ('cup', 150), [('Milk, whole', 100), ('Sugar', 8)], []),
    ('Sweet lassi', 'lassi', 'North Indian', ('glass', 250), [('Curd, plain', 150), ('Sugar', 15)], []),
    ('Masala buttermilk', 'chaas|majjiga|spiced buttermilk', 'South Indian', ('glass', 250), [('Buttermilk', 240), ('Cumin seeds', 0.5), ('Salt', 1)], []),
    ('Banana shake', 'banana milkshake', 'Continental', ('glass', 300), [('Milk, whole', 200), ('Banana', 100), ('Sugar', 5)], []),
    ('Whey protein shake with water', 'protein shake|whey shake', 'Continental', ('glass', 280), [('Whey protein isolate', 30)], []),
    ('Whey protein shake with milk', 'protein shake with milk', 'Continental', ('glass', 280), [('Whey protein isolate', 30), ('Milk, whole', 250)], []),
]

OUT = Path(__file__).resolve().parent.parent


def load_usda(folder: Path):
    foods = {r['description']: r['fdc_id'] for r in csv.DictReader(open(folder / 'food.csv', encoding='utf-8'))}
    wanted = set(NUTRIENT_IDS.values())
    values = {}
    with open(folder / 'food_nutrient.csv', encoding='utf-8') as f:
        for r in csv.DictReader(f):
            if r['nutrient_id'] in wanted:
                values[(r['fdc_id'], r['nutrient_id'])] = r['amount']
    return foods, values


def fmt(v):
    if v is None or v == '':
        return ''
    x = float(v)
    return str(int(x)) if x == int(x) else f'{x:.3f}'.rstrip('0').rstrip('.')


def q(cell):
    cell = str(cell)
    return f'"{cell}"' if (',' in cell or '"' in cell) else cell


def main(folder: Path):
    foods, values = load_usda(folder)
    ing_rows, missing = [], []
    for name, aliases, diet, jain, desc, note in USDA_MAP:
        fdc = foods.get(desc)
        if fdc is None:
            missing.append((name, desc))
            continue
        nums = {col: fmt(values.get((fdc, NUTRIENT_IDS[col]))) for col in NUTRIENT_IDS}
        ref = f'FDC {fdc}: {desc}'
        if note:
            ref += f' | {note}'
        src = 'USDA FoodData Central SR Legacy' + (' (PROXY)' if note.startswith('PROXY') else '')
        ing_rows.append((name, aliases, '', diet, 'true' if jain else 'false', nums, src, ref))
    if missing:
        print('NOT FOUND IN USDA DATA:')
        for m in missing:
            print('  ', m)
        sys.exit(1)

    water = {'kcal_100g': '0', 'protein_100g': '0', 'carbs_100g': '0', 'fat_100g': '0', 'fibre_100g': '0', 'iron_mg_100g': '0',
             'calcium_mg_100g': '0', 'vitc_mg_100g': '0', 'b12_ug_100g': '0', 'sodium_mg_100g': '0', 'sugar_100g': '0'}
    ing_rows.append((WATER[0], WATER[1], '', WATER[2], 'true', water, 'Zero by definition', 'Filler so a serving weighs its household unit'))

    with open(OUT / 'ingredients.csv', 'w', encoding='utf-8', newline='') as f:
        f.write('name,aliases,cuisine,diet,jain_ok,' + ','.join(COLUMNS) + ',source,source_ref\n')
        for name, aliases, cuisine, diet, jain, nums, src, ref in ing_rows:
            f.write(','.join(q(x) for x in [name, aliases, cuisine, diet, jain] + [nums.get(c, '') for c in COLUMNS] + [src, ref]) + '\n')

    by_name = {r[0]: r for r in ing_rows}
    order = {VG: 0, V: 1, E: 2, N: 3}
    dish_rows, item_rows, unit_rows = [], [], []
    heavy = []

    for name, aliases, cuisine, (unit, grams), items, extra in RECIPES:
        total = sum(g for _, g in items)
        fill = round(grams - total, 3)
        if fill < -0.01:
            # Raw ingredients outweigh the cooked serving (meat, greens and vegetables lose water in the pan), so the
            # serving is defined by the raw ingredient weight. The unit grams below then match the nutrients exactly.
            grams = round(total)
            fill = round(grams - total, 3)
        diet = VG
        jain = True
        for ing, _ in items:
            if ing not in by_name:
                print(f'UNKNOWN INGREDIENT in {name}: {ing}')
                sys.exit(1)
            r = by_name[ing]
            if order[r[3]] > order[diet]:
                diet = r[3]
            jain = jain and r[4] == 'true'
        dish_rows.append((name, aliases, cuisine, diet, 'true' if jain else 'false'))
        for ing, g in items:
            item_rows.append((name, ing, g))
        if fill > 0.01:
            item_rows.append((name, 'Water', fill))
        unit_rows.append((name, unit, grams, 'true'))
        for u, g in extra:
            unit_rows.append((name, u, g, 'false'))

    if heavy:
        sys.exit(1)
    with open(OUT / 'dishes.csv', 'w', encoding='utf-8', newline='') as f:
        f.write('name,aliases,cuisine,diet,jain_ok,kcal_100g,source,source_ref\n')
        for name, aliases, cuisine, diet, jain in dish_rows:
            f.write(','.join(q(x) for x in [name, aliases, cuisine, diet, jain, '', 'Computed from ingredients',
                                            'Recipe grams are an authored estimate of a typical home or mess serving; needs nutritionist review']) + '\n')
    with open(OUT / 'dish_items.csv', 'w', encoding='utf-8', newline='') as f:
        f.write('dish,item,grams\n')
        for d, i, g in item_rows:
            f.write(','.join(q(x) for x in [d, i, fmt(g)]) + '\n')
    with open(OUT / 'units.csv', 'w', encoding='utf-8', newline='') as f:
        f.write('food,unit,grams,is_default\n')
        for name, *_ in ing_rows:
            us = ING_UNITS.get(name)
            if us:
                for unit, g, d in us:
                    f.write(','.join(q(x) for x in [name, unit, g, 'true' if d else 'false']) + '\n')
                if not any(d for _, _, d in us if d):
                    pass
                f.write(','.join(q(x) for x in [name, 'g', 1, 'false']) + '\n')
            else:
                f.write(','.join(q(x) for x in [name, 'g', 1, 'true']) + '\n')
        for row in unit_rows:
            f.write(','.join(q(x) for x in row) + '\n')

    print(f'Wrote {len(ing_rows)} ingredients, {len(dish_rows)} dishes, {len(item_rows)} dish items, {len(unit_rows)} dish units.')


if __name__ == '__main__':
    if len(sys.argv) != 2:
        print(__doc__)
        sys.exit(2)
    main(Path(sys.argv[1]))
