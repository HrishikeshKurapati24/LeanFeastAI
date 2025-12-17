import requests
import time
import os

# 1. Setup your list of dishes
dishes = [
    "Spicy Ramen with soft boiled egg",
    "Double smash burger with melting cheese",
    "Fresh strawberry tart with glaze"
]

# 2. Define the output folder
output_folder = "food_images"
os.makedirs(output_folder, exist_ok=True)

# 3. The Generation Loop
for dish in dishes:
    print(f"Generating: {dish}...")
    
    # Construct the prompt with your "photorealistic" keywords
    base_prompt = (
        f"Professional food photography of {dish}, "
        "macro shot, steam rising, 8k resolution, cinematic lighting, "
        "delicious texture, depth of field"
    )
    
    # 4. Construct the API URL (Note: 'flux' model is essential for realism)
    # We use a random seed per dish to get unique results, or fix it for consistency
    seed = int(time.time()) 
    url = f"https://image.pollinations.ai/prompt/{base_prompt}"
    
    params = {
        "model": "flux",      # The best model for realism
        "width": 1024,
        "height": 1024,
        "seed": seed,
        "nologo": "true"      # Removes the small logo
    }

    try:
        # 5. Send Request
        response = requests.get(url, params=params)
        
        if response.status_code == 200:
            # 6. Save the binary image data
            filename = f"{dish.replace(' ', '_').lower()}.jpg"
            file_path = os.path.join(output_folder, filename)
            
            with open(file_path, 'wb') as f:
                f.write(response.content)
            print(f"Saved: {filename}")
        else:
            print(f"Error: Status {response.status_code}")
            
    except Exception as e:
        print(f"Failed to generate {dish}: {e}")
        
    # Respectful pause to avoid rate limiting
    time.sleep(2) 

print("Batch generation complete!")