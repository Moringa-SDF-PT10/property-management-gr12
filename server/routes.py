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

class PropertyListResource(Resource):
    def get(self):
        properties = Property.query.all()
        return [p.to_dict() for p in properties], 200

    def post(self):
        name = request.form.get("name")
        location = request.form.get("location")
        rent = float(request.form.get("rent", 0))
        status = request.form.get("status", "vacant")

        pictures = []
        if "pictures" in request.files:
            files = request.files.getlist("pictures")
            
            for file in files:
                if file and allowed_file(file.filename):
                    filename = f"{uuid.uuid4().hex}_{secure_filename(file.filename)}"
                    filename = secure_filename(file.filename)
                    filepath = os.path.join(UPLOAD_FOLDER, filename)
                    file.save(filepath)
                    pictures.append(f"/uploads/properties/{filename}")

        prop = Property(
            name=name,
            location=location,
            rent=rent,
            status=status,
            pictures=json.dumps(pictures)
        )
        db.session.add(prop)
        db.session.commit()
        return {"message": "Property created", "property": prop.to_dict()}, 201

class PropertyResource(Resource):
    def get(self, id):
        prop = Property.query.get_or_404(id)
        return prop.to_dict(), 200

    def put(self, id):
        prop = Property.query.get_or_404(id)
        prop.name = request.form.get("name", prop.name)
        prop.location = request.form.get("location", prop.location)
        prop.rent = float(request.form.get("rent", prop.rent))
        prop.status = request.form.get("status", prop.status)

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

            existing = json.loads(prop.pictures) if prop.pictures else []
            prop.pictures = json.dumps(existing + new_pics)

        # Handle image deletion
        delete_imgs = request.form.getlist("delete_images[]")  # array of URLs to delete
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

    def delete(self, id):
        prop = Property.query.get_or_404(id)
        # Optionally remove images from disk
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
    def get(self):
        """Return count of occupied and vacant properties"""
        occupied_count = Property.query.filter_by(status="occupied").count()
        vacant_count = Property.query.filter_by(status="vacant").count()
        return {"occupied": occupied_count, "vacant": vacant_count}, 200
