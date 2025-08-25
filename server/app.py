from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
import models
from flask_cors import CORS

app = Flask(__name__)
app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///rentals.db"
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

db = SQLAlchemy(app)
migrate = Migrate (app, db)
CORS(app)





if __name__ == "__main__":
    app.run(debug=True)