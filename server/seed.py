from app import create_app
from models import Property, db
import os

# Ensure upload folder exists
UPLOAD_FOLDER = "uploads/properties"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# Sample properties
sample_properties = [
    {
        "name": "Apartment A",
        "location": "Nairobi, Kilimani",
        "rent": 35000,
        "status": "vacant",
        "pictures": "apartment_a.jpg,apartment_a2.jpg",
    },
    {
        "name": "Villa B",
        "location": "Mombasa, Nyali",
        "rent": 70000,
        "status": "occupied",
        "pictures": "villa_b.jpg",
    },
    {
        "name": "Studio C",
        "location": "Nairobi, Westlands",
        "rent": 20000,
        "status": "vacant",
        "pictures": "",
    },
]

# Create the app
app = create_app()

# Reset DB and seed data
with app.app_context():
    print("Dropping and creating tables...")
    db.drop_all()
    db.create_all()

    for prop_data in sample_properties:
        prop = Property(
            name=prop_data["name"],
            location=prop_data["location"],
            rent=prop_data["rent"],
            status=prop_data["status"],
            pictures=prop_data["pictures"],
        )
        db.session.add(prop)

    db.session.commit()
    print(f"Seeded {len(sample_properties)} properties successfully!")
