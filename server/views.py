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
                dashboard_data.update({
                    "active_leases": 0, # To be implemented by Harriet
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

class DashboardStatsResource(Resource):
    @jwt_required()
    def get(self):
        """Get quick stats based on user role"""
        try:
            user_id = get_jwt_identity()
            user = User.query.filter_by(public_id=user_id).first()

            if not user:
                return {"message": "User not found"}, 404

            stats = {
                "user_role": user.role,
                "user_name": f"{user.first_name} {user.last_name}",
                "account_status": "active" if user.is_active else "inactive"
            }
            if user.role == "landlord":
                stats.update({
                    "properties": 0,
                    "tenants": 0,
                    "revenue": 0
                })
            elif user.role == "tenant":
                stats.update({
                    "active_leases": 0,
                    "payments_due": 0,
                    "maintenance_open": 0
                })
            elif user.role == "admin":
                stats.update({
                    "total_users": User.query.count(),
                    "system_health": "good"
                })
            return {"stats": stats}, 200
        except Exception as e:
            return {"message": "Error fetching stats", "error": str(e)}, 500


class UserProfileDashboardResource(Resource):
    @jwt_required()
    def get(self):
        """Get user profile information and dashboard display"""
        try:
            user_id = get_jwt_identity()
            user = User.query.filter_by(public_id=user_id).first()

            if not user:
                return {"message": "User not found"}, 404

            profile_data = {
                "user": user.to_dict(),
                "role_specific_info": {},
                "account_completion": self._calculate_profile_completion(user)
            }

            if user.role == "landlord":
                profile_data["role_specific_info"] = {
                    "can_add_properties": True,
                    "can_manage_tenants": True,
                    "can_send_broadcasts": True,
                    "dashboard_features": ["properties", "tenants", "payments", "maintenance"]
                }
            elif user.role == "tenant":
                profile_data["role_specific_info"] = {
                    "can_view_leases": True,
                    "can_make_payments": True,
                    "can_request_maintenance": True,
                    "dashboard_features": ["leases", "payments", "maintenance", "notifications"]
                }
            elif user.role == "admin":
                profile_data["role_specific_info"] = {
                    "can_manage_users": True,
                    "can_view_system_stats": True,
                    "can_access_logs": True,
                    "dashboard_features": ["users", "system", "analytics", "settings"]
                }
            return {
                "message": "Profile data retrieved successfully",
                "profile": profile_data
            }, 200
        except Exception as e:
            return {"message": "Error fetching profile data", "error": str(e)}, 500
    
    def _calculate_profile_completion(self, user):
        required_fields = ["username", "email", "first_name", "last_name", "phone_number", "national_id"]
        completed_fields = 0

        for field in required_fields:
            if getattr(user, field, None):
                completed_fields += 1

        return {
            "percentage": int((completed_fields / len(required_fields)) * 100),
            "completed_fields": completed_fields,
            "total_fields": len(required_fields)
        }



class LandlordDashboardResource(Resource):
    @roles_required('landlord')
    def get(self):
        """Enhanced landlord dashboard with comprehensive data"""
        try:
            user_id = get_jwt_identity()
            landlord = User.query.filter_by(public_id=user_id).first()

            if not landlord:
                return {"message": "Landlord not found"}, 404

            # Dashboard data structure for landlord
            dashboard_data = {
                "landlord_info": {
                    "name": f"{landlord.first_name} {landlord.last_name}",
                    "email": landlord.email,
                    "phone": landlord.phone_number,
                    "joined_date": landlord.created_at.isoformat() if landlord.created_at else None
                },
                "property_summary": {
                    "total_properties": 0,
                    "occupied_units": 0,
                    "vacant_units": 0,
                    "maintenance_requests": 0
                },
                "financial_summary": {
                    "monthly_revenue": 0,
                    "pending_payments": 0,
                    "total_collected": 0,
                    "overdue_payments": 0
                },
                "tenant_summary": {
                    "total_tenants": 0,
                    "new_tenants_this_month": 0,
                    "tenants_behind_rent": 0
                },
                "recent_activities": [],
                "notifications": {
                    "unread_count": 0,
                    "recent_messages": []
                },
                "dashboard_type": "landlord",
                "last_login": landlord.updated_at.isoformat() if landlord.updated_at else None
            }
            return {
                "message": "Landlord dashboard data retrieved successfully",
                "dashboard": dashboard_data
            } , 200
        except Exception as e:
            return {"message": "Error fetching landlord dashboard", "error": str(e)}, 500

class TenantDashboardResource(Resource):
    @roles_required('tenant')
    def get(self):
        """Enhanced tenant dashboard with comprehensive data"""
        try:
            user_id = get_jwt_identity()
            tenant = User.query.filter_by(public_id=user_id).first()

            if not tenant:
                return {"message": "Tenant not found"}, 404
            
            #Dashboard data structure for tenant
            dashboard_data = {
                "tenant_info": {
                    "name": f"{tenant.first_name} {tenant.last_name}",
                    "email": tenant.email,
                    "phone": tenant.phone_number,
                    "national_id": tenant.national_id,
                    "joined_date": tenant.created_at.isoformat() if tenant.created_at else None
                },
                "lease_summary": {
                    "active_leases": 0,
                    "lease_start_date": None,
                    "lease_end_date": None,
                    "current_rent": 0,
                    "property_address": None
                },
                "payment_summary": {
                    "next_payment_due": None,
                    "amount_due": 0,
                    "payment_status": "up_to_date", # To be calculated by Valentine
                    "last_payment_date": None,
                    "total_paid_this_year": 0
                },
                "maintenance_summary": {
                    "open_requests": 0,
                    "completed_requests": 0,
                    "recent_requests": []
                },
                "notifications": {
                    "unread_count": 0,
                    "recent_messages": []
                },
                "quick_actions": [
                    {"name": "Pay Rent", "endpoint": "/payments/pay", "available": True},
                    {"name": "Submit Repair Request", "endpoint": "/maintenance/request", "available": True},
                    {"name": "View Lease Details", "endpoint": "/leases/current" "available": True}
                ],
                "dashboard_type": "tenant",
                "last_login": tenant.updated_at.isoformat() if tenant.updated_at else None
            }
            return {
                "message": "Tenant dashboard data received successfully",
                "dashboard": dashboard_data
            }, 200
        except Exception as e:
            return {"message": "Error fetching tenant dashboard", "error": str(e)}, 500


class AdminDashboardResource(Resource):
    @roles_required('admin')
    def get(self):
        """Enhanced admin dashboard with system overview"""
        try:
            user_id = get_jwt_identity()
            admin = User.query.filter_by(public_id=user_id).first()

            if not admin:
                return {"message": "Admin not found"}, 404

            # Calculate user statistics
            total_users = User.query.count()
            active_users = User.query.filter_by(is_active=True).count()
            landlords_count = User.query.filter_by(role='landlord', is_active=True).count()
            tenants_count = User.query.filter_by(role='tenant', is_active=True).count()
            admins_count = User.query.filter_by(role='admin', is_active=True).count()
            inactive_users = User.query.filter_by(is_active=False).count()

            # Recent user registrations (last 30 days)
            from datetime import datetime, timedelta
            thirty_days_ago = datetime.utcnow() - timedelta(days=30)
            recent_registrations = User.query.filter(User.created_at >= thirty_days_ago).count()

            dashboard_data = {
                "admin_info": {
                    "name": f"{admin.first_name} {admin.last_name}",
                    "email": admin.email,
                    "last_login": admin.updated_at.isoformat() if admin.updated_at else None
                },
                "user_statistics": {
                    "total_users": total_users,
                    "active_users": active_users,
                    "inactive_users": inactive_users,
                    "landlords": landlords_count,
                    "tenants": tenants_count,
                    "admins": admins_count,
                    "recent_registrations": recent_registrations
                },
                "system_statistics": {
                    "total_properties": 0,
                    "active_leases": 0,
                    "total_payments": 0,
                    "open_maintenace_requests": 0
                },
                "recent_activities": [],
                "system_health": {
                    "database_status": "healthy",
                    "api_status": "running",
                    "last_backup": None # Tobe implemented later
                },
                "dashboard_type": "admin"
            }
            return {
                "message": "Admin dashboard data has been retrieved successfully",
                "dashboard": dashboard_data
            }, 200
        except Exception as e:
            return {"message": "Error fetching admin dasboard", "error": str(e)}, 500


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






api.add_resource(RegisterResource, "/auth/register")
api.add_resource(LoginResource, "/auth/login")
api.add_resource(LogoutResource, "/auth/logout")
api.add_resource(RefreshResource, "/auth/refresh")
api.add_resource(ProfileResource, "/auth/profile")
api.add_resource(DashboardResource, "/auth/dashboard")
api.add_resource(UsersResource, "/auth/users")
api.add_resource(HealthCheckResource, "/health")
api.add_resource(UserManagementResource, "/auth/users/<string:user_id>")
api.add_resource(LandlordDashboardResource, "/dashboard/landlord")
api.add_resource(TenantDashboardResource, "/dashboard/tenant") 
api.add_resource(AdminDashboardResource, "/dashboard/admin")
api.add_resource(DashboardStatsResource, "/dashboard/stats")
api.add_resource(UserProfileDashboardResource, "/dashboard/profile")
