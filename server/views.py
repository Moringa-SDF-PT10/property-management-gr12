from flask_restful import Resource, Api, reqparse
from flask import request, jsonify, render_template, flash, redirect, url_for, make_response
from models import db, User, Lease, Bill, Notification, Payment, RepairRequest, Property
from flask_jwt_extended import create_access_token, create_refresh_token, JWTManager, get_jwt_identity, get_jwt, get_jti, jwt_required, verify_jwt_in_request
import base64
from functools import wraps
import re
import requests, os
from datetime import datetime
from dateutil.relativedelta import relativedelta
from utils import send_email, send_sms


api = Api()
jwt = JWTManager()

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
                    "tenants_count": 0, # To be populated later. Harriet to check on this
                    "recent_notifications": []
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
    @jwt_required() # Add jwt_required if not already handled by roles_required
    def get(self):
        """Enhanced landlord dashboard with comprehensive data"""
        try:
            user_id = get_jwt_identity()
            landlord = User.query.filter_by(public_id=user_id).first()

            if not landlord:
                return {"message": "Landlord not found"}, 404

            # --- Fetch comprehensive data ---
            properties = Property.query.filter_by(landlord_id=landlord.id).all()
            total_properties = len(properties)
            occupied_units = 0
            vacant_units = 0

            # Initialize tenant and lease data
            total_leases = 0
            up_to_date_tenants_list = []
            behind_tenants_list = []
            overdue_payments_count = 0
            monthly_revenue_sum = 0
            total_collected_sum = 0
            pending_payments_sum = 0

            for prop in properties:
                # Assuming a property can have units, and units have leases
                # You'll need to adjust this based on your actual Property/Unit/Lease model structure
                # For simplicity, let's assume Property directly links to Leases
                property_leases = Lease.query.filter_by(property_id=prop.id, status='active').all()
                for lease in property_leases:
                    total_leases += 1
                    # Check payment status (simplified logic, adjust as per your payment tracking)
                    # This is a placeholder logic: you'd need to query Payment records for this lease
                    # and compare against expected rent due dates.
                    payments_for_lease = Payment.query.filter_by(lease_id=lease.id).all()

                    # Example: Check if last payment was within this month and covered rent
                    # This part needs *your* actual payment logic to determine "up to date" or "behind"
                    is_up_to_date = True # Placeholder
                    if is_up_to_date:
                        up_to_date_tenants_list.append(lease.tenant.to_dict()) # Assuming Lease has a 'tenant' relationship
                    else:
                        behind_tenants_list.append(lease.tenant.to_dict())
                        overdue_payments_count += 1

                    # Calculate financial summaries
                    # Again, this needs your actual payment/bill logic
                    # For example: sum up `Payment.amount` for the current month vs `Bill.amount`
                    monthly_revenue_sum += lease.monthly_rent # Simplistic, assumes all rent is collected
                    total_collected_sum += sum(p.amount for p in payments_for_lease if p.status == 'completed')
                    pending_payments_sum += sum(b.amount for b in Bill.query.filter_by(lease_id=lease.id, status='pending').all())


                # Occupancy logic (adjust based on your Unit model if you have one)
                # For simplicity, assuming if a property has any active leases, it's occupied
                if property_leases:
                    occupied_units += 1
                else:
                    vacant_units += 1


            # Maintenance requests (assuming 'property_id' or 'landlord_id' on RepairRequest)
            maintenance_requests = RepairRequest.query.join(Property).filter(
                Property.landlord_id == landlord.id,
                RepairRequest.status.in_(['pending', 'in_progress']) # Count active requests
            ).count()


            # Collection Rate calculation (adjust as needed)
            expected_monthly_revenue = sum(p.monthly_rent for p in properties) # Simplified
            collection_rate = (total_collected_sum / expected_monthly_revenue * 100) if expected_monthly_revenue > 0 else 0

            # Notification counts
            unread_notifications = Notification.query.filter_by(recipient_id=landlord.id, is_read=False).count()
            recent_notifications = [n.to_dict() for n in Notification.query.filter_by(recipient_id=landlord.id).order_by(Notification.created_at.desc()).limit(5).all()]
            recent_broadcasts = [n.to_dict() for n in Notification.query.filter_by(sender_id=landlord.id, is_broadcast=True).order_by(Notification.created_at.desc()).limit(5).all()]


            dashboard_data = {
                "landlord_info": {
                    "name": f"{landlord.first_name} {landlord.last_name}",
                    "email": landlord.email,
                    "phone": landlord.phone_number,
                    "joined_date": landlord.created_at.isoformat() if landlord.created_at else None
                },
                "property_summary": {
                    "total_properties": total_properties,
                    "occupied_units": occupied_units,
                    "vacant_units": vacant_units,
                    "maintenance_requests": maintenance_requests
                },
                "financial_summary": {
                    "monthly_revenue": monthly_revenue_sum,
                    "pending_payments": pending_payments_sum,
                    "total_collected": total_collected_sum,
                    "overdue_payments": overdue_payments_count # Use the count from lease checks
                },
                "tenant_summary": {
                    "total_tenants": total_leases, # Assuming one tenant per lease for simplicity
                    "new_tenants_this_month": 0, # Implement logic to count new leases
                    "tenants_behind_rent": len(behind_tenants_list)
                },
                "recent_activities": [], # Populate with actual recent activities (e.g., new leases, payments, repair updates)
                "notifications": {
                    "unread_count": unread_notifications,
                    "recent_messages": recent_notifications # You might want a unified list here
                },
                "dashboard_type": "landlord",
                "last_login": landlord.updated_at.isoformat() if landlord.updated_at else None,

                # --- New summary structure for frontend ---
                "summary": {
                    "total_leases": total_leases,
                    "up_to_date_count": len(up_to_date_tenants_list),
                    "behind_count": len(behind_tenants_list),
                    "collection_rate": round(collection_rate, 2)
                },
                "up_to_date_tenants": up_to_date_tenants_list,
                "behind_tenants": behind_tenants_list
            }
            return {
                "message": "Landlord dashboard data retrieved successfully",
                "dashboard": dashboard_data
            } , 200
        except Exception as e:
            # Log the error for better debugging
            print(f"Error in LandlordDashboardResource: {e}")
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

            # Notification counts
            unread_notifications = Notification.query.filter(
                ((Notification.recipient_id == tenant.id) | (Notification.is_broadcast == True)) & (Notification.is_read == False)
            ).count()
            recent_notifications  = Notification.query.filter(
                (Notification.recipient_id == tenant.id) | (Notification.is_broadcast == True)
            ).order_by(Notification.created_at.desc()).limit(5).all()

            #Active lease information
            active_lease = Lease.query.filter_by(tenant_id=tenant.id, status="active").first()


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
                    {"name": "View Lease Details", "endpoint": "/leases/current", "available": True}
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

            # Notification statistics
            total_notifications = Notification.query.count()
            broadcast_notifications = Notification.query.filter_by(is_broadcast=True).count()
            unread_notifications = Notification.query.filter_by(is_read=False).count()
            recent_system_notifications = Notification.query.filter_by(recipient_id=admin.id).order_by(Notification.created_at.desc()).limit(5).all()


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
            db.session.flush()

            new_bill = Bill(
                lease_id=lease.id,
                amount=lease.rent_amount,
                due_date=start_date + relativedelta(months=1),
                status="unpaid"
            )
            db.session.add(new_bill)
            db.session.commit()
            return {"message": "Lease created with initial bill",
                    "lease": lease.to_dict(),
                    "bill": new_bill.to_dict()
                    }, 201
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

