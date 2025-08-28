from flask import Flask, send_from_directory
from flask_cors import CORS
from flask_restful import Api
import os
from models import User, Property, Lease, Bill
from extensions import db, migrate
from routes import PropertyListResource, PropertyResource, PropertySummaryResource

BASE_DIR = os.path.abspath(os.path.dirname(__file__))
UPLOAD_FOLDER = os.path.join(BASE_DIR, "uploads")

def create_app():
    # Serve uploads as static folder
    app = Flask(
        __name__,
        static_url_path="/uploads",         # URL prefix
        static_folder=UPLOAD_FOLDER         # Folder to serve
    )

    # Database config
    app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///rentals.db"
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

    # Enable CORS
    CORS(app, origins="http://127.0.0.1:5173", supports_credentials=True)

    # Initialize extensions
    db.init_app(app)
    migrate.init_app(app, db)

    # Initialize API
    api = Api(app)
    api.add_resource(PropertyListResource, "/properties")
    api.add_resource(PropertyResource, "/properties/<int:id>")
    api.add_resource(PropertySummaryResource, "/properties/summary")

    # Optional: debug route to test uploads
    @app.route("/uploads-test/<path:filename>")
    def uploads_test(filename):
        print("Looking for:", os.path.join(UPLOAD_FOLDER, filename))
        return send_from_directory(UPLOAD_FOLDER, filename)

    # Summary route
    @app.route("/properties/summary", methods=["GET"])
    def properties_summary():
        total_properties = Property.query.count()
        occupied_properties = Property.query.filter_by(status="occupied").count()
        vacant_properties = Property.query.filter_by(status="vacant").count()
        return {
            "total": total_properties,
            "occupied": occupied_properties,
            "vacant": vacant_properties,
        }, 200

    return app

if __name__ == "__main__":
    app = create_app()
    with app.app_context():
        db.create_all()
    app.run(debug=True)
