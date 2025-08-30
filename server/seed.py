from app import create_app, db
from models import User, Property, Lease, Bill, Notification, Payment, RepairRequest
from datetime import date, datetime, timedelta, timezone

app = create_app()
with app.app_context():
    # --- Clear existing data (order matters) ---
    Payment.query.delete()
    Bill.query.delete()
    Lease.query.delete()
    Property.query.delete()
    Notification.query.delete()
    RepairRequest.query.delete()
    User.query.delete()

    # --- Users ---
    admin = User(
        username="admin1",
        email="admin@example.com",
        national_id=11111111,
        role="admin",
        first_name="Super",
        last_name="Admin",
        phone_number="0711111111"
    )
    admin.set_password("admin123")

    landlord1 = User(
        username="landlord_john",
        email="john@example.com",
        national_id=22222222,
        role="landlord",
        first_name="John",
        last_name="Doe",
        phone_number="0722222222"
    )
    landlord1.set_password("password")

    landlord2 = User(
        username="landlord_mary",
        email="mary@example.com",
        national_id=33333333,
        role="landlord",
        first_name="Mary",
        last_name="Smith",
        phone_number="0733333333"
    )
    landlord2.set_password("password")

    tenant1 = User(
        username="tenant_alice",
        email="alice@example.com",
        national_id=44444444,
        role="tenant",
        first_name="Alice",
        last_name="Mwangi",
        phone_number="0744444444"
    )
    tenant1.set_password("password")

    tenant2 = User(
        username="tenant_brian",
        email="brian@example.com",
        national_id=55555555,
        role="tenant",
        first_name="Brian",
        last_name="Otieno",
        phone_number="0755555555"
    )
    tenant2.set_password("password")

    db.session.add_all([admin, landlord1, landlord2, tenant1, tenant2])
    db.session.commit()

    # --- Properties with working image URLs ---
    property_data = [
        ("Greenview Apartments", "Nairobi, Westlands", 35000, landlord1, "https://images.unsplash.com/photo-1534655610770-dd69616f05ff?q=80&w=656&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"),
        ("Sunset Villas", "Nairobi, Karen", 75000, landlord1, "https://images.unsplash.com/photo-1513052467476-a11357d170a5?q=80&w=870&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"),
        ("Oakwood Residency", "Nairobi, Kilimani", 45000, landlord1, "https://plus.unsplash.com/premium_photo-1678963247798-0944cf6ba34d?q=80&w=739&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"),
        ("Palm Heights", "Nairobi, Lavington", 60000, landlord1, "https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=400&h=300&fit=crop"),
        ("Hilltop Mansion", "Nairobi, Runda", 120000, landlord1, "https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=400&h=300&fit=crop"),
        ("Cityscape Flats", "Nairobi, CBD", 30000, landlord2, "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=400&h=300&fit=crop"),
        ("Garden Estate", "Nairobi, Garden Estate", 55000, landlord2, "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=400&h=300&fit=crop"),
        ("Riverside Towers", "Nairobi, Riverside", 80000, landlord2, "https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=400&h=300&fit=crop"),
        ("Maple Grove", "Nairobi, Kileleshwa", 65000, landlord2, "https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=400&h=300&fit=crop"),
        ("Royal Heights", "Nairobi, Gigiri", 100000, landlord2, "https://plus.unsplash.com/premium_photo-1678963247798-0944cf6ba34d?q=80&w=739&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"),
    ]

    properties = []
    for name, location, rent, landlord, image_url in property_data:
        p = Property(
            name=name,
            location=location,
            rent=rent,
            pictures=f'["{image_url}"]',  # Store as JSON array with external URL
            landlord_id=landlord.id
        )
        properties.append(p)

    db.session.add_all(properties)
    db.session.commit()

    # --- Leases ---
    lease1 = Lease(
        tenant_id=tenant1.id,
        property_id=properties[0].id,
        start_date=date(2024, 1, 1),
        end_date=date(2024, 12, 31),
        rent_amount=35000,
        status="active"
    )

    lease2 = Lease(
        tenant_id=tenant2.id,
        property_id=properties[1].id,
        start_date=date(2024, 2, 1),
        end_date=date(2025, 1, 31),
        rent_amount=75000,
        status="active"
    )

    db.session.add_all([lease1, lease2])
    db.session.commit()

    # --- Bills ---
    bill1 = Bill(
        lease_id=lease1.id,
        amount=35000,
        due_date=date.today() + timedelta(days=10),
        status="unpaid"
    )

    bill2 = Bill(
        lease_id=lease2.id,
        amount=75000,
        due_date=date.today() + timedelta(days=5),
        status="paid"
    )

    db.session.add_all([bill1, bill2])
    db.session.commit()

    # --- Payments ---
    payment1 = Payment(
        lease_id=lease1.id,
        amount=35000,
        provider_id="mpesa",
        status="successful",
        transaction_id="TXN12345"
    )

    payment2 = Payment(
        lease_id=lease2.id,
        amount=75000,
        provider_id="mpesa",
        status="pending",
        transaction_id="TXN67890"
    )

    db.session.add_all([payment1, payment2])
    db.session.commit()

    # --- Notifications ---
    notif1 = Notification(
        sender_id=landlord1.id,
        recipient_id=tenant1.id,
        title="Rent Due Soon",
        message="Dear Alice, your rent is due in 10 days.",
        notification_type="payment"
    )

    notif2 = Notification(
        sender_id=admin.id,
        recipient_id=None,  # broadcast
        title="System Maintenance",
        message="The system will be down for maintenance this weekend.",
        notification_type="system",
        is_broadcast=True
    )

    db.session.add_all([notif1, notif2])
    db.session.commit()

    # --- Repair Requests ---
    repair1 = RepairRequest(
        tenant_id=tenant1.id,
        property_id=properties[0].id,
        title="Leaking Sink",
        description="The kitchen sink is leaking.",
        status="open",
        priority="high"
    )

    repair2 = RepairRequest(
        tenant_id=tenant2.id,
        property_id=properties[1].id,
        title="Broken Window",
        description="One of the windows in the living room is broken.",
        status="in progress",
        priority="medium"
    )

    db.session.add_all([repair1, repair2])
    db.session.commit()

    print("✅ Database seeded successfully with users, properties, leases, bills, payments, notifications, and repairs!")