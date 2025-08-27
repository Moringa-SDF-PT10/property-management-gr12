
# app.py
from flask import Flask, send_from_directory
from flask_cors import CORS
from flask_restful import Api
from models import db
from routes import PropertyListResource, PropertyResource
import os

from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate



def create_app():
    app = Flask(__name__)
    app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///rentals.db"
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

    # Enable CORS for your frontend
    CORS(app, origins="http://127.0.0.1:5173", supports_credentials=True)
    
    db = SQLAlchemy(app)
    migrate = Migrate (app, db)

    # Initialize DB
    db.init_app(app)

    # Initialize Flask-RESTful API
    api = Api(app)

    # Register resources
    api.add_resource(PropertyListResource, "/properties")
    api.add_resource(PropertyResource, "/properties/<int:id>")

    # Serve uploaded images
    UPLOAD_FOLDER = "uploads/properties"
    os.makedirs(UPLOAD_FOLDER, exist_ok=True)

    @app.route("/uploads/<filename>")
    def uploaded_file(filename):
        return send_from_directory(UPLOAD_FOLDER, filename)

    return app

# Run the app
if __name__ == "__main__":
    app = create_app()
    with app.app_context():
        db.create_all()  # create tables if not exist










if __name__ == "__main__":

    app.run(debug=True)