class BillListResource(Resource):
    @jwt_required()
    def get(self):
        """Get all bills for the logged-in tenant via their leases"""
        role = get_jwt().get("role")
        user = User.query.filter_by(public_id=get_jwt_identity()).first()

        if role == "tenant":
            leases = Lease.query.filter_by(tenant_id=user.id).all()
            lease_ids = [lease.id for lease in leases]
            bills = Bill.query.filter(Bill.lease_id.in_(lease_ids)).all()
        else:  # landlord or admin
            bills = Bill.query.all()

        return {"bills":[bill.to_dict() for bill in bills]},200

    @landlord_or_admin_required
    def post(self):
        """Create a new bill (by landlord/admin)"""
        data = request.get_json() or {}
        if not all(k in data for k in ["lease_id", "amount", "due_date"]):
            return {"message": "lease_id, amount, and due_date are required"}, 400

        try:
            lease = Lease.query.get(data["lease_id"])
            if not lease:
                return {"message": "Lease not found"}, 404

            # Default due_date = one month after lease.start_date
            due_date = (lease.start_date + relativedelta(months=1))

            # If API request passes a due_date, use that instead
            if "due_date" in data:
                due_date = datetime.strptime(data["due_date"], "%Y-%m-%d").date()

            new_bill = Bill(
                lease_id=int(data["lease_id"]),
                amount=float(data["amount"]),
                due_date= due_date,
                status=data.get("status", "unpaid")
            )
            db.session.add(new_bill)
            db.session.commit()
            return new_bill.to_dict(), 201

        except ValueError as ve:
            return {"message": str(ve)}, 400

        except Exception as e:
            db.session.rollback()
            return {"error": str(e)}, 500


