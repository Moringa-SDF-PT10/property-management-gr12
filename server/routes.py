from flask_restful import Resource
from flask import request, send_from_directory, jsonify
from werkzeug.utils import secure_filename
import os, json, uuid
from models import db, Property

UPLOAD_FOLDER = "uploads/properties"
ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "gif"}
os.makedirs(UPLOAD_FOLDER, exist_ok=True)




def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS

def handle_property_errors(func):
    """Decorator to catch and return validation errors"""
    def wrapper(*args, **kwargs):
        try:
            return func(*args, **kwargs)
        except ValueError as e:
            return {"error": str(e)}, 400
        except Exception as e:
            return {"error": "Server error: " + str(e)}, 500
    return wrapper

class PropertyListResource(Resource):
    
    @handle_property_errors
    def get(self):
        properties = Property.query.all()
        return [p.to_dict() for p in properties], 200

    @handle_property_errors
    def post(self):
        name = request.form.get("name")
        location = request.form.get("location")
        rent = request.form.get("rent")
        status = request.form.get("status", "vacant")

        if not name or not location:
            return {"error": "Property name and location are required"}, 400
        try:
            rent = float(rent)
            if rent <= 0:
                raise ValueError
        except:
            return {"error": "Rent must be a positive number"}, 400

        pictures = []
        if "pictures" in request.files:
            files = request.files.getlist("pictures")
            for file in files:
                if file and allowed_file(file.filename):
                    filename = f"{uuid.uuid4().hex}_{secure_filename(file.filename)}"
                    filepath = os.path.join(UPLOAD_FOLDER, filename)
                    file.save(filepath)
                    pictures.append(f"/uploads/properties/{filename}")
                else:
                    return {"error": f"Invalid file type: {file.filename}"}, 400

        prop = Property(
            name=name.strip(),
            location=location.strip(),
            rent=rent,
            status=status,
            pictures=json.dumps(pictures)
        )
        db.session.add(prop)
        db.session.commit()
        return {"message": "Property created", "property": prop.to_dict()}, 201


class PropertyResource(Resource):

    @handle_property_errors
    def get(self, id):
        prop = Property.query.get_or_404(id)
        return prop.to_dict(), 200

    @handle_property_errors
    def put(self, id):
        prop = Property.query.get_or_404(id)
        name = request.form.get("name")
        location = request.form.get("location")
        rent = request.form.get("rent")
        status = request.form.get("status")

        if name:
            prop.name = name.strip()
        if location:
            prop.location = location.strip()
        if rent:
            try:
                rent_val = float(rent)
                if rent_val <= 0:
                    return {"error": "Rent must be a positive number"}, 400
                prop.rent = rent_val
            except:
                return {"error": "Rent must be a number"}, 400
        if status:
            if status not in ["vacant", "occupied", "maintenance"]:
                return {"error": f"Invalid status: {status}"}, 400
            prop.status = status

        # Handle new uploaded files
        if "pictures" in request.files:
            files = request.files.getlist("pictures")
            new_pics = []
            for file in files:
                if file and allowed_file(file.filename):
                    filename = f"{uuid.uuid4().hex}_{secure_filename(file.filename)}"
                    filepath = os.path.join(UPLOAD_FOLDER, filename)
                    file.save(filepath)
                    new_pics.append(f"/uploads/properties/{filename}")
                else:
                    return {"error": f"Invalid file type: {file.filename}"}, 400
            existing = json.loads(prop.pictures) if prop.pictures else []
            prop.pictures = json.dumps(existing + new_pics)

        # Handle image deletion
        delete_imgs = request.form.getlist("delete_images[]")
        if delete_imgs:
            existing = json.loads(prop.pictures) if prop.pictures else []
            remaining = []
            for img_url in existing:
                if img_url in delete_imgs:
                    try:
                        os.remove(img_url.lstrip("/"))
                    except FileNotFoundError:
                        pass
                else:
                    remaining.append(img_url)
            prop.pictures = json.dumps(remaining)

        db.session.commit()
        return {"message": "Property updated", "property": prop.to_dict()}, 200

    @handle_property_errors
    def delete(self, id):
        prop = Property.query.get_or_404(id)
        if prop.pictures:
            for img_url in json.loads(prop.pictures):
                try:
                    os.remove(img_url.lstrip("/"))
                except FileNotFoundError:
                    pass
        db.session.delete(prop)
        db.session.commit()
        return {"message": "Property deleted"}, 200


def register_upload_routes(app):
    @app.route("/uploads/properties/<filename>")
    def uploaded_file(filename):
        return send_from_directory(UPLOAD_FOLDER, filename)


class OccupancySummaryResource(Resource):

    @handle_property_errors
    def get(self):
        """Return count of occupied and vacant properties"""
        occupied_count = Property.query.filter_by(status="occupied").count()
        vacant_count = Property.query.filter_by(status="vacant").count()
        return {"occupied": occupied_count, "vacant": vacant_count}, 200
