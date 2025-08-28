# utils.py - Utility functions for notifications and background tasks
import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from twilio.rest import Client
from datetime import datetime, timedelta, date
from celery import Celery
from models import db, Lease, Notification, User
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize Celery for background tasks (optional)
def make_celery(app):
    celery = Celery(
        app.import_name,
        backend=app.config['CELERY_RESULT_BACKEND'],
        broker=app.config['CELERY_BROKER_URL']
    )
    celery.conf.update(app.config)
    return celery

# Email utilities
def send_email(to_email, subject, body, html_body=None):
    """Send email using SMTP"""
    try:
        smtp_server = os.getenv('SMTP_SERVER', 'smtp.gmail.com')
        smtp_port = int(os.getenv('SMTP_PORT', '587'))
        email_user = os.getenv('EMAIL_USER')
        email_password = os.getenv('EMAIL_PASSWORD')

        if not all([email_user, email_password]):
            logger.error("Email credentials not configured")
            return False

        msg = MIMEMultipart('alternative')
        msg['From'] = email_user
        msg['To'] = to_email
        msg['Subject'] = subject

        # Add plain text version
        text_part = MIMEText(body, 'plain')
        msg.attach(text_part)

        # Add HTML version if provided
        if html_body:
            html_part = MIMEText(html_body, 'html')
            msg.attach(html_part)

        with smtplib.SMTP(smtp_server, smtp_port) as server:
            server.starttls()
            server.login(email_user, email_password)
            server.send_message(msg)

        logger.info(f"Email sent successfully to {to_email}")
        return True

    except Exception as e:
        logger.error(f"Failed to send email to {to_email}: {str(e)}")
        return False

def send_sms(phone_number, message):
    """Send SMS using Twilio"""
    try:
        account_sid = os.getenv('TWILIO_ACCOUNT_SID')
        auth_token = os.getenv('TWILIO_AUTH_TOKEN')
        from_phone = os.getenv('TWILIO_PHONE_NUMBER')

        if not all([account_sid, auth_token, from_phone]):
            logger.error("Twilio credentials not configured")
            return False

        client = Client(account_sid, auth_token)

        message = client.messages.create(
            body=message,
            from_=from_phone,
            to=phone_number
        )

        logger.info(f"SMS sent successfully to {phone_number}: {message.sid}")
        return True

    except Exception as e:
        logger.error(f"Failed to send SMS to {phone_number}: {str(e)}")
        return False

# Background task decorators (use with Celery if available)
def create_background_task(func):
    """Decorator to make a function run in background if Celery is available"""
    def wrapper(*args, **kwargs):
        try:
            # Try to run as Celery task
            return func.delay(*args, **kwargs)
        except:
            # Fall back to immediate execution
            return func(*args, **kwargs)
    return wrapper

# Automated reminder functions
def check_overdue_rent():
    """Check for overdue rent and send reminders"""
    today = date.today()
    overdue_leases = []

    # Get all active leases
    active_leases = Lease.query.filter_by(status='active').all()

    for lease in active_leases:
        if not lease.is_rent_up_to_date():
            days_behind = lease.days_behind_rent()

            # Send reminders at 1, 7, 14, and 30 days overdue
            if days_behind in [1, 7, 14, 30]:
                send_rent_reminder(lease, days_behind)
                overdue_leases.append({
                    'lease_id': lease.id,
                    'tenant_name': f"{lease.tenant.first_name} {lease.tenant.last_name}",
                    'days_behind': days_behind,
                    'amount_due': lease.calculate_outstanding_rent()
                })

    logger.info(f"Processed {len(overdue_leases)} overdue rent reminders")
    return overdue_leases

