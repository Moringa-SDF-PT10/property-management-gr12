from app import db
import json

class Property(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    location = db.Column(db.String(150), nullable=False)
    rent = db.Column(db.Float, nullable=False)
    status = db.Column(db.String(20), nullable=False, default="vacant")
    pictures = db.Column(db.Text, nullable=True)  # store as JSON array

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "location": self.location,
            "rent": self.rent,
            "status": self.status,
            "pictures": json.loads(self.pictures) if self.pictures else [],
        }