class BillResource(Resource):
    @jwt_required()
    def get(self, bill_id):
        """Get a single bill by ID"""
        bill = Bill.query.get_or_404(bill_id)
        role = get_jwt().get("role")
        user = User.query.filter_by(public_id=get_jwt_identity()).first()

        if role == "tenant" and bill.lease.tenant_id != user.id:
            return {"message": "Unauthorized"}, 403

        return bill.to_dict()

    @jwt_required()
    def patch(self, bill_id):
        data = request.get_json() or {}
        bill = Bill.query.get_or_404(bill_id)
        role = get_jwt().get("role")
        user = User.query.filter_by(public_id=get_jwt_identity()).first()

        # Tenant can only mark their own bill as paid
        if role == "tenant":
            if bill.lease.tenant_id != user.id:
                return {"message": "Unauthorized"}, 403
            if "status" in request.json and request.json["status"] == "paid":
                bill.status = "paid"
                db.session.commit()
                return bill.to_dict(), 200
            else:
                return {"message": "Tenants can only mark bills as paid"}, 403

            # Landlord/admin can update everything
        else:
            if "status" in data and data["status"] in ["paid", "unpaid"]:
                bill.status = data["status"]
            if "amount" in data:
                try:
                    bill.amount = float(data["amount"])
                except ValueError:
                    return {"message": "Invalid amount"}, 400
            if "due_date" in data:
                try:
                    bill.due_date = datetime.strptime(data["due_date"], "%Y-%m-%d").date()
                except ValueError:
                    return {"message": "Invalid date format. Use YYYY-MM-DD"}, 400

        db.session.commit()
        return bill.to_dict(), 200

    @landlord_or_admin_required
    def delete(self, bill_id):
        """Delete a bill"""
        bill = Bill.query.get_or_404(bill_id)
        db.session.delete(bill)
        db.session.commit()
        return {"message": "Bill deleted successfully"}, 200

class LeaseVacateResource(Resource):
    @jwt_required()
    def put(self, lease_id):
        """
        Tenant submits a vacate notice for their lease.
        """
        current_user_id = get_jwt_identity()
        data = request.get_json()

        vacate_date = data.get("vacate_date")

        if not vacate_date:
            return {"error": "Vacate date is required"}, 400

        # find lease
        lease = Lease.query.get(lease_id)
        if not lease:
            return {"error": "Lease not found"}, 404

        # ensure tenant owns this lease
        user = User.query.filter_by(public_id=current_user_id).first()
        if not user or lease.tenant_id != user.id:
            return {"error": "Unauthorized"}, 403

        # update lease
        try:
            lease.vacate_date = datetime.strptime(vacate_date, "%Y-%m-%d").date()
            lease.vacate_status = "pending"   # pending until landlord/admin approves
            db.session.commit()

            return {
                "message": "Vacate notice submitted successfully",
                "lease_id": lease.id,
                "vacate_date": lease.vacate_date.strftime("%Y-%m-%d"),
                "vacate_status": lease.vacate_status
            }, 200
        except Exception as e:
            db.session.rollback()
            return {"error": str(e)}, 500

