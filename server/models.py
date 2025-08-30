import json
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import Enum
from flask_bcrypt import Bcrypt
from sqlalchemy.orm import validates
from datetime import date, datetime, timezone
import hashlib
import uuid
from sqlalchemy_serializer import SerializerMixin

db = SQLAlchemy()
bcrypt = Bcrypt()

ROLE_ADMIN = "admin"
ROLE_TENANT = "tenant"
ROLE_LANDLORD = "landlord"
VALID_ROLES = {ROLE_ADMIN, ROLE_TENANT, ROLE_LANDLORD}
LEASE_STATUSES = ("active", "terminated", "expired", "pending")
BILL_STATUSES = ("unpaid", "paid")
VACATE_STATUSES = ("pending", "approved", "rejected", "completed")

PENDING = 'pending'
SUCCESSFUL = 'successful'
FAILED = 'failed'
REFUNDED = 'refunded'
PAYMENT_STATUS = {PENDING, SUCCESSFUL, FAILED, REFUNDED}

OPEN = 'open'
IN_PROGRESS = 'in progress'
CLOSED = 'closed'
REPAIR_REQUEST_STATUS = {OPEN, IN_PROGRESS, CLOSED}



class User(db.Model, SerializerMixin):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    public_id = db.Column(db.String(50), unique=True, nullable=False, default=lambda: str(uuid.uuid4()))
    username = db.Column(db.String(100), unique=True, nullable=False)
    email = db.Column(db.String(40), unique=True, nullable=False)
    national_id = db.Column(db.Integer, unique=True, nullable=False)
    password_hash = db.Column(db.String(120), nullable=False)
    role = db.Column(Enum(*VALID_ROLES, name="role_enum"), nullable=False)
    first_name = db.Column(db.String(40), nullable=False)
    last_name = db.Column(db.String(40), nullable=False)
    phone_number = db.Column(db.String(20), nullable=False)
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime, default=datetime.now(timezone.utc), onupdate=datetime.now(timezone.utc), nullable=False)

    leases = db.relationship("Lease", back_populates="tenant", cascade="all, delete-orphan")
    properties = db.relationship("Property", back_populates="landlord")
    
    serialize_rules = ("-leases.tenant", "-leases.property")


    def __repr__(self):
        return f"<User {self.username}>"

    def set_password(self, password):
        self.password_hash = bcrypt.generate_password_hash(password).decode('utf-8')

    def check_password(self, password):
        return bcrypt.check_password_hash(self.password_hash, password)

    @validates('role')
    def validate_role(self, key, value):
        if value not in VALID_ROLES:
            raise ValueError(f"Invalid role: {value}. Must be one of {VALID_ROLES}")
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

    @validates('national_id')
    def validate_national_id(self, key, national_id):
        if not isinstance(national_id, int):
            raise ValueError("National ID must be an integer")
        if len(str(national_id)) > 8:
            raise ValueError("National ID should not exceed 8 digits")
        if national_id <= 0:
            raise ValueError("Invalid")
        return national_id

    def to_dict(self):
        return {
            "public_id": self.public_id,
            "first_name": self.first_name,
            "last_name": self.last_name,
            "username": self.username,
            "email": self.email,
            "national_id": self.national_id,
            "phone_number": self.phone_number,
            "role": self.role,
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None
        }


    @staticmethod
    def validate_role_static(role):
        return role in VALID_ROLES

class Property(db.Model, SerializerMixin):
    __tablename__ = "properties"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    location = db.Column(db.String(150), nullable=False)
    rent = db.Column(db.Float, nullable=False)
    status = db.Column(db.String(20), nullable=False, default="vacant")
    pictures = db.Column(db.Text, nullable=True)
    landlord_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)

    landlord = db.relationship("User", back_populates="properties")

    leases = db.relationship("Lease", back_populates="property", cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "location": self.location,
            "rent": self.rent,
            "status": self.status,
            "pictures": json.loads(self.pictures) if self.pictures else [],
        }



class Lease(db.Model, SerializerMixin):
    __tablename__ = "leases"

    id = db.Column(db.Integer, primary_key=True)
    tenant_id = db.Column(db.Integer, db.ForeignKey("users.id"))
    property_id = db.Column(db.Integer, db.ForeignKey("properties.id"))
    start_date = db.Column(db.Date, default=lambda: datetime.now(timezone.utc).date(), nullable=False)
    end_date = db.Column(db.Date, nullable=True)
    rent_amount = db.Column(db.Float, nullable=False)
    status = db.Column(Enum(*LEASE_STATUSES, name="lease_status_enum"), default="active", nullable=False)

    vacate_date = db.Column(db.Date, nullable=True)
    vacate_status = db.Column(Enum(*VACATE_STATUSES, name="vacate_status_enum"), default="pending")

    tenant = db.relationship("User", back_populates="leases")
    property = db.relationship("Property", back_populates="leases")
    bills = db.relationship("Bill", back_populates="lease", cascade="all, delete-orphan")
    payments = db.relationship('Payment', back_populates='lease', cascade='all, delete-orphan')
    serialize_rules = ("-tenant.leases", "-property.leases", "-bills.lease", "-payments.lease")

    @validates("end_date")
    def validate_dates(self, key, end_date):
        if end_date and self.start_date and end_date <= self.start_date:
            raise ValueError("End date must be after start date.")
        return end_date

    @validates("rent_amount")
    def validate_rent(self, key, rent):
        if rent <= 0:
            raise ValueError("Rent amount must be greater than 0.")
        return rent

    def is_expired(self):
        if self.end_date and datetime.now().date() > self.end_date:
            return True
        return False

    def duration_days(self):
        if self.end_date and self.start_date:
            return (self.end_date - self.start_date).days
        return 0

    def request_vacate(self, date):
        """Tenant requests to vacate."""
        self.vacate_requested = True
        self.vacate_date = date
        self.vacate_status = "pending"

    def approve_vacate(self):
        """Landlord/admin approves vacate request."""
        self.vacate_status = "approved"
        self.status = "terminated"

    def reject_vacate(self):
        """Landlord/admin rejects vacate request."""
        self.vacate_status = "rejected"

    @validates("vacate_status")
    def validate_vacate_status(self, key, value):
        allowed_statuses = ["pending", "approved", "rejected", "completed"]
        if value not in allowed_statuses:
            raise ValueError(f"Invalid vacate status: {value}. Must be one of {allowed_statuses}")
        return value