def send_rent_reminder(lease, days_behind):
    """Send rent reminder for specific lease"""
    tenant = lease.tenant
    amount_due = lease.calculate_outstanding_rent()

    # Determine urgency based on days behind
    if days_behind >= 30:
        urgency = "URGENT"
        subject = "URGENT: Rent Payment Overdue - Immediate Action Required"
    elif days_behind >= 14:
        urgency = "High Priority"
        subject = "High Priority: Rent Payment Reminder"
    elif days_behind >= 7:
        urgency = "Important"
        subject = "Important: Rent Payment Reminder"
    else:
        urgency = "Reminder"
        subject = "Rent Payment Reminder"

    # Create email body
    email_body = f"""
Dear {tenant.first_name} {tenant.last_name},

This is a {urgency.lower()} reminder that your rent payment is overdue.

Lease Details:
- Lease ID: #{lease.id}
- Monthly Rent: ${lease.rent_amount}
- Days Overdue: {days_behind}
- Outstanding Amount: ${amount_due}

Please make your payment as soon as possible to avoid late fees and potential lease termination.

For payment options, please log into your tenant portal or contact our office.

Thank you,
Property Management Team
"""

    # Create HTML email body
    html_body = f"""
<html>
<body>
    <h2 style="color: {'red' if days_behind >= 14 else 'orange'};">{urgency} Rent Payment Reminder</h2>

    <p>Dear {tenant.first_name} {tenant.last_name},</p>

    <p>This is a {urgency.lower()} reminder that your rent payment is overdue.</p>

    <table border="1" style="border-collapse: collapse;">
        <tr><td><strong>Lease ID</strong></td><td>#{lease.id}</td></tr>
        <tr><td><strong>Monthly Rent</strong></td><td>${lease.rent_amount}</td></tr>
        <tr><td><strong>Days Overdue</strong></td><td>{days_behind}</td></tr>
        <tr><td><strong>Outstanding Amount</strong></td><td style="color: red;">${amount_due}</td></tr>
    </table>

    <p><strong>Please make your payment as soon as possible to avoid late fees and potential lease termination.</strong></p>

    <p>For payment options, please log into your tenant portal or contact our office.</p>

    <p>Thank you,<br>Property Management Team</p>
</body>
</html>
"""

    # Send email
    email_sent = send_email(tenant.email, subject, email_body, html_body)

    # Send SMS for urgent cases
    sms_sent = False
    if days_behind >= 7:
        sms_message = f"RENT REMINDER: Your rent payment is {days_behind} days overdue. Amount due: ${amount_due}. Please pay immediately to avoid penalties."
        sms_sent = send_sms(tenant.phone_number, sms_message)

    # Create notification record
    notification = Notification(
        sender_id=1,  # System/admin user
        recipient_id=tenant.id,
        notification_type='rent_reminder',
        title=subject,
        body=email_body,
        audience='tenant',
        is_email_sent=email_sent,
        is_sms_sent=sms_sent,
        metadata={
            'lease_id': lease.id,
            'days_behind': days_behind,
            'amount_due': amount_due,
            'urgency': urgency
        }
    )

    db.session.add(notification)
    db.session.commit()

def check_lease_expiry():
    """Check for leases expiring soon and send notifications"""
    today = date.today()
    thirty_days = today + timedelta(days=30)
    sixty_days = today + timedelta(days=60)

    # Find leases expiring in 30 and 60 days
    expiring_leases = Lease.query.filter(
        Lease.status == 'active',
        Lease.end_date.between(today, sixty_days)
    ).all()

    notifications_sent = 0

    for lease in expiring_leases:
        days_until_expiry = (lease.end_date - today).days

        # Send notifications at 60, 30, 14, and 7 days before expiry
        if days_until_expiry in [60, 30, 14, 7]:
            send_lease_expiry_notification(lease, days_until_expiry)
            notifications_sent += 1

    logger.info(f"Sent {notifications_sent} lease expiry notifications")
    return notifications_sent

def send_lease_expiry_notification(lease, days_until_expiry):
    """Send lease expiry notification"""
    tenant = lease.tenant

    subject = f"Lease Expiry Notice - {days_until_expiry} days remaining"

    email_body = f"""
Dear {tenant.first_name} {tenant.last_name},

Your lease is set to expire in {days_until_expiry} days.

Lease Details:
- Lease ID: #{lease.id}
- Expiry Date: {lease.end_date.strftime('%B %d, %Y')}
- Monthly Rent: ${lease.rent_amount}

Please contact our office to discuss lease renewal options or provide notice if you plan to vacate.

Thank you,
Property Management Team
"""

    # Send email
    email_sent = send_email(tenant.email, subject, email_body)

    # Create notification
    notification = Notification(
        sender_id=1,  # System/admin user
        recipient_id=tenant.id,
        notification_type='lease_expiry',
        title=subject,
        body=email_body,
        audience='tenant',
        is_email_sent=email_sent,
        metadata={
            'lease_id': lease.id,
            'days_until_expiry': days_until_expiry,
            'expiry_date': lease.end_date.isoformat()
        }
    )

    db.session.add(notification)
    db.session.commit()

# Data analysis utilities
def calculate_rent_collection_rate():
    """Calculate overall rent collection rate"""
    active_leases = Lease.query.filter_by(status='active').all()

    if not active_leases:
        return 0

    up_to_date_count = sum(1 for lease in active_leases if lease.is_rent_up_to_date())
    return round((up_to_date_count / len(active_leases)) * 100, 2)