class LeaseVacateApprovalResource(Resource):
    @landlord_or_admin_required
    def put(self, lease_id):
        current_user_id = get_jwt_identity()
        user = User.query.get(public_id=current_user_id).first()

        if user.role not in ["landlord", "admin"]:
            return {"error": "Unauthorized"}, 403

        data = request.get_json()
        action = data.get("action")

        lease = Lease.query.get(lease_id)
        if not lease:
            return {"error": "Lease not found"}, 404

        if lease.vacate_status != "pending":
            return {"error": "No pending vacate request"}, 400

        try:
            if action == "approve":
                lease.vacate_status = "approved"
                lease.end_date = lease.vacate_date
            elif action == "reject":
                lease.vacate_status = "rejected"
                lease.vacate_date = None
            else:
                return {"error": "Invalid action"}, 400

            db.session.commit()

            return {
                "message": f"Vacate request {lease.vacate_status}",
                "lease_id": lease.id,
                "vacate_status": lease.vacate_status
            }, 200
        except Exception as e:
            db.session.rollback()
            return {"error": str(e)}, 500

class NotificationListResource(Resource):
    @jwt_required()
    def get(self):
        """Get notifications for the current user"""
        try:
            user_id = get_jwt_identity()
            user = User.query.filter_by(public_id=user_id).first()

            if not user:
                return {"message": "User not found"}, 404

            notifications = Notification.query.filter((Notification.recipient_id == user.id) | (Notification.is_broadcast == True)).order_by(Notification.created_at.desc()).all()

            notification_type = request.args.get('type')
            unread_only = request.args.get('unread_only') == "true"

            if notification_type:
                notifications = [n for n in notifications if n.notification_type == notification_type]
            if unread_only:
                notifications = [n for n in notifications if not n.is_read]

            return {
                "notifications": [notification.to_dict() for notification in notifications],
                "unread_count": len([n for n in notifications if not n.is_read])
            }, 200
        except Exception as e:
            return {"message": "Error fetching notifications", "error": str(e)}, 500

    @roles_required('landlord', 'admin')
    def post(self):
        """Send message to tenants"""
        try:
            user_id = get_jwt_identity()
            sender = User.query.filter_by(public_id=user_id).first()

            if not sender:
                return {"message": "Sender not found"}, 404

            data = request.get_json() or {}

            required_fields = ["title", "message"]
            for field in required_fields:
                if field not in data or not str(data[field]).strip():
                    return {"message": f"{field} is required"}, 400

            title = data.get("title").strip()
            message = data.get("message").strip()
            notification_type = data.get("notification_type", "general")
            recipient_id = data.get("recipient_id")
            is_broadcast = data.get("is_broadcast", False)


            if is_broadcast:
                tenants = User.query.filter_by(role="tenant", is_active=True).all()

                if not tenants:
                    return {"message": "No active tenants found"}, 404

                notifications_created = []
                for tenant in tenants:
                    notification = Notification(
                        sender_id=sender.id,
                        recipient_id=tenant.id,
                        title=title,
                        message=message,
                        notification_type=notification_type,
                        is_broadcast=True
                    )
                    db.session.add(notification)
                    notifications_created.append({
                        "recipient": f"{tenant.first_name} {tenant.last_name}",
                        "recipient_email": tenant.email
                    })
                db.session.commit()
                return {
                    "message": f"Broadcast notification sent to {len(tenants)} tenant(s)",
                    "recipients": notifications_created,
                    "notification_details": {
                        "title": title,
                        "message": message,
                        "type": notification_type
                    }
                }, 201
            else:
                if not recipient_id:
                    return {"message": "recipient_id is required for non-broadcast messages"}, 400

                recipient = User.query.filter_by(public_id=recipient_id, role="tenant", is_active=True).first()
                if not recipient:
                    return {"message": "Recipient tenant not found"}, 404

                notification = Notification(
                    sender_id=sender.id,
                    recipient_id=recipient.id,
                    title=title,
                    message=message,
                    notification_type=notification_type,
                    is_broadcast=False
                )
                db.session.add(notification)
                db.session.commit()

                return {
                    "message": "Notification sent successfully",
                    "notification": notification.to_dict()
                }, 201
        except ValueError as ve:
            return {"message": str(ve)}, 400
        except Exception as e:
            db.session.rollback()
            return {"message": "Error creating notification", "error": str(e)}, 500