class Bill(db.Model, SerializerMixin):
    __tablename__ = "bills"

    id = db.Column(db.Integer, primary_key=True)
    lease_id = db.Column(db.Integer, db.ForeignKey("leases.id"), nullable=False)
    amount = db.Column(db.Float, nullable=False)
    due_date = db.Column(db.Date, nullable=False)
    status = db.Column(db.String, default="unpaid")
    created_at = db.Column(db.DateTime, default=datetime.now(timezone.utc))

    lease = db.relationship("Lease", back_populates="bills")

    serialize_rules = ("-lease.bills",)

    @validates("amount")
    def validate_amount(self, key, value):
        if value <= 0:
            raise ValueError("Bill amount must be greater than 0")
        return value

    @validates("status")
    def validate_status(self, key, value):
        if value not in ["unpaid", "paid"]:
            raise ValueError("Invalid status: must be 'unpaid' or 'paid'")
        return value

    @validates("due_date")
    def validate_due_date(self, key, value):
        if value < date.today():
            raise ValueError("Due date cannot be in the past")
        return value

    def pay(self):
        self.status = "paid"

    def is_overdue(self):
        return self.status == "unpaid" and self.due_date < date.today()

    def total_with_penalty(self, penalty_rate=0.05):
        if self.is_overdue():
            return round(self.amount * (1 + penalty_rate), 2)
        return self.amount

class Notification(db.Model, SerializerMixin):
    __tablename__ = "notifications"

    id = db.Column(db.Integer, primary_key=True)
    sender_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    recipient_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)
    title = db.Column(db.String(200), nullable=False)
    message = db.Column(db.Text, nullable=False)
    notification_type = db.Column(db.String(50), default="general", nullable=False)
    is_broadcast = db.Column(db.Boolean, default=False, nullable=False)
    is_read = db.Column(db.Boolean, default=False, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.now(timezone.utc), nullable=False)
    read_at = db.Column(db.DateTime, nullable=True)

    sender = db.relationship("User", foreign_keys=[sender_id], backref="sent_notifications")
    recipient = db.relationship("User", foreign_keys=[recipient_id], backref="received_notifications")

    serialize_rules = ("-sender.sent_notifications", "-recipient.received_notifications", "-sender.password_hash", "-recipient.password_hash")

    @validates('notification_type')
    def validate_notification_type(self, key, value):
        valid_types = ["general", "urgent", "maintenance", "payment", "lease", "system"]
        if value not in valid_types:
            raise ValueError(f"Invalid notification type: {value}. Must be one of {valid_types}")
        return value

    def mark_as_read(self):
        self.is_read = True
        self.is_read_at = datetime.now(timezone.utc)

    def to_dict(self):
        return {
            "id": self.id,
            "sender": {
                "id": self.sender.public_id if self.sender else None,
                "name": f"{self.sender.first_name} {self.sender.last_name}" if self.sender else "System",
                "role": self.sender.role if self.sender else "System"
            },
            "recipient": {
                "id": self.recipient.public_id if self.recipient else None,
                "name": f"{self.recipient.first_name} {self.recipient.last_name}" if self.recipient else "All tenants"
            } if self.recipient else None,
            "title": self.title,
            "message": self.message,
            "notification_type": self.notification_type,
            "is_broadcast": self.is_broadcast,
            "is_read": self.is_read,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "read_at": self.read_at.isoformat() if self.read_at else None
        }

class Payment(db.Model):
    __tablename__ = 'payments'


    id = db.Column(db.Integer, primary_key=True)
    lease_id = db.Column(db.Integer, db.ForeignKey('leases.id'), nullable=False)
    amount = db.Column(db.Integer, nullable=False)
    provider_id = db.Column(db.String(120))
    status = db.Column(Enum(*PAYMENT_STATUS, name='status'))
    transaction_id = db.Column(db.String, unique=True)
    created_at = db.Column(db.DateTime, default =lambda: datetime.now(timezone.utc))

    lease = db.relationship('Lease', back_populates= 'payments')


class RepairRequest(db.Model):
    __tablename__ = 'repairs'


    id = db.Column(db.Integer, primary_key=True)
    tenant_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    property_id = db.Column(db.Integer, db.ForeignKey('properties.id'), nullable=False)
    title = db.Column(db.String(160), nullable=False)
    description = db.Column(db.Text, nullable=False)
    status = db.Column(Enum(*REPAIR_REQUEST_STATUS, name='status'))
    priority = db.Column(db.String(20), default='normal')
    created_at = db.Column(db.DateTime, default =lambda: datetime.now(timezone.utc))