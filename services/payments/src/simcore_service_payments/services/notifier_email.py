import logging
import mimetypes
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from email.headerregistry import Address
from email.message import EmailMessage
from pathlib import Path
from typing import Final, cast

from aiosmtplib import SMTP
from attr import dataclass
from jinja2 import DictLoader, Environment, select_autoescape
from models_library.api_schemas_webserver.wallets import (
    PaymentMethodTransaction,
    PaymentTransaction,
)
from models_library.products import ProductName
from models_library.users import UserID
from settings_library.email import EmailProtocol, SMTPSettings

from ..db.payment_users_repo import PaymentsUsersRepo
from .notifier_abc import NotificationProvider

_logger = logging.getLogger(__name__)


_BASE_HTML: Final[
    str
] = """
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{% block title %}{% endblock %}</title>
<style>
    body {
        font-family: Arial, sans-serif;
        margin: 0;
        padding: 20px;
        color: #333;
    }
    .container {
        background-color: #f9f9f9;
        padding: 20px;
        border-radius: 5px;
        box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
    }
    a {
        color: #007bff;
        text-decoration: none;
    }
</style>
</head>
<body>
    {% block content %}
    {% endblock %}
</body>
</html>
"""


_NOTIFY_PAYMENTS_HTML = """
{% extends 'base.html' %}

{% block title %}Payment Confirmation{% endblock %}

{% block content %}
<div class="container">
    <p>Dear {{ user.first_name }},</p>
    <p>We are delighted to confirm the successful processing of your payment of <strong>{{ payment.price_dollars }}</strong> <em>USD</em> for the purchase of <strong>{{ payment.osparc_credits }}</strong> <em>credits</em>. The credits have been added to your {{ product.display_name }} account, and you are all set to utilize them.</p>
    <p>For more details you can view or download your <a href="{{ payment.invoice_url }}">receipt</a></p>
    <p>Should you have any questions or require further assistance, please do not hesitate to reach out to our <a href="mailto:{{ product.support_email }}">customer support team</a>.</p>
    <p>Best Regards,</p>
    <p>{{ product.display_name }} support team<br>{{ product.vendor_display_inline }}</p>
</div>
{% endblock %}
"""

_NOTIFY_PAYMENTS_TXT = """
    Dear {{ user.first_name }},

    We are delighted to confirm the successful processing of your payment of **{{ payment.price_dollars }}** *USD* for the purchase of **{{ payment.osparc_credits }}** *credits*. The credits have been added to your {{ product.display_name }} account, and you are all set to utilize them.

    To view or download your detailed receipt, please click the following link {{ payment.invoice_url }}

    Should you have any questions or require further assistance, please do not hesitate to reach out to our {{ product.support_email }}" customer support team.
    Best Regards,

    {{ product.display_name }} support team
    {{ product.vendor_display_inline }}
"""


_NOTIFY_PAYMENTS_SUBJECT = "Your Payment {{ payment.price_dollars }} USD for {{ payment.osparc_credits }} Credits Was Successful"


_PRODUCT_NOTIFICATIONS_TEMPLATES = {
    "base.html": _BASE_HTML,
    "notify_payments.html": _NOTIFY_PAYMENTS_HTML,
    "notify_payments.txt": _NOTIFY_PAYMENTS_TXT,
    "notify_payments-subject.txt": _NOTIFY_PAYMENTS_SUBJECT,
}


@dataclass
class _UserData:
    first_name: str
    last_name: str
    email: str


@dataclass
class _ProductData:
    product_name: ProductName
    display_name: str
    vendor_display_inline: str
    support_email: str


@dataclass
class _PaymentData:
    price_dollars: str
    osparc_credits: str
    invoice_url: str


async def _create_user_email(
    env: Environment,
    user: _UserData,
    payment: _PaymentData,
    product: _ProductData,
) -> EmailMessage:
    # data to interpolate template
    data = {
        "user": user,
        "product": product,
        "payment": payment,
    }

    msg = EmailMessage()

    msg["From"] = Address(
        display_name=f"{product.display_name} support",
        addr_spec=product.support_email,
    )
    msg["To"] = Address(
        display_name=f"{user.first_name} {user.last_name}",
        addr_spec=user.email,
    )
    msg["Subject"] = env.get_template("notify_payments-subject.txt").render(data)

    # Body
    text_template = env.get_template("notify_payments.txt")
    msg.set_content(text_template.render(data))

    html_template = env.get_template("notify_payments.html")
    msg.add_alternative(html_template.render(data), subtype="html")
    return msg


