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



def create_app():
    app = Flask(__name__)
    app.config["SECRET_KEY"] = os.getenv("SECRET_KEY", "dev-key")
    app.config["SQLALCHEMY_DATABASE_URI"] = os.getenv("DATABASE_URL", "sqlite:///property.db")
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = os.getenv("SQLALCHEMY_TRACK_MODIFICATIONS", False)
    app.config["JWT_SECRET_KEY"] = os.getenv("JWT_SECRET_KEY", "dev-jwt-key")
    app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(hours=1)
    app.config["JWT_REFRESH_TOKEN_EXPIRES"] = timedelta(days=7)

    UPLOAD_FOLDER = "uploads/properties"
    os.makedirs(UPLOAD_FOLDER, exist_ok=True)
    app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER


    # Enable CORS for your frontend
    CORS(app, origins=["http://localhost:5173", "http://127.0.0.1:5173"], supports_credentials=True)

    db.init_app(app)
    jwt = JWTManager(app)
    migrate = Migrate (app, db)

    api = Api(app)

    from views import (
        RegisterResource, LoginResource, LogoutResource, RefreshResource, ProfileResource,
        DashboardResource, UsersResource, HealthCheckResource, UserManagementResource,
        LandlordDashboardResource, TenantDashboardResource, AdminDashboardResource,
        DashboardStatsResource, UserProfileDashboardResource, LeaseListResource, LeaseResource,
        BillListResource, BillResource, LeaseVacateResource, LeaseVacateApprovalResource,
        PaymentInitResource, MpesaCallbackResource, PaymentStatusResource, PaymentHistoryResource,
        LandlordPaymentDashboardResource, RentReminderResource, RepairRequestResource,
        RepairRequestDetailResource, NotificationListResource, NotificationResource,
        BroadcastNotificationResource, TenantListResource
    )

    # Register resources
    api.add_resource(PropertyListResource, "/properties")
    api.add_resource(PropertyResource, "/properties/<int:id>")
    api.add_resource(RegisterResource, "/auth/register")
    api.add_resource(LoginResource, "/auth/login")
    api.add_resource(LogoutResource, "/auth/logout")
    api.add_resource(RefreshResource, "/auth/refresh")
    api.add_resource(ProfileResource, "/auth/profile")
    api.add_resource(DashboardResource, "/auth/dashboard")
    api.add_resource(UsersResource, "/auth/users")
    api.add_resource(HealthCheckResource, "/health")
    api.add_resource(UserManagementResource, "/auth/users/<string:user_id>")
    api.add_resource(LandlordDashboardResource, "/landlord/dashboard")
    api.add_resource(TenantDashboardResource, "/tenant/dashboard")
    api.add_resource(AdminDashboardResource, "/admin/dashboard")
    api.add_resource(DashboardStatsResource, "/dashboard/stats")
    api.add_resource(UserProfileDashboardResource, "/dashboard/profile")
    api.add_resource(LeaseListResource, "/leases")
    api.add_resource(LeaseResource, "/leases/<int:lease_id>")
    api.add_resource(BillListResource, "/bills")
    api.add_resource(BillResource, "/bills/<int:bill_id>")
    api.add_resource(LeaseVacateResource, "/leases/<int:lease_id>/vacate")
    api.add_resource(LeaseVacateApprovalResource, "/leases/<int:lease_id>/vacate/approval")
    api.add_resource(PaymentInitResource, '/payments/initiate')
    api.add_resource(MpesaCallbackResource, '/payments/callback')
    api.add_resource(PaymentStatusResource, '/payments/status/<int:payment_id>')
    api.add_resource(PaymentHistoryResource, '/payments/lease/<int:lease_id>')
    api.add_resource(LandlordPaymentDashboardResource, '/landlord/dashboard/payment')
    api.add_resource(RentReminderResource, '/reminders/rent')
    api.add_resource(RepairRequestResource, '/repairs')
    api.add_resource(RepairRequestDetailResource, '/repairs/<int:request_id>')
    api.add_resource(NotificationListResource, "/notifications")
    api.add_resource(NotificationResource, "/notifications/<int:notification_id>")
    api.add_resource(BroadcastNotificationResource, "/notifications/broadcast")
    api.add_resource(TenantListResource, "/tenants")

    @app.route("/uploads/<filename>")
    def uploaded_file(filename):
        return send_from_directory(app.config["UPLOAD_FOLDER"], filename)

    return app

#from views import *
# Run the app
# if __name__ == "__main__":
#     app_instance = create_app()
#     with app_instance.app_context():
#         db.create_all()
#     app_instance.run(debug=True, port=5000)
if __name__ == "__main__":

    app = create_app()


    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 5000)))