class NotificationResource(Resource):
    @jwt_required()
    def get(self, notification_id):
        """Get a specific notification"""
        try:
            user_id = get_jwt_identity()
            user = User.query.filter_by(public_id=user_id).first()

            if not user:
                return {"message": "User not found"}, 404

            notification = Notification.query.get(notification_id)
            if not notification:
                return {"message": "Notification not found"}, 404

            # Check if user can access this notification
            if (notification.recipient_id != user.id and not notification.is_broadcast and notification.sender_id != user.id):
                return {"message": "Unauthorized"}, 403
            return {"notification": notification.to_dict()}, 200
        except Exception as e:
            return {"message": "Error fetching notification", "error": str(e)}, 500

    @jwt_required()
    def patch(self, notification_id):
        try:
            user_id = get_jwt_identity()
            user = User.query.filter_by(public_id=user_id).first()

            if not user:
                return{"message": "User not found"}, 404

            notification = Notification.query.get(notification_id)
            if not notification:
                return {"message": "Notification not found"}, 404

            if notification.recipient_id != user.id and not notification.is_broadcast:
                return {"message": "Unauthorized"}, 403

            data = request.get_json() or {}
            if "is_read" in data:
                is_read = bool(data["is_read"])
                if is_read:
                    notification.mark_as_read()
                else:
                    notification.is_read = False
                    notification.read_at = None
                db.session.commit()

                return {
                    "message": f"Notification marked as {'read' if is_read else 'unread'}",
                    "notification": notification.to_dict()
                }, 200
            return {"message": "No valid update provided"}, 400
        except Exception as e:
            db.session.rollback()
            return {"message": "Error updating notification", "error": str(e)}, 500

    @roles_required('landlord', 'admin')
    def delete(self, notification_id):
        try:
            user_id = get_jwt_identity()
            user = User.query.filter_by(publi_id=user_id).first()

            notification = Notification.query.get(notification_id)
            if not notification:
                return {"message": "Notification not found"}, 404

            if notification.sender_id != user.id:
                return {"message": "Unauthorized - only sender can delete"}, 403
            db.session.delete()
            db.session.commit()
            return {"message": "Notification deleted successfully"}, 200
        except Exception as e:
            db.session.rollback()
            return {"message": "Error deleting notification", "error": str(e)}, 500

class BroadcastNotificationResource(Resource):
    @roles_required()
    def post(self):
        try:
            user_id = get_jwt_identity()
            sender = User.query.filter_by(public_id=user_id).first()

            if not sender:
                return {"message": "Sender not found"}, 404

            data = request.get_json() or {}

            required_fields = ["title", "message"]
            for field in required_fields:
                if field not in data or not str(data[field]).strip():
                    return {"message": f"{field} is required"}, 400

            title = data.get('title').strip()
            message = data.get('message').strip()
            notification_type = data.get('notification_type', 'general')

            tenants = User.query.filter_by(role='tenant', is_active=True).all()
            if not tenants:
                return {"message": "No active tenants found to send broadcast"}, 404

            notifications_sent = []
            for tenant in tenants:
                notification = Notification(
                    sender_id=sender.id,
                    recipient_id=tenant.id,
                    title=title,
                    message=message,
                    notification_type=notification_type,
                    is_broadcast=True
                )
                db.session.add(notification)
                notifications_sent.append(f"{tenant.first_name} {tenant.last_name}")
            db.session.commit()
            return {
                "message": f"Broadcast sent successfully to {len(tenants)} tenant(s)",
                "broadcast_details": {
                    "title": title,
                    "message": message,
                    "type": notification_type,
                    "sender": f"{sender.first_name} {sender.last_name}",
                    "recipients_count": len(tenants),
                    "recipients": notifications_sent
                }
            }, 201
        except ValueError as ve:
            return {"message": str(ve)}, 400
        except Exception as e:
            db.session.rollback()
            return {"message": "Error sending broadcast", "error": str(e)}, 500