def _guess_file_type(file_path: Path) -> tuple[str, str]:
    assert file_path.is_file()
    mimetype, _encoding = mimetypes.guess_type(file_path)
    if mimetype:
        maintype, subtype = mimetype.split("/", maxsplit=1)
    else:
        maintype, subtype = "application", "octet-stream"
    return maintype, subtype


def _add_attachments(msg: EmailMessage, file_paths: list[Path]):
    for attachment_path in file_paths:
        maintype, subtype = _guess_file_type(attachment_path)
        msg.add_attachment(
            attachment_path.read_bytes(),
            filename=attachment_path.name,
            maintype=maintype,
            subtype=subtype,
        )


@asynccontextmanager
async def _create_email_session(
    settings: SMTPSettings,
) -> AsyncIterator[SMTP]:
    async with SMTP(
        hostname=settings.SMTP_HOST,
        port=settings.SMTP_PORT,
        # FROM https://aiosmtplib.readthedocs.io/en/stable/usage.html#starttls-connections
        # By default, if the server advertises STARTTLS support, aiosmtplib will upgrade the connection automatically.
        # Setting use_tls=True for STARTTLS servers will typically result in a connection error
        # To opt out of STARTTLS on connect, pass start_tls=False.
        # NOTE: for that reason TLS and STARTLS are mutally exclusive
        use_tls=settings.SMTP_PROTOCOL == EmailProtocol.TLS,
        start_tls=settings.SMTP_PROTOCOL == EmailProtocol.STARTTLS,
    ) as smtp:
        if settings.has_credentials:
            assert settings.SMTP_USERNAME  # nosec
            assert settings.SMTP_PASSWORD  # nosec
            await smtp.login(
                settings.SMTP_USERNAME,
                settings.SMTP_PASSWORD.get_secret_value(),
            )

        yield cast(SMTP, smtp)


class EmailProvider(NotificationProvider):
    def __init__(self, settings: SMTPSettings, users_repo: PaymentsUsersRepo):
        self._users_repo = users_repo
        self._settings = settings

        self._jinja_env = Environment(
            loader=DictLoader(_PRODUCT_NOTIFICATIONS_TEMPLATES),
            autoescape=select_autoescape(["html", "xml"]),
        )

    async def _create_successful_payments_message(
        self, user_id: UserID, payment: PaymentTransaction
    ) -> EmailMessage:
        data = await self._users_repo.get_notification_data(user_id, payment.payment_id)

        # email for successful payment
        msg: EmailMessage = await _create_user_email(
            self._jinja_env,
            user=_UserData(
                first_name=data.first_name,
                last_name=data.last_name,
                email=data.email,
            ),
            payment=_PaymentData(
                price_dollars=f"{payment.price_dollars:.2f}",
                osparc_credits=f"{payment.osparc_credits:.2f}",
                invoice_url=payment.invoice_url,
            ),
            product=_ProductData(
                product_name=data.product_name,
                display_name=data.display_name,
                vendor_display_inline=f"{data.vendor.get('name', '')}. {data.vendor.get('address', '')}",
                support_email=data.support_email,
            ),
        )

        return msg

    async def notify_payment_completed(
        self,
        user_id: UserID,
        payment: PaymentTransaction,
    ):
        # NOTE: we only have an email for successful payments
        if payment.state == "SUCCESS":
            msg = await self._create_successful_payments_message(user_id, payment)
            async with _create_email_session(self._settings) as smtp:
                await smtp.send_message(msg)
        else:
            _logger.debug(
                "No email sent when %s did a non-SUCCESS %s",
                f"{user_id=}",
                f"{payment=}",
            )

    async def notify_payment_method_acked(
        self,
        user_id: UserID,
        payment_method: PaymentMethodTransaction,
    ):
        assert user_id  # nosec
        assert payment_method  # nosec
        _logger.debug("No email sent when payment method is acked")
