from flask_restful import Resource, Api
from flask import request, jsonify, render_template, flash, redirect, url_for, make_response
from models import db, User
from flask_jwt_extended import create_access_token, create_refresh_token, JWTManager, get_jwt_identity, get_jwt, get_jti, jwt_required, verify_jwt_in_request
from app import app
from functools import wraps
import re

api = Api(app)
jwt = JWTManager(app)

jwt_blocklist = set()

# Email validation regex
EMAIL_REGEX = re.compile(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$')

# Function to check if token has been blocked
@jwt.token_in_blocklist_loader
def check_revoked(jwt_headers, jwt_payload):
    return jwt_payload.get("jti") in jwt_blocklist

# Function to manage Role Based Access (RBAC)
def roles_required(*allowed_roles):
    def decorator(fn):
        @wraps(fn)
        @jwt_required()
        def wrapper(*args, **kwargs):
            role = get_jwt().get("role")
            if role not in allowed_roles:
                return {
                    "message": "Huu nnani hana ruhusa?"
                }, 401
            return fn(*args, **kwargs)
        return wrapper
    return decorator


class RegisterResource(Resource):
    def post(self):
        data = request.get_json() or {}

        required_fields = ['username', 'first_name', 'last_name', 'email', 'phone_number','national_id', 'role', 'password']
        for field in required_fields:
            if field not in data or not str(data[field]).strip():
                return {"message": f"{field} is required"}, 400

        username = data.get("username", "").strip()
        first_name = data.get("first_name", "").strip()
        last_name = data.get("last_name", "").strip()
        email = data.get("email", "").lower().strip()
        phone_number = data.get("phone_number", "").strip()
        national_id = data.get("national_id", "").strip()
        role = data.get("role", None).lower().strip()
        password = data.get("password", "").strip()

        if not EMAIL_REGEX.match(email):
            return {"message": "Invalid email format"}, 400
        if len(password) < 6:
            return { "message": "Password is too short"}, 400
        if User.query.filter_by(email=email).first():
            return {"message": "Email already registered"}
        if User.query.filter_by(username=username).first():
            return {"message": "Username already taken"}, 400
        if User.query.filter_by(national_id=national_id).first():
            return {"message": "National ID already registered"}, 400

        try:
            new_user = User(
                username=username,
                first_name=first_name,
                last_name=last_name,
                email=email,
                phone_number=phone_number,
                national_id=national_id,
                role=role
            )
            new_user.set_password(password)

            db.session.add(new_user)
            db.session.commit()

            return {
                "message": "User registered successfully",
                "user": new_user.to_dict()
            }, 201

        except ValueError as e:
            return {"message": str(e)}, 400
        except Exception as e:
            db.session.rollback()
            return {"message": "Something went wrong", "error": str(e)}, 500

def LoginResource(Resource):
    def post(self):
        data = request.get_json() or {}

        if not data.get('email') or not data.get('password'):
            return {"message": "Email and password are required"}, 400

        email = data.get("email", "").lower().strip()
        password = data.get("password", "")
        user = User.query.filter_by(email=email).first()

        try:
            if not user or not user.check_password(password):
                return { "message": "Invalid credentials" }, 401
            if not user.is_active:
                return { "message": "User account is inactive" }, 403

            claims = { "role": user.role, "email": user.email, "isActive": user.is_active }
            access_token = create_access_token(identity=user.public_id, additional_claims=claims)
            refresh_token = create_refresh_token(identity=user.public_id, additional_claims=claims)

            response = {
                "message": "Success",
                "data": {
                    "access_token": access_token,
                    "refresh_token": refresh_token,
                    "email": user.email,
                    "role":user.role
                }
            }, 200
            return response

        except Exception as e:
            return {"message": "Something went wrong", "error": str(e)}, 500

class LogoutResource(Resource):
    @jwt_required()
    def post(self):
        try:
            jti = get_jwt().get("jti")
            jwt_blocklist.add(jti)
            return {"message": "Logout successful"}, 200
        except Exception as e:
            return {"message": "Something went wrong during logout", "error": str(e)}, 500


class RefreshResource(Resource):
    @jwt_required()
    def post(self):
        try:
            user_id = get_jwt_identity()
            user = User.query.filter_by(public_id=user_id).first()
            if not user or not user.is_active:
                return {"message": "User not found or inactive"}, 404
            
            claims = { "role": user.role, "email": user.email, "isActive": user.is_active }
            access_token = create_access_token(identity=user_id, additional_claims=claims)

            return {"access_token": access_token, "user": user.to_dict()}, 200
        except Exception as e:
            return {"message": "Something went wrong", "error": str(e)}, 500

class ProfileResource(Resource):
    @jwt_required()
    def get(self):
        try:
            user_id = get_jwt_identity()
            user = User.query.filter_by(public_id=user_id).first()

            if not user:
                return {"message": "User not found"}, 404
            return {"user": user.to_dict()}, 200
        except Exception as e:
            return {"message": "Something went wrong", "error": str(e)}, 500

    @jwt_required()
    def put(self):
        try:
            user_id = get_jwt_identity()
            user = User.query.filter_by(public_id=user_id).first()

            if not user:
                return {"message": "User not found"}, 404

            data = request.get_json() or {}

            updatable_fields = ['first_name', 'last_name', 'phone_number']
            updated_fields = []

            for field in updatable_fields:
                if field in data and data[field] is not None:
                    setattr(user, field, str(data[field]).strip())
                    updated_fields.append(field)
            if updated_fields:
                db.session.commit()
                return {
                    "message": f"Profile updated successfully. Updated fields: {', '.join(updated_fields)}",
                    "user": user.to_dict()
                }, 200
            else:
                return {"message": "No valid fields provided for update"}, 400

        except ValueError as ve:
            db.session.rollback()
            return {"message": str(ve)}, 400
        except Exception as e:
            db.session.rollback()
            return {"message": "Something went wrong", "error": str(e)}, 500

class DashboardResource(Resource):
    @jwt_required()
    """Get dashboard data based on user role"""
    def get(self):
        try:
            user_id = get_jwt_identity()
            user = User.query.filter_by(public_id=user_id).first()

            if not user:
                return {"message": "User not found"}, 404
            
            dashboard_data = {
                "User": user.to_dict(),
                "role": user.role,
                "dashboard_type": f"{user.role} dashboard"
            }

            if user.role == "landlord":
                dashboard_data.update({
                    "properties_count": 0, # To be implemented by Ian
                    "tenants_count": 0, # To be populated later
                    "recent_notifications": [] # Extended features
                })
            elif user.role == "tenant":
                dashboard_data.update({
                    "active_leases": 0, # To be implemented by Harriet
                    "pending_payments": 0, # Tobe implemented by Valentine
                    "recent_notifications": []
                })
            elif user.role == "admin":
                dasboard_data.update({
                    "total_users": User.query.count(),
                    "landlords_count": User.query.filter_by(role='landlord').count()
                    "tenants_count": User.query.filter_by(role='tenant').count()
                })
            return {"dashboard": dashboard_data}, 200

        except Exception as e:
            return {"message": "Something went wrong", "error": str(e)}, 500


class UsersResource(Resource):
    @roles_required('admin')
    def get(self):
        



api.add_resource(RegisterResource, "/auth/register")
api.add_resource(LoginResource, "/auth/login")
api.add_resource(LogoutResource, "/auth/logout")