from flask import Flask, send_from_directory
from flask_cors import CORS
from flask_restful import Api
from models import db
from routes import PropertyListResource, PropertyResource
import os
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_jwt_extended import JWTManager
from datetime import timedelta

app = Flask(__name__)

def create_app():
    app = Flask(__name__)
    app.config["SECRET_KEY"] = os.getenv("SECRET_KEY", "dev-key")
    app.config["SQLALCHEMY_DATABASE_URI"] = os.getenv("DATABASE_URL", "sqlite:///rentals.db")
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = os.getenv("SQLALCHEMY_TRACK_MODIFICATIONS", False)
    app.config["JWT_SECRET_KEY"] = os.getenv("JWT_SECRET_KEY", "dev-jwt-key") 
    app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(hours=1)
    app.config["JWT_REFRESH_TOKEN_EXPIRES"] = timedelta(days=7)

    UPLOAD_FOLDER = "uploads/properties"
    os.makedirs(UPLOAD_FOLDER, exist_ok=True)
    app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER

    db.init_app(app)
    jwt = JWTManager(app)
    migrate = Migrate (app, db)

    # Enable CORS for your frontend
    CORS(app, origins="http://127.0.0.1:5173", supports_credentials=True)
    

    api = Api()
   

    # Register resources
    api.add_resource(PropertyListResource, "/properties")
    api.add_resource(PropertyResource, "/properties/<int:id>")


    @app.route("/uploads/<filename>")
    def uploaded_file(filename):
        return send_from_directory(app.config["UPLOAD_FOLDER"], filename)

    return app
from views import *
# Run the app
if __name__ == "__main__":
    app = create_app()
    with app.app_context():
        db.create_all()
    app.run(debug=True)
