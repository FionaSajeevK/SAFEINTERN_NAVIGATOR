import sys
import subprocess

try:
    from PIL import Image
except ImportError:
    subprocess.check_call([sys.executable, "-m", "pip", "install", "Pillow"])
    from PIL import Image

from sklearn.cluster import KMeans
import numpy as np

def get_dominant_colors(image_path, k=4):
    try:
        image = Image.open(image_path)
        image = image.convert('RGB')
        image = image.resize((50, 50))
        pixels = np.array(image).reshape(-1, 3)
        
        kmeans = KMeans(n_clusters=k, random_state=42, n_init=10)
        kmeans.fit(pixels)
        
        colors = kmeans.cluster_centers_
        percentages = np.unique(kmeans.labels_, return_counts=True)[1] / len(kmeans.labels_)
        
        results = []
        for color, pct in zip(colors, percentages):
            hx = '#{:02x}{:02x}{:02x}'.format(int(color[0]), int(color[1]), int(color[2]))
            results.append((hx, float(pct)))
            
        # sort by percentage
        results = sorted(results, key=lambda x: x[1], reverse=True)
        return results
    except Exception as e:
        return str(e)

print("Logo:", get_dominant_colors('logo.png'))
print("Home:", get_dominant_colors('home image.png'))
