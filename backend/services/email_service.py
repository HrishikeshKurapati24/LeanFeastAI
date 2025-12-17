"""
Email service for sending notifications
Supports SMTP and can be extended to use SendGrid, AWS SES, etc.
"""
import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional
from supabase import create_client, Client


class EmailService:
    """Service for sending email notifications"""
    
    def __init__(self):
        self._supabase: Optional[Client] = None
        self.smtp_host = os.getenv("SMTP_HOST", "smtp.gmail.com")
        self.smtp_port = int(os.getenv("SMTP_PORT", "587"))
        self.smtp_user = os.getenv("SMTP_USER")
        self.smtp_password = os.getenv("SMTP_PASSWORD")
        self.smtp_from_email = os.getenv("SMTP_FROM_EMAIL", self.smtp_user)
        self.smtp_from_name = os.getenv("SMTP_FROM_NAME", "LeanFeast AI")
        self.use_smtp = bool(self.smtp_user and self.smtp_password)
    
    @property
    def supabase(self) -> Client:
        """Lazy initialization of Supabase client"""
        if self._supabase is None:
            supabase_url = os.getenv("SUPABASE_URL")
            supabase_service_key = os.getenv("SUPABASE_SERVICE_KEY")
            
            if not supabase_url or not supabase_service_key:
                raise ValueError("Supabase configuration missing for email service")
            
            self._supabase = create_client(supabase_url, supabase_service_key)
        
        return self._supabase
    
    def _send_email(self, to_email: str, subject: str, html_body: str, text_body: str = None) -> bool:
        """
        Send email using SMTP
        
        Args:
            to_email: Recipient email address
            subject: Email subject
            html_body: HTML email body
            text_body: Plain text email body (optional)
            
        Returns:
            True if email sent successfully, False otherwise
        """
        if not self.use_smtp:
            print(f"[Email Service] SMTP not configured. Would send email to REDACTED")
            print(f"Subject: {subject}")
            print(f"Body: [REDACTED]")
            return True  # Return True in development mode
        
        try:
            # Create message
            msg = MIMEMultipart('alternative')
            msg['Subject'] = subject
            msg['From'] = f"{self.smtp_from_name} <{self.smtp_from_email}>"
            msg['To'] = to_email
            
            # Add both plain text and HTML versions
            if text_body:
                part1 = MIMEText(text_body, 'plain')
                msg.attach(part1)
            
            part2 = MIMEText(html_body, 'html')
            msg.attach(part2)
            
            # Send email
            with smtplib.SMTP(self.smtp_host, self.smtp_port) as server:
                server.starttls()
                server.login(self.smtp_user, self.smtp_password)
                server.send_message(msg)
            
            print(f"[Email Service] Email sent successfully to REDACTED")
            return True
            
        except smtplib.SMTPAuthenticationError as e:
            print(f"[Email Service] SMTP Authentication Error: {str(e)}")
            print(f"[Email Service] For Gmail, you need to:")
            print(f"  1. Enable 2-Step Verification")
            print(f"  2. Generate an App Password (not your regular password)")
            print(f"  3. Use the App Password in SMTP_PASSWORD environment variable")
            print(f"[Email Service] Email not sent to REDACTED")
            return False
        except Exception as e:
            print(f"[Email Service] Error sending email to REDACTED: {str(e)}")
            import traceback
            print(f"[Email Service] Traceback: {traceback.format_exc()}")
            return False
    
    def send_suspension_notification(self, user_email: str, reason: str) -> bool:
        """
        Send email notification to user about account suspension
        
        Args:
            user_email: Email address of the user
            reason: Reason for suspension
            
        Returns:
            True if email sent successfully, False otherwise
        """
        subject = "Account Suspension Notice - LeanFeast AI"
        
        text_body = f"""
Dear User,

Your LeanFeast AI account has been suspended.

Reason: {reason}

Your account access has been temporarily restricted. If you believe this is an error, please contact our support team for assistance.

Thank you for your understanding.

Best regards,
LeanFeast AI Team
"""
        
        html_body = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body {{
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
        }}
        .header {{
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            color: white;
            padding: 30px;
            text-align: center;
            border-radius: 10px 10px 0 0;
        }}
        .content {{
            background: #f9fafb;
            padding: 30px;
            border-radius: 0 0 10px 10px;
        }}
        .reason-box {{
            background: #fef3c7;
            border-left: 4px solid #f59e0b;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
        }}
        .footer {{
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            color: #6b7280;
            font-size: 14px;
        }}
    </style>
</head>
<body>
    <div class="header">
        <h1>Account Suspension Notice</h1>
    </div>
    <div class="content">
        <p>Dear User,</p>
        <p>Your LeanFeast AI account has been suspended.</p>
        
        <div class="reason-box">
            <strong>Reason for Suspension:</strong>
            <p>{reason}</p>
        </div>
        
        <p>Your account access has been temporarily restricted. If you believe this is an error, please contact our support team for assistance.</p>
        
        <p>Thank you for your understanding.</p>
        
        <div class="footer">
            <p>Best regards,<br>LeanFeast AI Team</p>
        </div>
    </div>
</body>
</html>
"""
        
        return self._send_email(user_email, subject, html_body, text_body)
    
    def send_deletion_notification(self, user_email: str, reason: str) -> bool:
        """
        Send email notification to user about account deletion
        
        Args:
            user_email: Email address of the user
            reason: Reason for deletion
            
        Returns:
            True if email sent successfully, False otherwise
        """
        subject = "Account Deletion Notice - LeanFeast AI"
        
        text_body = f"""
