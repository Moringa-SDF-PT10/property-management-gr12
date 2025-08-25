from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import Enum
from flask_bcrypt import Bcrypt
from sqlalchemy.orm import validates
from datetime import datetime, timezone
import hashlib
import uuid

db = SQLAlchemy()
bcrypt = Bcrypt()

ROLE_ADMIN = "admin"
ROLE_TENANT = "tenant"
ROLE_LANDLORD = "landlord"
VALID_ROLES = {ROLE_ADMIN, ROLE_TENANT, ROLE_LANDLORD}

class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    public_id = db.Column(db.String(50), unique=True, nullable=False, default=lambda: str(uuid.uuid4()))
    username = db.Column(db.String(100), unique=True, nullable=False)
    email = db.Column(db.String(40), unique=True, nullable=False)
    password_hash = db.Column(db.String(120), nullable=False)
    role = db.Column(Enum(*VALID_ROLES, name="role_enum"), nullable=False)
    first_name = db.Column(db.String(40), nullable=False)
    last_name = db.Column(db.String(40), nullable=False)
    phone_number = db.Column(db.String(20), nullable=False)
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    def __repr__(self):
        return f"<User {self.username}>"

    def set_password(self, password):
        self.password_hash = bcrypt.generate_password_hash(password).decode('utf-8')

    def check_password(self, password):
        return bcrypt.check_password_hash(self.password_hash, password)

    @validates('role')
    def validate_role(self, key, value):
        if value not in VALID_ROLES:
            raise ValueError(f"Inavlide role: {value}. Must be one of {VALID_ROLES}")
        return value

    @validates('email')
    def validate_email(self, key, email):
        if '@' not in email or '.' not in email:
            raise ValueError("Invalid email format")
        return email.lower()

    @validates('phone_number')
    def validate_phone(self, key, phone):
        cleaned_phone = ''.join(filter(str.isdigit, phone))
        if len(cleaned_phone) < 10:
            raise ValueError("Phone number must be at least 10 digits")
        return phone

    def to_dict(self):
        return {
            "public_id": self.public_id,
            "first_name": self.first_name,
            "last_name": self.last_name,
            "username": self.username,
            "email": self.email,
            "phone_number": self.phone_number,
            "role": self.role,
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.aupdated_at else None
        }


    @staticmethod
    def validate_role_static(role):
        return role in VALID_ROLES