class TenantListResource(Resource):
    @roles_required('landlord', 'admin')
    def get(self):
        try:
            tenants = User.query.filter_by(role='tenants', is_active=True).all()
            tenant_list = []
            for tenant in tenants:
                active_lease = Lease.query.filter_by(tenant_id=tenant.id, status="active").first()
                tenant_info = {
                    "public_id": tenant.public_id,
                    "email": tenant.email,
                    "phone": tenant.phone_number,
                    "has_active_lease": bool(active_lease),
                    "lease_info": None
                }
                if active_lease:
                    tenant_info["lease_info"] = {
                        "lease_id": active_lease.id,
                        "rent_amount": active_lease.rent_amount,
                        "start_date": active_lease.start_date.isoformat(),
                        "end_date": active_lease.end_date.isoformat() if active_lease.end_date else None
                    }
                tenant_list.append(tenant_info)
            return {
                "tenants": tenant_list,
                "total_count": len(tenant_list)
            }, 200
        except Exception as e:
            return {"message": "Error fetching tenant list", "error": str(e)}, 500





def get_access_token():
    consumer_key = os.getenv('MPESA_CONSUMER_KEY')
    consumer_secret = os.getenv("MPESA_CONSUMER_SECRET")
    if not consumer_key or not consumer_secret:
        return None

    auth_url = "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials"

    try:
        res = requests.get(auth_url, auth=(consumer_key, consumer_secret))
        if res.status_code == 200:
            return res.json()["access_token"]
    except Exception:
        pass
    return None

class PaymentInitResource(Resource):
    @jwt_required()
    def post(self):
        parser = reqparse.RequestParser()
        parser.add_argument('lease_id', type=int, required=True)
        parser.add_argument('amount', type=float, required=True)
        parser.add_argument('phone_number', type=str, required=True)
        args = parser.parse_args()

        # Check Lease ownership
        lease = Lease.query.get(args['lease_id'])
        if not lease:
            return {'error': 'Lease not found'},404

        # Check if user is tenant of the lease or admin/landlord
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        if current_user.role == 'tenant' and lease.tenant_id != current_user_id:
            return {"error": "Unauthorized access to lease"}



       # Generete Safaricom password
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        raw_password = f"{os.getenv('MPESA_SHORTCODE')}{os.getenv('MPESA_PASSKEY')}{timestamp}"
        password = base64.b64encode(raw_password.encode()).decode("utf-8")

        if not args.get('phone_number'):
            return {"error": "Phone number required for M-Pesa"}


        # Prepare STK push
        payload = {
            "BusinessShortCode": os.getenv("MPESA_SHORTCODE"),
            "Password": password,
            "Timestamp": timestamp,
            "TransactionType": "CustomerPaybillOnline",
            "Amount": int(args["amount"]),
            "PartyA": args["phone_number"], # tenant phone
            "PartyB": os.getenv("MPESA_SHORTCODE"),
            "PhoneNumber": args["phone_number"],
            "CallBackUrl": f"{os.getenv('MPESA_CALLBACK_URL')}/payments/mpesa/callback",
            "AccountReference": f"Lease-{lease.id}",
            "TransactionDesc": f"Rent Payment for lease {lease.id}"
        }

        headers = {
            "Authorization": f"Bearer {os.getenv('MPESA_ACCESS_TOKEN')}",
            "Content-Type": "application/json",
        }
        res = requests.post(
            "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest",
            json=payload,
            headers=headers,
        )
        res_json = res.json()

        if res.status_code != 200 or "CheckoutRequestID" not in res_json:
            return {"error": "Failed to initiate payment", "details": res_json}, 400

        # Create payment record
        payment = Payment(
            lease_id = lease.id,
            amount = args["amount"],
            status = 'pending',
            transaction_id = res_json["CheckoutRequestID"]
        )
        db.session.add(payment)
        db.session.commit()


        return {
            "message": "Payment initiated. Check your phone for prompt",
            "payment_id": payment.id
        }, 201

class MpesaCallbackResource(Resource): # called after user approves payment
    def post(self):
        body = request.json
        try:
            if not body:
                return {"error": "Invalid callback"}, 400

            result = body.get("Body", {}).get("stkCallback", {})
            checkout_id = result.get("CheckoutRequestID")
            result_code = result.get("ResultCode")

            payment = Payment.query.filter_by(transaction_id=checkout_id).first()
            if not payment:
                return {"error": "Payment not found"}, 404

            if result_code == 0:  # Success
                payment.status = "completed"
            else:  # Failed or cancelled
                payment.status = "failed"

            db.session.commit()
            return {"message": "Callback processed"}, 200

        except Exception as e:
            return {"error": f"Callback processing failed: {str(e)}"}, 500

    def send_payment_notifications(self, payment): # Send notifications after successful payment
        lease = payment.lease
        tenant = lease.tenant

        # Create notification record
        notification = Notification(
            sender_id=tenant.id,
            notification_type='payment_received',
            title=f'Payment Received - {payment.payment_type.title()}',
            body=f'Payment of ${payment.amount} for {payment.payment_type} has been received for lease #{lease.id}.',
            audience='landlord',
            metadata={
                'payment_id': payment.id,
                'lease_id': lease.id,
                'amount': payment.amount
            }
        )
        db.session.add(notification)
        db.session.commit()

