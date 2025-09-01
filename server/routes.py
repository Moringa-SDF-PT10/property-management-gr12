import json
from flask import request
from flask_restful import Resource
from flask_jwt_extended import jwt_required, get_jwt_identity # Import get_jwt_identity
from models import db, Property
import traceback

# ---------------- RESOURCES ---------------- #
class PropertyListResource(Resource):
    def get(self):
        """Return all properties"""
        properties = Property.query.all()
        return [p.to_dict() for p in properties], 200

    @jwt_required()
    def post(self):
        """Create a new property from JSON payload"""
        try:
            data = request.get_json() or {}

            name = data.get("name")
            location = data.get("location")
            rent = data.get("rent")
            status = data.get("status", "vacant")
            pictures = data.get("pictures", [])

            # Get the ID of the current logged-in user (landlord)
            current_user_id = get_jwt_identity()

            if not name or not location or rent is None:
                return {"message": "Name, location, and rent are required"}, 400

            if not current_user_id:
                return {"message": "Landlord ID not found in JWT token."}, 401

            prop = Property(
                name=name,
                location=location,
                rent=rent,
                status=status,
                pictures=json.dumps(pictures),
                landlord_id=current_user_id # Add the landlord_id here
            )

            db.session.add(prop)
            db.session.commit()

            return {"message": "Property created successfully", "property": prop.to_dict()}, 201

        except Exception as e:
            print("POST error:", e)
            return {"message": str(e)}, 500


class PropertyResource(Resource):
    def get(self, id):
        prop = Property.query.get_or_404(id)
        return prop.to_dict(), 200

    @jwt_required()
    def put(self, id):
        """Update property info from JSON payload"""
        try:
            prop = Property.query.get_or_404(id)
            data = request.get_json() or {}

            prop.name = data.get("name", prop.name)
            prop.location = data.get("location", prop.location)
            prop.rent = data.get("rent", prop.rent)
            prop.status = data.get("status", prop.status)
            new_pictures_data = data.get("pictures")

            if new_pictures_data is not None:
                # If pictures are provided in the payload, use them (they should be a list)
                if isinstance(new_pictures_data, list):
                    prop.pictures = json.dumps(new_pictures_data)
                elif isinstance(new_pictures_data, str):
                    # If frontend sent a single URL string, wrap it in a list
                    prop.pictures = json.dumps([new_pictures_data])
                else:
                    # Invalid format, maybe log or return an error, for now default to empty
                    print(f"Warning: Invalid pictures format received for property {id}: {new_pictures_data}")
                    prop.pictures = json.dumps([])
            else:
                # If pictures are NOT provided in the payload, retain existing ones.
                # The .to_dict() method already handles parsing, so just ensure it remains valid JSON text.
                # No change needed here if we simply want to keep the current value.
                # If the existing value is *not* valid JSON string, but just a plain string,
                # we should convert it to a JSON list during the update to prevent future issues.
                if prop.pictures and not prop.pictures.startswith('[') and not prop.pictures.startswith('"'):
                    # Heuristic check: if it's not already a JSON list or a JSON string,
                    # assume it's a plain URL and wrap it in a list.
                    prop.pictures = json.dumps([prop.pictures])
                elif not prop.pictures:
                    # If it's None or empty, make it an empty JSON list
                    prop.pictures = json.dumps([])

            db.session.commit()

            return {"message": "Property updated successfully", "property": prop.to_dict()}, 200

        except Exception as e:
            print("PUT error:", e)
            return {"message": str(e)}, 500

    @jwt_required()
    def delete(self, id):
        """Delete a property by its ID"""
        try:
            prop = Property.query.get_or_404(id)

            # Optional: Add authorization check to ensure only the landlord
            # who owns the property, or an admin, can delete it.
            current_user_id = get_jwt_identity()
            if prop.landlord_id != current_user_id:
                return {"message": "You are not authorized to delete this property."}, 403 # Forbidden

            db.session.delete(prop)
            db.session.commit()
            return {"message": "Property deleted successfully"}, 200 # Or 204 No Content
        except Exception as e:
            print(f"DELETE error for property {id}: {e}")
            traceback.print_exc() # Print full traceback to console/logs
            return {"message": str(e)}, 500