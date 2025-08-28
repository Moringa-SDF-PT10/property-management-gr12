from flask_restful import Resource
from flask import request, jsonify
from werkzeug.utils import secure_filename
import os, json, uuid
from models import Property
from extensions import db

# Base directories
BASE_DIR = os.path.abspath(os.path.dirname(__file__))
UPLOAD_FOLDER = os.path.join(BASE_DIR, "uploads/properties")
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "gif"}


def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


def unique_filename(filename):
    """Append UUID to avoid overwriting files with the same name."""
    ext = filename.rsplit(".", 1)[1].lower()
    return f"{uuid.uuid4().hex}.{ext}"


class PropertyListResource(Resource):
    def get(self):
        try:
            properties = Property.query.all()
            return [p.to_dict() for p in properties], 200
        except Exception as e:
            return {"error": str(e)}, 500

    def post(self):
        try:
            name = request.form.get("name", "").strip()
            location = request.form.get("location", "").strip()
            rent = request.form.get("rent", "").strip()
            status = request.form.get("status", "vacant").strip().lower()

            # Validation
            if not name or not location or not rent:
                return {"error": "Missing required fields: name, location, and rent are required"}, 400

            try:
                rent = float(rent)
                if rent < 0:
                    return {"error": "Rent must be a positive number"}, 400
            except ValueError:
                return {"error": "Rent must be a valid number"}, 400

            if status not in ["vacant", "occupied"]:
                return {"error": "Status must be 'vacant' or 'occupied'"}, 400

            # Handle pictures
            pictures = []
            if "pictures" in request.files:
                files = request.files.getlist("pictures")
                for file in files:
                    if file.filename == "":
                        continue
                    if not allowed_file(file.filename):
                        return {"error": f"File type not allowed: {file.filename}"}, 400

                    filename = f"{uuid.uuid4().hex}_{secure_filename(file.filename)}"
                    filepath = os.path.join(PROPERTIES_FOLDER, filename)
                    file.save(filepath)
                    pictures.append(f"/uploads/properties/{filename}")

            # Create property
            prop = Property(
                name=name,
                location=location,
                rent=rent,
                status=status,
                pictures=json.dumps(pictures)
            )
            db.session.add(prop)
            db.session.commit()

            return {"message": "Property created successfully", "property": prop.to_dict()}, 201

        except Exception as e:
            db.session.rollback()
            return {"error": str(e)}, 500


class PropertyResource(Resource):
    def get(self, id):
        try:
            prop = Property.query.get_or_404(id)
            return prop.to_dict(), 200
        except Exception as e:
            return {"error": str(e)}, 500

    def put(self, id):
        try:
            prop = Property.query.get_or_404(id)

            name = request.form.get("name", prop.name).strip()
            location = request.form.get("location", prop.location).strip()
            rent = request.form.get("rent", prop.rent)
            status = request.form.get("status", prop.status).strip().lower()

            # Validation
            if not name or not location or not rent:
                return {"error": "Missing required fields: name, location, and rent are required"}, 400

            try:
                rent = float(rent)
                if rent < 0:
                    return {"error": "Rent must be a positive number"}, 400
            except ValueError:
                return {"error": "Rent must be a valid number"}, 400

            if status not in ["vacant", "occupied"]:
                return {"error": "Status must be 'vacant' or 'occupied'"}, 400

            # Update fields
            prop.name = name
            prop.location = location
            prop.rent = rent
            prop.status = status

            # Handle new pictures
            new_pics = []
            if "pictures" in request.files:
                files = request.files.getlist("pictures")
                for file in files:
                    if file.filename == "":
                        continue
                    if not allowed_file(file.filename):
                        return {"error": f"File type not allowed: {file.filename}"}, 400

                    filename = f"{uuid.uuid4().hex}_{secure_filename(file.filename)}"
                    filepath = os.path.join(PROPERTIES_FOLDER, filename)
                    file.save(filepath)
                    new_pics.append(f"/uploads/properties/{filename}")

            if new_pics:
                existing = json.loads(prop.pictures) if prop.pictures else []
                prop.pictures = json.dumps(existing + new_pics)

            db.session.commit()
            return {"message": "Property updated successfully", "property": prop.to_dict()}, 200

        except Exception as e:
            db.session.rollback()
            return {"error": str(e)}, 500


class PropertySummaryResource(Resource):
    def get(self):
        try:
            total_properties = Property.query.count()
            occupied_properties = Property.query.filter_by(status="occupied").count()
            vacant_properties = Property.query.filter_by(status="vacant").count()

            summary = {
                "total": total_properties,
                "occupied": occupied_properties,
                "vacant": vacant_properties,
            }
            return summary, 200
        except Exception as e:
            return {"error": str(e)}, 500
