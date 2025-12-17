import requests

API_KEY = "X"
url = "https://api.spoonacular.com/recipes/analyze"

payload = {
    "title": "Chicken Stir Fry",
    "servings": 3,
    "ingredients": [
        "300 g boneless chicken breast, sliced",
        "2 Tbsps vegetable oil",
        "1 cup broccoli florets",
        "1 red bell pepper, sliced",
        "1 carrot, julienned",
        "2 cloves garlic, minced",
        "2 Tbsps soy sauce",
        "1 Tsp sesame oil",
        "1 Tsp cornstarch",
        "2 Tbsps water"
    ],
    "instructions": "Heat vegetable oil in a large skillet over medium-high heat. Add chicken slices and cook until browned and cooked through. Remove chicken and set aside. In the same skillet, add garlic, broccoli, bell pepper, and carrot. Stir-fry for 3-4 minutes. Mix cornstarch with water and soy sauce, then pour over the vegetables. Return chicken to the skillet, add sesame oil, and toss everything together until well coated and heated through. Serve hot."
}

response = requests.post(url, json=payload, params={"apiKey": API_KEY, "includeNutrition": "true"})


print("Status code:", response.status_code)
print(response.json())