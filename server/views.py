from flask_restful import Resource, Api
from flask import request, jsonify, render_template, flash, redirect, url_for, make_response
from models import db, User,Lease
from flask_jwt_extended import create_access_token, create_refresh_token, JWTManager, get_jwt_identity, get_jwt, get_jti, jwt_required, verify_jwt_in_request
from app import app
from functools import wraps
import re
from datetime import datetime

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
                    "message": "Huu nani hana ruhusa?"
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
        national_id = int(str(data.get("national_id", "")).strip())
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

class LoginResource(Resource):
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
    @jwt_required(refresh=True)
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
    def get(self):
        """Get dashboard data based on user role"""
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
                active_leases = Lease.query.filter_by(tenant_id = user.id,status ="active").count()

                dashboard_data.update({
                    "active_leases": active_leases,
                    "pending_payments": 0, # Tobe implemented by Valentine
                    "recent_notifications": []
                })
            elif user.role == "admin":
                dashboard_data.update({
                    "total_users": User.query.count(),
                    "landlords_count": User.query.filter_by(role='landlord').count(),
                    "tenants_count": User.query.filter_by(role='tenant').count()
                })
            return {"dashboard": dashboard_data}, 200

        except Exception as e:
            return {"message": "Something went wrong", "error": str(e)}, 500


class UsersResource(Resource):
    @roles_required('admin')
    def get(self):
        try:
            users = User.query.all()
            users_list = [user.to_dict() for user in users]

            return {
                "users": users_list,
                "count": len(users_list)
            }, 200
        except Exception as e:
                return {"message": "Something went wrong", "error": str(e)}, 500


class UserManagementResource(Resource):
    @roles_required('admin')
    def patch(self, user_id):
        try:
            user = User.query.filter_by(public_id=user_id).first()
            if not user:
                return {"message": "User not found"}, 404
            
            data = request.get_json() or {}
            if "is_active" in data:
                user.is_active = bool(data["is_active"])
                db.session.commit()

                status = "activated" if user.is_active else "deactivated"
                return {
                    "message": f"User {status} successfully", 
                    "user": user.to_dict()
                }, 200
            return {"message": "No valid action provided"}, 400
        except Exception as e:
            db.session.rollback()
            return {"message": "Something went wrong", "error": str(e)}, 500


class HealthCheckResource(Resource):
    def get(self):
        """API health check"""
        return {
            "status": "healthy",
            "message": "Property Management API is running",
            "api_version": "1.0.0"
        }, 200
    
def tenant_required(fn):
    @wraps(fn)
    @jwt_required()
    def wrapper(*args, **kwargs):
        if get_jwt().get("role") != "tenant":
            return {"message" : "Only tenants can perform this action"}, 403
        return fn(*args, **kwargs)
    return wrapper

def landlord_or_admin_required(fn):
    @wraps(fn)
    @jwt_required()
    def wrapper(*args, **kwargs):
        if get_jwt().get("role") not in ["landlord", "admin"]:
            return {"message" : "Only landlords or admins can perform this action"}, 403
        return fn(*args, **kwargs)
    return wrapper

class LeaseListResource(Resource):
    @jwt_required()
    def get(self):
        user_id = get_jwt_identity()
        role = get_jwt().get("role")

        user = User.query.filter_by(public_id=user_id).first()
        if role == "tenant":
            leases = Lease.query.filter_by(tenant_id = user.id).all()
        else:
            leases = Lease.query.all()

        return {"leases": [lease.to_dict() for lease in leases]}, 200
    
    @tenant_required
    def post(self):
        data = request.get_json() or {}
        required_fields = ["property_id", "start_date", "end_date", "rent_amount"]
        for field in required_fields:
            if field not in data:
                return {"message": f"{field} is required"}, 400

        try:
            start_date = datetime.fromisoformat(data["start_date"]).date()
            end_date = datetime.fromisoformat(data["end_date"]).date()
            user = User.query.filter_by(public_id=get_jwt_identity()).first()
            lease = Lease(
                tenant_id = user.id,
                property_id = data["property_id"],
                start_date = start_date,
                end_date = end_date,
                rent_amount = float(data["rent_amount"]),
            )
            db.session.add(lease)
            db.session.commit()
            return {"message": "Lease created", "lease": lease.to_dict()}, 201
        except ValueError as ve:
            return {"message":str(ve)}, 400
        except Exception as e:
            db.session.rollback()
            return {"message": "Failed to create lease", "error": str(e)}, 500
        
class LeaseResource(Resource):
    @jwt_required()
    def get(self, lease_id):
        lease = Lease.query.get(lease_id)
        if not lease:
            return {"message": "Lease not found"}, 404
        
        role = get_jwt().get("role")
        user = User.query.filter_by(public_id=get_jwt_identity()).first()
        if role == "tenant" and lease.tenant_id != user.id:
            return {"message": "Unauthorized"}, 403

        
        return {"lease": lease.to_dict()}, 200
    @landlord_or_admin_required
    def patch(self, lease_id):
        lease = Lease.query.get(lease_id)
        if not lease:
            return{"message": "Lease not found"}, 404
        
        data = request.get_json() or {}
        updated_fields = []

        if "status" in data and data ["status"] in ["active","terminated", "expired", "pending"]:
            lease.status = data["status"]
            updated_fields.append("status")

        if "rent_amount" in data:
            try:
                rent = float(data["rent_amount"])
                if rent <= 0:
                    return {"message": "Rent amount must be greater than 0"}, 400
                lease.rent_amount = rent
                updated_fields.append("rent_amount")
            except ValueError:
                return {"message": "Invalid rent amount"}, 400
            
        if "end_date" in data:
            try:
                lease.end_date = datetime.fromisoformat(data["end_date"]).date()
                updated_fields.append("end_date")
            except ValueError:
                return {"message": "Invalid date format. Use YYYY-MM-DD"}, 400


        if updated_fields:
            try:
                db.session.commit()
                return{"message":f"Lease updated ({', '.join(updated_fields)})", "lease":lease.to_dict()}, 200
            except Exception as e:
                db.session.rollback()
                return {"message": "Failed to update lease", "error": str(e)}, 500
        else:
            return {"message": "No valid fields to update"}, 400
        
    @landlord_or_admin_required
    def delete(self, lease_id):
        lease = Lease.query.get(lease_id)
        if not lease:
            return {"message": "Lease not found"}, 404

        try:
            db.session.delete(lease)
            db.session.commit()
            return {"message": "Lease deleted successfully"}, 200
        except Exception as e:
            db.session.rollback()
            return {"message": "Failed to delete lease", "error": str(e)}, 500
        






api.add_resource(RegisterResource, "/auth/register")
api.add_resource(LoginResource, "/auth/login")
api.add_resource(LogoutResource, "/auth/logout")
api.add_resource(RefreshResource, "/auth/refresh")
api.add_resource(ProfileResource, "/auth/profile")
api.add_resource(DashboardResource, "/auth/dashboard")
api.add_resource(UsersResource, "/auth/users")
api.add_resource(HealthCheckResource, "/health")
api.add_resource(UserManagementResource, "/auth/users/<string:user_id>")
api.add_resource(LeaseListResource, "/leases")
api.add_resource(LeaseResource, "/leases/<int:lease_id>")