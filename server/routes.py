# routes.py
from flask_restful import Resource
from flask import request
from werkzeug.utils import secure_filename
import os, json, uuid
from flask_jwt_extended import JWTManager, create_access_token, create_refresh_token, jwt_required, get_jwt_identity, get_jwt
from models import db, User, Property, Lease, Bill, Notification
from functools import wraps
import re
from datetime import datetime, timedelta
from dateutil.relativedelta import relativedelta

# -------------------- CONFIG -------------------- #
UPLOAD_FOLDER = "uploads/properties"
ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "gif"}
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS

# -------------------- RESOURCES -------------------- #
class PropertyListResource(Resource):
    def get(self):
        """Return all properties"""
        properties = Property.query.all()
        return [p.to_dict() for p in properties], 200

    @jwt_required()
    def post(self):
        """Create a new property with optional multiple images"""
        name = request.form.get("name")
        location = request.form.get("location")
        rent = request.form.get("rent")
        status = request.form.get("status", "vacant")

        # Handle multiple file uploads
        pictures = []
        if "pictures" in request.files:
            files = request.files.getlist("pictures")
            for file in files:
                if file and allowed_file(file.filename):
                    #filename = f"{uuid.uuid4().hex} {secure_filename(file.filename)}"
                    filename = secure_filename(file.filename)
                    filepath = os.path.join(UPLOAD_FOLDER, filename)
                    file.save(filepath)
                    pictures.append(f"/uploads/properties/{filename}")

        prop = Property(
            name=name,
            location=location,
            rent=rent,
            status=status,
            pictures=json.dumps(pictures),  # store as JSON
        )

        db.session.add(prop)
        db.session.commit()

        return {"message": "Property created successfully", "property": prop.to_dict()}, 201


class PropertyResource(Resource):
    def get(self, id):
        """Return a single property by ID"""
        prop = Property.query.get_or_404(id)
        return prop.to_dict(), 200

    @jwt_required()
    def put(self, id):
        """Update property info and optionally add new images"""
        prop = Property.query.get_or_404(id)

        prop.name = request.form.get("name", prop.name)
        prop.location = request.form.get("location", prop.location)
        prop.rent = request.form.get("rent", prop.rent)
        prop.status = request.form.get("status", prop.status)

        # Handle image uploads (append new ones)
        if "pictures" in request.files:
            files = request.files.getlist("pictures")
            new_pics = []
            for file in files:
                if file and allowed_file(file.filename):
                    #filename = f"{uuid.uuid4().hex}_{secure_filename(file.filename)}"
                    filename = secure_filename(file.filename)
                    filepath = os.path.join(UPLOAD_FOLDER, filename)
                    file.save(filepath)
                    new_pics.append(f"/uploads/properties/{filename}")

            if new_pics:
                existing = json.loads(prop.pictures) if prop.pictures else []
                prop.pictures = json.dumps(existing + new_pics)

        db.session.commit()
        return {"message": "Property updated successfully", "property": prop.to_dict()}, 200

    @jwt_required()
    def delete(self, id):
        """Delete a property"""
        prop = Property.query.get_or_404(id)
        db.session.delete(prop)
        db.session.commit()
        return {"message": "Property deleted successfully"}, 200

def register_upload_routes(app):
    """Expose uploaded property images"""
    @app.route("/uploads/properties/<filename>")
    def uploaded_file(filename):
        return send_from_directory(UPLOAD_FOLDER, filename)