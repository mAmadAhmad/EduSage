import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.core.config import settings


def send_verification_email(to_email: str, code: str, user_name: str):
    message = MIMEMultipart("alternative")
    message["Subject"] = "Your EduSage Verification Code"
    message["From"] = settings.SMTP_USERNAME
    message["To"] = to_email

    text = f"Hi {user_name},\n\nYour verification code is: {code}\nThis code expires in 15 minutes."

    html = f"""
    <html>
      <body>
        <h2>Welcome to EduSage!</h2>
        <p>Hi {user_name},</p>
        <p>Your verification code is: <strong style="font-size: 24px;">{code}</strong></p>
        <p>This code expires in 15 minutes.</p>
      </body>
    </html>
    """

    message.attach(MIMEText(text, "plain"))
    message.attach(MIMEText(html, "html"))

    try:
        server = smtplib.SMTP(settings.SMTP_SERVER, settings.SMTP_PORT)
        server.starttls()
        server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
        server.sendmail(settings.SMTP_USERNAME, to_email, message.as_string())
        server.quit()
    except Exception as e:
        print(f"Failed to send email: {e}")