Dear User,

Your LeanFeast AI account has been deleted.

Reason: {reason}

Your account and all associated data have been removed from our system. If you believe this is an error, please contact our support team immediately.

Thank you for being part of LeanFeast AI.

Best regards,
LeanFeast AI Team
"""
        
        html_body = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body {{
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
        }}
        .header {{
            background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
            color: white;
            padding: 30px;
            text-align: center;
            border-radius: 10px 10px 0 0;
        }}
        .content {{
            background: #f9fafb;
            padding: 30px;
            border-radius: 0 0 10px 10px;
        }}
        .reason-box {{
            background: #fee2e2;
            border-left: 4px solid #ef4444;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
        }}
        .footer {{
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            color: #6b7280;
            font-size: 14px;
        }}
    </style>
</head>
<body>
    <div class="header">
        <h1>Account Deletion Notice</h1>
    </div>
    <div class="content">
        <p>Dear User,</p>
        <p>Your LeanFeast AI account has been deleted.</p>
        
        <div class="reason-box">
            <strong>Reason for Deletion:</strong>
            <p>{reason}</p>
        </div>
        
        <p>Your account and all associated data have been removed from our system. If you believe this is an error, please contact our support team immediately.</p>
        
        <p>Thank you for being part of LeanFeast AI.</p>
        
        <div class="footer">
            <p>Best regards,<br>LeanFeast AI Team</p>
        </div>
    </div>
</body>
</html>
"""
        
        return self._send_email(user_email, subject, html_body, text_body)
    
    def send_reactivation_notification(self, user_email: str) -> bool:
        """
        Send email notification to user about account reactivation
        
        Args:
            user_email: Email address of the user
            
        Returns:
            True if email sent successfully, False otherwise
        """
        subject = "Account Reactivated - LeanFeast AI"
        
        text_body = f"""
Dear User,

Your LeanFeast AI account has been reactivated.

You can now access your account and all its features. We're glad to have you back!

If you have any questions or concerns, please don't hesitate to contact our support team.

Best regards,
LeanFeast AI Team
"""
        
        html_body = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body {{
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
        }}
        .header {{
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            color: white;
            padding: 30px;
            text-align: center;
            border-radius: 10px 10px 0 0;
        }}
        .content {{
            background: #f9fafb;
            padding: 30px;
            border-radius: 0 0 10px 10px;
        }}
        .success-box {{
            background: #d1fae5;
            border-left: 4px solid #10b981;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
        }}
        .footer {{
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            color: #6b7280;
            font-size: 14px;
        }}
    </style>
</head>
<body>
    <div class="header">
        <h1>Account Reactivated</h1>
    </div>
    <div class="content">
        <p>Dear User,</p>
        
        <div class="success-box">
            <strong>Good News!</strong>
            <p>Your LeanFeast AI account has been reactivated.</p>
        </div>
        
        <p>You can now access your account and all its features. We're glad to have you back!</p>
        
        <p>If you have any questions or concerns, please don't hesitate to contact our support team.</p>
        
        <div class="footer">
            <p>Best regards,<br>LeanFeast AI Team</p>
        </div>
    </div>
</body>
</html>
"""
        
        return self._send_email(user_email, subject, html_body, text_body)
    
    def send_recipe_removal_notification(self, user_email: str, recipe_title: str, reason: str) -> bool:
        """
        Send email notification to user about recipe removal from community
        
        Args:
            user_email: Email address of the user
            recipe_title: Title of the removed recipe
            reason: Reason for removal
            
        Returns:
            True if email sent successfully, False otherwise
        """
        subject = f"Recipe Removed from Community - {recipe_title}"
        
        text_body = f"""
Dear User,

Your recipe "{recipe_title}" has been removed from the Community Hub.

Reason: {reason}

If you have any questions or believe this is an error, please contact our support team.

Best regards,
LeanFeast AI Team
"""
        
        html_body = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body {{
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
        }}
        .header {{
            background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
            color: white;
            padding: 30px;
            text-align: center;
            border-radius: 10px 10px 0 0;
        }}
        .content {{
            background: #f9fafb;
            padding: 30px;
            border-radius: 0 0 10px 10px;
        }}
        .recipe-box {{
            background: #fff7ed;
            border-left: 4px solid #f59e0b;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
        }}
        .reason-box {{
            background: #fee2e2;
            border-left: 4px solid #ef4444;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
        }}
        .footer {{
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            color: #6b7280;
            font-size: 14px;
        }}
    </style>
</head>
<body>
    <div class="header">
        <h1>Recipe Removed from Community</h1>
    </div>
    <div class="content">
        <p>Dear User,</p>
        
        <div class="recipe-box">
            <strong>Recipe:</strong> {recipe_title}
        </div>
        
        <p>Your recipe has been removed from the Community Hub.</p>
        
        <div class="reason-box">
            <strong>Reason:</strong>
            <p>{reason}</p>
        </div>
        
        <p>If you have any questions or believe this is an error, please contact our support team.</p>
        
        <div class="footer">
            <p>Best regards,<br>LeanFeast AI Team</p>
        </div>
    </div>
</body>
</html>
"""
        
        return self._send_email(user_email, subject, html_body, text_body)


# Global instance
_email_service_instance: Optional[EmailService] = None

def get_email_service() -> EmailService:
    """Get or create the global email service instance"""
    global _email_service_instance
    if _email_service_instance is None:
        _email_service_instance = EmailService()
    return _email_service_instance

email_service = get_email_service()