def get_payment_analytics(start_date=None, end_date=None):
    """Get payment analytics for a date range"""
    from models import Payment

    if not start_date:
        start_date = datetime.now() - timedelta(days=30)
    if not end_date:
        end_date = datetime.now()

    payments = Payment.query.filter(
        Payment.created_at.between(start_date, end_date),
        Payment.status == 'completed'
    ).all()

    analytics = {
        'total_payments': len(payments),
        'total_amount': sum(p.amount for p in payments),
        'payment_methods': {},
        'payment_types': {}
    }

    for payment in payments:
        # Count by method
        if payment.method not in analytics['payment_methods']:
            analytics['payment_methods'][payment.method] = {'count': 0, 'amount': 0}
        analytics['payment_methods'][payment.method]['count'] += 1
        analytics['payment_methods'][payment.method]['amount'] += payment.amount

        # Count by type
        if payment.payment_type not in analytics['payment_types']:
            analytics['payment_types'][payment.payment_type] = {'count': 0, 'amount': 0}
        analytics['payment_types'][payment.payment_type]['count'] += 1
        analytics['payment_types'][payment.payment_type]['amount'] += payment.amount

    return analytics

# Maintenance utilities for repair requests
def send_repair_request_notification(repair_request, recipient_role='landlord'):
    """Send notification about repair request"""
    tenant = repair_request.tenant

    if recipient_role == 'landlord':
        subject = f"New Repair Request - {repair_request.title}"
        body = f"""
New repair request submitted by {tenant.first_name} {tenant.last_name}:

Title: {repair_request.title}
Category: {repair_request.category}
Priority: {repair_request.priority}
Description: {repair_request.description}

Please log into the admin portal to review and respond to this request.
"""
    else:  # tenant notification
        subject = f"Repair Request Update - {repair_request.title}"
        body = f"""
Your repair request has been updated:

Title: {repair_request.title}
Status: {repair_request.status}
Notes: {repair_request.notes or 'No additional notes'}

You can track the progress in your tenant portal.
"""

    notification = Notification(
        sender_id=repair_request.tenant_id if recipient_role == 'landlord' else 1,
        notification_type='repair_request' if recipient_role == 'landlord' else 'repair_update',
        title=subject,
        body=body,
        audience=recipient_role,
        metadata={
            'repair_request_id': repair_request.id,
            'priority': repair_request.priority,
            'category': repair_request.category
        }
    )

    db.session.add(notification)
    db.session.commit()

# Scheduled task functions (call these with a scheduler like cron or Celery beat)
def daily_rent_check():
    """Daily task to check for overdue rent"""
    try:
        overdue_leases = check_overdue_rent()
        logger.info(f"Daily rent check completed. Found {len(overdue_leases)} overdue leases.")
        return len(overdue_leases)
    except Exception as e:
        logger.error(f"Error during daily rent check: {str(e)}")
        return 0

def weekly_lease_expiry_check():
    """Weekly task to check for expiring leases"""
    try:
        notifications_sent = check_lease_expiry()
        logger.info(f"Weekly lease expiry check completed. Sent {notifications_sent} notifications.")
        return notifications_sent
    except Exception as e:
        logger.error(f"Error during lease expiry check: {str(e)}")
        return 0

def monthly_analytics_report():
    """Generate monthly analytics report"""
    try:
        start_date = datetime.now().replace(day=1) - timedelta(days=1)  # Last month
        start_date = start_date.replace(day=1)
        end_date = datetime.now().replace(day=1) - timedelta(days=1)

        analytics = get_payment_analytics(start_date, end_date)
        collection_rate = calculate_rent_collection_rate()

        # Send report to administrators
        admins = User.query.filter_by(role='admin').all()

        report_body = f"""
Monthly Property Management Report - {start_date.strftime('%B %Y')}

Payment Summary:
- Total Payments: {analytics['total_payments']}
- Total Amount Collected: ${analytics['total_amount']:,.2f}
- Rent Collection Rate: {collection_rate}%

Payment Methods:
"""
        for method, data in analytics['payment_methods'].items():
            report_body += f"- {method.title()}: {data['count']} payments (${data['amount']:,.2f})\n"

        report_body += "\nPayment Types:\n"
        for ptype, data in analytics['payment_types'].items():
            report_body += f"- {ptype.title()}: {data['count']} payments (${data['amount']:,.2f})\n"

        for admin in admins:
            send_email(
                admin.email,
                f"Monthly Property Management Report - {start_date.strftime('%B %Y')}",
                report_body
            )

        logger.info(f"Monthly analytics report sent to {len(admins)} administrators")
        return analytics
    except Exception as e:
        logger.error(f"Error generating monthly report: {str(e)}")
        return None