# seed.py
import os
import json
from app import create_app
from extensions import db
from models import Property
from werkzeug.utils import secure_filename
import shutil

# Initialize app
app = create_app()
UPLOAD_FOLDER = "uploads/properties"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# Optional: clear existing images
for file in os.listdir(UPLOAD_FOLDER):
    file_path = os.path.join(UPLOAD_FOLDER, file)
    if os.path.isfile(file_path):
        os.unlink(file_path)

# Sample properties data
properties_data = [
    {
        "name": "Lakeview Apartments",
        "location": "Nairobi",
        "rent": 25000,
        "status": "vacant",
        "images": ["sample1.jpg", "sample2.jpg"]
    },
    {
        "name": "Sunset Villas",
        "location": "Mombasa",
        "rent": 40000,
        "status": "occupied",
        "images": ["sample3.jpg"]
    },
    {
        "name": "Garden Residences",
        "location": "Kisumu",
        "rent": 30000,
        "status": "vacant",
        "images": []
    },
]

# Function to "upload" sample images (just copy to uploads folder)
def copy_images(image_list):
    uploaded = []
    for img in image_list:
        src_path = os.path.join("sample_images", img)  # you can create a folder called sample_images
        if os.path.exists(src_path):
            filename = secure_filename(img)
            dest_path = os.path.join(UPLOAD_FOLDER, filename)
            shutil.copy(src_path, dest_path)
            uploaded.append(f"/uploads/{filename}")
    return uploaded

with app.app_context():
    # Clear existing data
    db.drop_all()
    db.create_all()

    for pdata in properties_data:
        pics = copy_images(pdata["images"])
        prop = Property(
            name=pdata["name"],
            location=pdata["location"],
            rent=pdata["rent"],
            status=pdata["status"],
            pictures=json.dumps(pics)
        )
        db.session.add(prop)
    
    db.session.commit()
    print("Database seeded with sample properties!")