class PaymentStatusResource(Resource):
    @jwt_required()
    def get(self, payment_id):
        current_user_id = get_jwt_identity
        payment = Payment.query.get(payment_id)
        if not payment:
            return {"error": "Payment not found"}, 404

        # Check access permissions
        current_user = User.query.get(current_user_id)
        if current_user.role == 'tenant' and payment.lease.tenant_id != current_user_id:
            return {"error": "Unauthorized"}, 403

        return {
            "id": payment.id,
            "lease_id": payment.lease_id,
            "amount": payment.amount,
            "status": payment.status,
            "transaction_id": payment.transaction_id,
        }, 200

class PaymentHistoryResource(Resource): # Get payment history for a lease
    @jwt_required()
    def get(self, lease_id):
        current_user_id = get_jwt_identity()
        lease = Lease.query.get(lease_id)

        if not lease:
            return {"error": "Lease not found"}, 404

        # Check access permissions
        current_user = User.query.get(current_user_id)
        if (current_user.role == 'tenant' and lease.tenant_id != current_user_id):
            return {"error": "Unauthorized"}, 403

        payments = Payment.query.filter_by(lease_id=lease_id).order_by(Payment.created_at.desc()).all()
        return {
            'lease_id': lease_id,
            'payments': [payment.to_dict() for payment in payments],
            'total_paid': sum(p.amount for p in payments if p.status == 'completed'),
            'rent_status': {
                'is_up_to_date': lease.is_rent_up_to_date(),
                'days_behind': lease.days_behind_rent(),
                'outstanding_amount': lease.calculate_outstanding_rent()
            }
        }, 200

class LandlordPaymentDashboardResource(Resource): # Dashboard data for landlords
    @jwt_required()
    def get(self):
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)

        if current_user.role not in ['landlord', 'admin']:
            return {"error": "Unauthorized"}, 403

        # Get all leases (landlords would have property filtering here)
        leases = Lease.query.filter_by(status='active').all()

        up_to_date = []
        behind_rent = []

        for lease in leases:
            lease_data = lease.to_dict_with_payment_status()
            if lease.is_rent_up_to_date():
                up_to_date.append(lease_data)
            else:
                behind_rent.append(lease_data)

        # Calculate summary statistics
        total_expected_rent = sum(lease.rent_amount for lease in leases)
        total_collected = sum(p.amount for lease in leases
                            for p in lease.payments
                            if p.status == 'completed' and p.payment_type == 'rent')

        return {
            'summary': {
                'total_leases': len(leases),
                'up_to_date_count': len(up_to_date),
                'behind_count': len(behind_rent),
                'collection_rate': round((total_collected / total_expected_rent * 100), 2) if total_expected_rent > 0 else 0
            },
            'up_to_date_tenants': up_to_date,
            'behind_tenants': behind_rent
        }, 200





class RentReminderResource(Resource):
    """Send rent reminders (automated system)"""
    @jwt_required()
    def post(self):
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)

        if current_user.role not in ['admin', 'landlord']:
            return {"error": "Unauthorized"}, 403

        # Find leases with overdue rent
        overdue_leases = []
        for lease in Lease.query.filter_by(status='active').all():
            if not lease.is_rent_up_to_date():
                overdue_leases.append(lease)

        reminders_sent = 0
        for lease in overdue_leases:
            # Create notification
            notification = Notification(
                sender_id=current_user_id,
                recipient_id=lease.tenant_id,
                notification_type='rent_reminder',
                title='Rent Payment Reminder',
                body=f'Your rent payment of ${lease.rent_amount} is overdue by {lease.days_behind_rent()} days. Please make payment as soon as possible.',
                audience='tenant',
                metadata={'lease_id': lease.id, 'amount_due': lease.calculate_outstanding_rent()}
            )
            db.session.add(notification)

            # Send email/SMS (implement these functions)
            try:
                send_email(lease.tenant.email, notification.title, notification.body)
                notification.is_email_sent = True
            except:
                pass

            try:
                send_sms(lease.tenant.phone_number, f"{notification.title}: {notification.body}")
                notification.is_sms_sent = True
            except:
                pass

            reminders_sent += 1

        db.session.commit()
        return {"message": f"Sent {reminders_sent} rent reminders"}, 200

