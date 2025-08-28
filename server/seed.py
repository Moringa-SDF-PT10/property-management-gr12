# seed.py
import random
from datetime import datetime, timedelta, date
from faker import Faker
from app import create_app, db
from models import User, Property, Lease, Bill, Notification, Payment, RepairRequest

fake = Faker()

def seed_data():
    app = create_app()
    with app.app_context():
        db.drop_all()
        db.create_all()

        # ---- USERS ----
        users = []
        roles = ["tenant", "landlord", "admin"]

        for _ in range(10):
            user = User(
                username=fake.user_name(),
                email=fake.unique.email(),
                national_id=random.randint(10000000, 99999999),
                role=random.choice(roles),
                first_name=fake.first_name(),
                last_name=fake.last_name(),
                phone_number=fake.msisdn()[:12],
            )
            user.set_password("password123")  # default password
            users.append(user)
            db.session.add(user)

        db.session.commit()

        # ---- PROPERTIES ----
        properties = []
        for _ in range(5):
            prop = Property(
                name=fake.company(),
                location=fake.address(),
                rent=round(random.uniform(5000, 25000), 2),
                status=random.choice(["vacant", "occupied"]),
                pictures=fake.json(data_columns={"image": "image_url"}, num_rows=3),
            )
            properties.append(prop)
            db.session.add(prop)

        db.session.commit()

        # ---- LEASES ----
        leases = []
        for _ in range(7):
            tenant = random.choice([u for u in users if u.role == "tenant"])
            prop = random.choice(properties)
            start_date = date.today() - timedelta(days=random.randint(30, 300))
            end_date = start_date + timedelta(days=random.randint(30, 365))

            lease = Lease(
                tenant=tenant,
                property=prop,
                start_date=start_date,
                end_date=end_date,
                rent_amount=prop.rent,
                status=random.choice(["active", "terminated", "pending"]),
            )
            leases.append(lease)
            db.session.add(lease)

        db.session.commit()

        # ---- BILLS ----
        for lease in leases:
            for _ in range(random.randint(1, 3)):
                due_date = date.today() + timedelta(days=random.randint(5, 60))
                bill = Bill(
                    lease=lease,
                    amount=lease.rent_amount,
                    due_date=due_date,
                    status=random.choice(["unpaid", "paid"]),
                )
                db.session.add(bill)

        db.session.commit()

        # ---- PAYMENTS ----
        for lease in leases:
            for _ in range(random.randint(1, 2)):
                payment = Payment(
                    lease=lease,
                    amount=lease.rent_amount,
                    provider_id=fake.uuid4(),
                    status=random.choice(["pending", "successful", "failed", "refunded"]),
                    transaction_id=fake.uuid4(),
                )
                db.session.add(payment)

        db.session.commit()

        # ---- NOTIFICATIONS ----
        for _ in range(5):
            sender = random.choice(users)
            recipient = random.choice(users)
            notif = Notification(
                sender=sender,
                recipient=recipient,
                title=fake.sentence(nb_words=6),
                message=fake.paragraph(nb_sentences=3),
                notification_type=random.choice(["general", "urgent", "maintenance", "payment", "lease"]),
                is_broadcast=random.choice([True, False]),
            )
            db.session.add(notif)

        db.session.commit()

        # ---- REPAIR REQUESTS ----
        for _ in range(5):
            tenant = random.choice([u for u in users if u.role == "tenant"])
            prop = random.choice(properties)
            repair = RepairRequest(
                tenant_id=tenant.id,
                property_id=prop.id,
                title=fake.sentence(nb_words=5),
                description=fake.paragraph(nb_sentences=2),
                status=random.choice(["open", "in progress", "closed"]),
                priority=random.choice(["low", "normal", "high"]),
            )
            db.session.add(repair)

        db.session.commit()

        print("🌱 Database seeded successfully!")

if __name__ == "__main__":
    seed_data()