# Repair request routes
class RepairRequestResource(Resource):
    """Handle repair requests"""
    @jwt_required()
    def get(self):
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)

        if current_user.role == 'tenant':
            requests = RepairRequest.query.filter_by(tenant_id=current_user_id).order_by(RepairRequest.created_at.desc()).all()
        else:
            # Admin/landlord can see all requests
            requests = RepairRequest.query.order_by(RepairRequest.created_at.desc()).all()

        return [req.to_dict() for req in requests], 200

    @jwt_required()
    def post(self):
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)

        if current_user.role != 'tenant':
            return {"error": "Only tenants can create repair requests"}, 403

        parser = reqparse.RequestParser()
        parser.add_argument('property_id', type=int, required=True)
        parser.add_argument('title', type=str, required=True)
        parser.add_argument('description', type=str, required=True)
        parser.add_argument('category', type=str, default='general')
        parser.add_argument('priority', type=str, default='normal')
        args = parser.parse_args()

        # Verify tenant has lease for this property
        lease = Lease.query.filter_by(
            tenant_id=current_user_id,
            property_id=args['property_id'],
            status='active'
        ).first()

        if not lease:
            return {"error": "No active lease found for this property"}, 403

        repair_request = RepairRequest(
            tenant_id=current_user_id,
            property_id=args['property_id'],
            lease_id=lease.id,
            title=args['title'],
            description=args['description'],
            category=args['category'],
            priority=args['priority']
        )

        db.session.add(repair_request)
        db.session.commit()

        # Create notification for landlord
        notification = Notification(
            sender_id=current_user_id,
            notification_type='repair_request',
            title='New Repair Request',
            body=f'New {args["priority"]} priority repair request: {args["title"]}',
            audience='landlord',
            metadata={'repair_request_id': repair_request.id}
        )
        db.session.add(notification)
        db.session.commit()

        return repair_request.to_dict(), 201

class RepairRequestDetailResource(Resource):
    """Handle individual repair request operations"""
    @jwt_required()
    def get(self, request_id):
        repair_request = RepairRequest.query.get(request_id)
        if not repair_request:
            return {"error": "Repair request not found"}, 404

        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)

        # Check access permissions
        if (current_user.role == 'tenant' and
            repair_request.tenant_id != current_user_id):
            return {"error": "Unauthorized"}, 403

        return repair_request.to_dict(), 200

    @jwt_required()
    def patch(self, request_id):
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)

        if current_user.role not in ['admin', 'landlord']:
            return {"error": "Unauthorized"}, 403

        repair_request = RepairRequest.query.get(request_id)
        if not repair_request:
            return {"error": "Repair request not found"}, 404

        parser = reqparse.RequestParser()
        parser.add_argument('status', type=str)
        parser.add_argument('notes', type=str)
        parser.add_argument('estimated_cost', type=float)
        parser.add_argument('assigned_to', type=str)
        args = parser.parse_args()

        if args['status']:
            repair_request.update_status(args['status'], args.get('notes'))

        if args['estimated_cost']:
            repair_request.estimated_cost = args['estimated_cost']

        if args['assigned_to']:
            repair_request.assigned_to = args['assigned_to']

        db.session.commit()

        # Send notification to tenant about update
        notification = Notification(
            sender_id=current_user_id,
            recipient_id=repair_request.tenant_id,
            notification_type='repair_update',
            title='Repair Request Update',
            body=f'Your repair request "{repair_request.title}" has been updated to {repair_request.status}.',
            audience='tenant',
            metadata={'repair_request_id': repair_request.id}
        )
        db.session.add(notification)
        db.session.commit()

        return repair_request.to_dict(), 200